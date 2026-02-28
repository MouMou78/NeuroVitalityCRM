/**
 * CRM Sequencing Engine — Public API
 *
 * This barrel file re-exports the public interfaces of all engine services.
 * Import from here rather than from individual service files.
 */

export { ingestEvent, getEventsInWindow } from "./eventIngestion";
export type { CrmEventPayload, CrmEvent, EventType, EntityType } from "./eventIngestion";

export { evaluateCondition } from "./rulesEngine";
export type { Condition, EvalContext, Operator } from "./rulesEngine";

export {
  getLeadScore,
  applyScoreEvent,
  scoreTier,
} from "./leadScoring";
export type { ScoreTier } from "./leadScoring";

export {
  checkSuppression,
  suppressEmail,
  unsuppressEmail,
} from "./suppressionLayer";
export type { SuppressionReason, SuppressionCheck } from "./suppressionLayer";

export {
  enrollLead,
  processEnrollment,
  processDueEnrollments,
  handleEvent,
} from "./workflowEngine";
export type { WorkflowNode, WorkflowDefinition, EnrollmentState, NodeType } from "./workflowEngine";

export {
  tryEnrolInNurture,
  checkReEntryTriggers,
  archiveInactiveNurtureLeads,
} from "./nurtureEngine";
