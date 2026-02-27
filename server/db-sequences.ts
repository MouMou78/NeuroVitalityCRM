import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const _pgClient = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });
const db = drizzle(_pgClient);
import { sequenceNodes, sequenceEdges, emailSequences } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

interface CreateSequenceWithNodesInput {
  tenantId: string;
  name: string;
  description?: string;
  nodes: Array<{
    id: string;
    nodeType: string;
    position: { x: number; y: number };
    label?: string;
    subject?: string;
    body?: string;
    waitDays?: number;
    conditionType?: string;
    variantAPercentage?: number;
    goalType?: string;
  }>;
  edges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    edgeType?: string;
    label?: string;
  }>;
}

export async function createSequenceWithNodes(input: CreateSequenceWithNodesInput) {
  const sequenceId = randomUUID();

  // Create the sequence
  await db.insert(emailSequences).values({
    id: sequenceId,
    tenantId: input.tenantId,
    name: input.name,
    description: input.description || "",
    status: "active",
  });

  // Create nodes
  for (const node of input.nodes) {
    await db.insert(sequenceNodes).values({
      id: node.id,
      sequenceId,
      nodeType: node.nodeType as any,
      position: node.position,
      label: node.label,
      subject: node.subject,
      body: node.body,
      waitDays: node.waitDays,
      conditionType: node.conditionType as any,
      variantAPercentage: node.variantAPercentage,
      goalType: node.goalType as any,
    });
  }

  // Create edges
  for (const edge of input.edges) {
    await db.insert(sequenceEdges).values({
      id: edge.id,
      sequenceId,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      edgeType: (edge.edgeType as any) || "default",
      label: edge.label,
    });
  }

  return sequenceId;
}

interface UpdateSequenceWithNodesInput extends CreateSequenceWithNodesInput {
  sequenceId: string;
}

export async function updateSequenceWithNodes(input: UpdateSequenceWithNodesInput) {
  // Update sequence metadata
  await db
    .update(emailSequences)
    .set({
      name: input.name,
      description: input.description || "",
    })
    .where(
      and(
        eq(emailSequences.id, input.sequenceId),
        eq(emailSequences.tenantId, input.tenantId)
      )
    );

  // Delete existing nodes and edges
  await db.delete(sequenceNodes).where(eq(sequenceNodes.sequenceId, input.sequenceId));
  await db.delete(sequenceEdges).where(eq(sequenceEdges.sequenceId, input.sequenceId));

  // Create new nodes
  for (const node of input.nodes) {
    await db.insert(sequenceNodes).values({
      id: node.id,
      sequenceId: input.sequenceId,
      nodeType: node.nodeType as any,
      position: node.position,
      label: node.label,
      subject: node.subject,
      body: node.body,
      waitDays: node.waitDays,
      conditionType: node.conditionType as any,
      variantAPercentage: node.variantAPercentage,
      goalType: node.goalType as any,
    });
  }

  // Create new edges
  for (const edge of input.edges) {
    await db.insert(sequenceEdges).values({
      id: edge.id,
      sequenceId: input.sequenceId,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      edgeType: (edge.edgeType as any) || "default",
      label: edge.label,
    });
  }
}

export async function getSequenceWithNodes(sequenceId: string, tenantId: string) {
  // Get sequence
  const [sequence] = await db
    .select()
    .from(emailSequences)
    .where(
      and(
        eq(emailSequences.id, sequenceId),
        eq(emailSequences.tenantId, tenantId)
      )
    );

  if (!sequence) {
    return null;
  }

  // Get nodes
  const nodes = await db
    .select()
    .from(sequenceNodes)
    .where(eq(sequenceNodes.sequenceId, sequenceId));

  // Get edges
  const edges = await db
    .select()
    .from(sequenceEdges)
    .where(eq(sequenceEdges.sequenceId, sequenceId));

  return {
    ...sequence,
    nodes: nodes.map((node: any) => ({
      id: node.id,
      type: node.nodeType,
      position: node.position as { x: number; y: number },
      data: {
        label: node.label,
        subject: node.subject,
        body: node.body,
        waitDays: node.waitDays,
        conditionType: node.conditionType,
        variantAPercentage: node.variantAPercentage,
        goalType: node.goalType,
      },
    })),
    edges: edges.map((edge: any) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: "smoothstep",
      animated: true,
      data: {
        edgeType: edge.edgeType,
      },
      label: edge.label,
    })),
  };
}
