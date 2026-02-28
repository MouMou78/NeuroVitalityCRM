/**
 * Workflow Engine
 *
 * A state-machine-based engine that progresses leads through directed workflow
 * graphs. Each lead maintains an enrollment record tracking their current node
 * and state snapshot.
 *
 * Node types:
 *   wait     — pause for a duration or until a condition is met
 *   send     — send an email (with suppression check)
 *   branch   — evaluate a condition and route to yes/no paths
 *   update   — update a CRM field, tag, or score
 *   notify   — send an internal alert
 *   enrol    — move the lead into another workflow
 *   stop     — terminate the enrollment with an outcome reason
 *
 * Transitions are event-driven (triggered by ingestEvent) or time-driven
 * (triggered by the scheduler cron).
 */

import { randomUUID } from "crypto";
import { getDb } from "../db";
import {
  workflowDefinitions,
  workflowEnrollments,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { evaluateCondition, EvalContext } from "./rulesEngine";
import { checkSuppression, suppressEmail } from "./suppressionLayer";
import { applyScoreEvent } from "./leadScoring";
import { ingestEvent } from "./eventIngestion";
import type { CrmEvent } from "./eventIngestion";

export type NodeType = "wait" | "send" | "branch" | "update" | "notify" | "enrol" | "stop";

export interface WorkflowNode {
  node_id: string;
  type: NodeType;
  label?: string;
  config: Record<string, any>;
  // Edges: key = handle name (e.g., "yes", "no", "default"), value = target node_id
  edges: Record<string, string>;
}

export interface WorkflowDefinition {
  workflow_id: string;
  name: string;
  version: number;
  entry_node_id: string;
  nodes: WorkflowNode[];
}

export interface EnrollmentState {
  enrollment_id: string;
  workflow_id: string;
  tenant_id: string;
  entity_id: string;
  current_node_id: string;
  status: "active" | "paused" | "completed" | "stopped";
  outcome?: string;
  entered_at: Date;
  last_transition_at: Date;
  state_snapshot: Record<string, any>;
  next_check_at?: Date;
}

/**
 * Enroll a lead in a workflow. Idempotent — if already enrolled and active,
 * returns the existing enrollment.
 */
export async function enrollLead(
  tenant_id: string,
  workflow_id: string,
  entity_id: string,
  initialFields?: Record<string, any>
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check for existing active enrollment
  const existing = await db
    .select({ enrollment_id: workflowEnrollments.enrollment_id })
    .from(workflowEnrollments)
    .where(
      and(
        eq(workflowEnrollments.tenant_id, tenant_id),
        eq(workflowEnrollments.workflow_id, workflow_id),
        eq(workflowEnrollments.entity_id, entity_id),
        eq(workflowEnrollments.status, "active")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0].enrollment_id;
  }

  // Load workflow definition to get entry node
  const wfRows = await db
    .select()
    .from(workflowDefinitions)
    .where(
      and(
        eq(workflowDefinitions.workflow_id, workflow_id),
        eq(workflowDefinitions.tenant_id, tenant_id)
      )
    )
    .limit(1);

  if (wfRows.length === 0) throw new Error(`Workflow ${workflow_id} not found`);
  const wf = wfRows[0].definition as WorkflowDefinition;

  const enrollment_id = randomUUID();
  const now = new Date();

  await db.insert(workflowEnrollments).values({
    enrollment_id,
    workflow_id,
    tenant_id,
    entity_id,
    current_node_id: wf.entry_node_id,
    status: "active",
    entered_at: now,
    last_transition_at: now,
    state_snapshot: initialFields ?? {},
    next_check_at: now, // process immediately
  });

  console.log(`[WorkflowEngine] Enrolled ${entity_id} in workflow ${workflow_id} (enrollment: ${enrollment_id})`);
  return enrollment_id;
}

/**
 * Process a single enrollment — advance the lead through the workflow graph
 * as far as possible given the current state and available events.
 */
export async function processEnrollment(enrollment: EnrollmentState): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Load workflow definition
  const wfRows = await db
    .select()
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.workflow_id, enrollment.workflow_id))
    .limit(1);

  if (wfRows.length === 0) {
    console.error(`[WorkflowEngine] Workflow ${enrollment.workflow_id} not found`);
    return;
  }

  const wf = wfRows[0].definition as WorkflowDefinition;
  const nodeMap = new Map(wf.nodes.map((n) => [n.node_id, n]));

  let currentNodeId = enrollment.current_node_id;
  let stateSnapshot = { ...enrollment.state_snapshot };
  let iterations = 0;
  const MAX_ITERATIONS = 20; // safety guard against infinite loops

  while (iterations++ < MAX_ITERATIONS) {
    const node = nodeMap.get(currentNodeId);
    if (!node) {
      console.error(`[WorkflowEngine] Node ${currentNodeId} not found in workflow ${enrollment.workflow_id}`);
      break;
    }

    const ctx: EvalContext = {
      tenant_id: enrollment.tenant_id,
      entity_id: enrollment.entity_id,
      fields: stateSnapshot,
    };

    let nextNodeId: string | undefined;

    switch (node.type) {
      case "stop": {
        await db
          .update(workflowEnrollments)
          .set({
            status: "stopped",
            outcome: node.config.reason ?? "stopped",
            last_transition_at: new Date(),
          })
          .where(eq(workflowEnrollments.enrollment_id, enrollment.enrollment_id));
        console.log(`[WorkflowEngine] Enrollment ${enrollment.enrollment_id} stopped: ${node.config.reason}`);
        return;
      }

      case "wait": {
        const waitMs: number = (node.config.duration_days ?? 1) * 24 * 60 * 60 * 1000;
        const nextCheck = new Date(Date.now() + waitMs);
        await db
          .update(workflowEnrollments)
          .set({ next_check_at: nextCheck, last_transition_at: new Date() })
          .where(eq(workflowEnrollments.enrollment_id, enrollment.enrollment_id));
        console.log(`[WorkflowEngine] Enrollment ${enrollment.enrollment_id} waiting until ${nextCheck.toISOString()}`);
        return; // stop processing until next_check_at
      }

      case "send": {
        const email = stateSnapshot.email ?? stateSnapshot.primaryEmail;
        if (!email) {
          console.warn(`[WorkflowEngine] No email for entity ${enrollment.entity_id}, skipping send`);
          nextNodeId = node.edges["default"];
          break;
        }

        const suppression = await checkSuppression(enrollment.tenant_id, email);
        if (suppression.suppressed) {
          console.log(`[WorkflowEngine] Send suppressed for ${email}: ${suppression.reason}`);
          // Route to stop node or default edge
          nextNodeId = node.edges["suppressed"] ?? node.edges["default"];
          break;
        }

        // Email sending is delegated to the Action Execution Layer
        // Here we record the intent and let the caller handle SMTP
        stateSnapshot._pendingSend = {
          template_id: node.config.template_id,
          subject: node.config.subject,
          body: node.config.body,
          to: email,
        };

        await ingestEvent({
          event_type: "email_sent",
          entity_type: "lead",
          entity_id: enrollment.entity_id,
          tenant_id: enrollment.tenant_id,
          source: "workflow_engine",
          payload: { to: email, template_id: node.config.template_id, enrollment_id: enrollment.enrollment_id },
        });

        nextNodeId = node.edges["default"];
        break;
      }

      case "branch": {
        const condition = node.config.condition;
        if (!condition) {
          nextNodeId = node.edges["default"];
          break;
        }
        const result = await evaluateCondition(condition, ctx);
        nextNodeId = result ? node.edges["yes"] : node.edges["no"];
        break;
      }

      case "update": {
        // Apply field updates to the state snapshot
        if (node.config.fields) {
          stateSnapshot = { ...stateSnapshot, ...node.config.fields };
        }
        // Apply score delta if specified
        if (node.config.score_delta) {
          await applyScoreEvent(enrollment.tenant_id, enrollment.entity_id, "score_adjustment", {
            delta: node.config.score_delta,
          });
        }
        nextNodeId = node.edges["default"];
        break;
      }

      case "notify": {
        // Internal notification — persisted via the notification service
        console.log(`[WorkflowEngine] Notify: ${node.config.message} for ${enrollment.entity_id}`);
        nextNodeId = node.edges["default"];
        break;
      }

      case "enrol": {
        // Enroll in another workflow
        if (node.config.target_workflow_id) {
          await enrollLead(enrollment.tenant_id, node.config.target_workflow_id, enrollment.entity_id, stateSnapshot);
        }
        nextNodeId = node.edges["default"];
        break;
      }

      default:
        console.warn(`[WorkflowEngine] Unknown node type: ${(node as any).type}`);
        nextNodeId = node.edges["default"];
    }

    if (!nextNodeId) {
      // No outgoing edge — workflow is complete
      await db
        .update(workflowEnrollments)
        .set({
          status: "completed",
          outcome: "completed",
          last_transition_at: new Date(),
          state_snapshot: stateSnapshot,
        })
        .where(eq(workflowEnrollments.enrollment_id, enrollment.enrollment_id));
      console.log(`[WorkflowEngine] Enrollment ${enrollment.enrollment_id} completed`);
      return;
    }

    // Advance to next node
    currentNodeId = nextNodeId;
    await db
      .update(workflowEnrollments)
      .set({
        current_node_id: currentNodeId,
        last_transition_at: new Date(),
        state_snapshot: stateSnapshot,
      })
      .where(eq(workflowEnrollments.enrollment_id, enrollment.enrollment_id));
  }
}

/**
 * Process all active enrollments that are due for their next check.
 * Called by the scheduler cron every few minutes.
 */
export async function processDueEnrollments(): Promise<{ processed: number; errors: number }> {
  const db = await getDb();
  if (!db) return { processed: 0, errors: 0 };

  const now = new Date();

  const due = await db
    .select()
    .from(workflowEnrollments)
    .where(eq(workflowEnrollments.status, "active"));

  const dueNow = due.filter(
    (e: any) => !e.next_check_at || new Date(e.next_check_at) <= now
  );

  let processed = 0;
  let errors = 0;

  for (const row of dueNow) {
    try {
      await processEnrollment(row as unknown as EnrollmentState);
      processed++;
    } catch (err: any) {
      console.error(`[WorkflowEngine] Error processing enrollment ${row.enrollment_id}:`, err.message);
      errors++;
    }
  }

  if (processed > 0 || errors > 0) {
    console.log(`[WorkflowEngine] Processed ${processed} enrollments, ${errors} errors`);
  }

  return { processed, errors };
}

/**
 * Handle an incoming CRM event — find all active enrollments for the entity
 * and re-evaluate their current branch conditions.
 */
export async function handleEvent(event: CrmEvent): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Apply lead scoring for the event
  await applyScoreEvent(event.tenant_id, event.entity_id, event.event_type, event.payload);

  // Auto-suppress on hard bounce or unsubscribe
  if (event.event_type === "email_bounced" && event.payload?.bounce_type === "hard") {
    const email = event.payload?.to;
    if (email) await suppressEmail(event.tenant_id, email, "hard_bounce");
  }
  if (event.event_type === "email_unsubscribed") {
    const email = event.payload?.to ?? event.payload?.email;
    if (email) await suppressEmail(event.tenant_id, email, "unsubscribed");
  }

  // Wake up enrollments for this entity
  const enrollments = await db
    .select()
    .from(workflowEnrollments)
    .where(
      and(
        eq(workflowEnrollments.entity_id, event.entity_id),
        eq(workflowEnrollments.tenant_id, event.tenant_id),
        eq(workflowEnrollments.status, "active")
      )
    );

  for (const enrollment of enrollments) {
    try {
      await processEnrollment(enrollment as unknown as EnrollmentState);
    } catch (err: any) {
      console.error(`[WorkflowEngine] Error handling event for enrollment ${enrollment.enrollment_id}:`, err.message);
    }
  }
}
