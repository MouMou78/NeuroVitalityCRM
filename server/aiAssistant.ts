/**
 * aiAssistant.ts
 *
 * The main AI assistant — now powered by the shared AI brain.
 * All CRM context, persistent memory, and persona logic lives in sharedAIBrain.ts.
 * This module is the "assistant" hat of the unified brain.
 */

import { callBrain, BrainMessage } from "./sharedAIBrain";

export async function queryAIAssistant(params: {
  tenantId: number;
  userId: number;
  messages: BrainMessage[];
}): Promise<string> {
  const result = await callBrain({
    tenantId: String(params.tenantId),
    userId: String(params.userId),
    persona: "assistant",
    messages: params.messages,
    extractMemories: true,
    lightweightMode: false,
  });
  return result.response;
}
