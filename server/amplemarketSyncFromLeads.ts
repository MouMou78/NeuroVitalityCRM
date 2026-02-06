// db is passed as parameter
import { accounts, people, integrations, amplemarketSyncLogs, leads } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

/**
 * Sync Amplemarket leads directly from /lead-lists without /contacts hydration.
 * 
 * CRITICAL: Amplemarket does NOT expose a contact API for all leads.
 * /contacts endpoint requires specific contact IDs that are not available in /lead-lists payloads.
 * Therefore, we sync contacts directly from lead data as the canonical source.
 */
export async function syncAmplemarketFromLeads(
  db: any,
  tenantId: string,
  integrationId: string,
  apiKey: string,
  amplemarketUserEmail: string,
  selectedListIds: string[] = [],
  syncScope: string = 'all_user_contacts'
) {
  const correlationId = nanoid(10);
  console.log(`[Amplemarket Sync] Correlation ID: ${correlationId}`);
  console.log(`[Amplemarket Sync] Mode: ${syncScope}`);
  console.log(`[Amplemarket Sync] Selected owner: ${amplemarketUserEmail}`);
  console.log("[Amplemarket Sync] NOTE: Syncing directly from lead payloads (Amplemarket does not expose contact API for all leads)");
  
  // Validation
  if (syncScope === 'lists' && selectedListIds.length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: "No lists selected for sync. Please select at least one list or switch to 'All leads for selected user' mode."
    });
  }
  
  // Helper functions
  const extractOwnerEmail = (record: any): string | null => {
    if (!record.owner) return null;
    if (typeof record.owner === 'string') return record.owner;
    if (typeof record.owner === 'object' && record.owner.email) return record.owner.email;
    return null;
  };
  
  const normalizeEmail = (email: string | null): string | null => {
    if (!email) return null;
    return email.toLowerCase().trim();
  };
  
  const normalizedSelectedEmail = normalizeEmail(amplemarketUserEmail);
  
  // Counters
  let listsScanned = 0;
  let leadsProcessedTotal = 0;
  let leadsWithOwnerField = 0;
  let leadsMatchingOwner = 0;
  let leadsWrongOwner = 0;
  let leadsSkipped = 0;
  let leadsCreated = 0;
  let leadsUpdated = 0;
  
  // Sample lead for diagnostics
  let sampleLead: any = null;
  let ownerFieldPath: string | null = null;
  
  const { createAmplemarketClient } = await import('./amplemarketClient');
  const client = createAmplemarketClient(apiKey);
  
  // Get lists to process
  let listsToProcess: any[] = [];
  
  if (syncScope === 'all_user_contacts') {
    console.log("[Amplemarket Sync] Fetching all lead lists...");
    const listsResponse = await client.getLists();
    listsToProcess = listsResponse.lead_lists || [];
    console.log(`[Amplemarket Sync] Found ${listsToProcess.length} lead lists`);
  } else if (syncScope === 'lists') {
    console.log(`[Amplemarket Sync] Using ${selectedListIds.length} selected lists`);
    // Fetch each selected list
    for (const listId of selectedListIds) {
      try {
        const listsResponse = await client.getLists();
        const allLists = listsResponse.lead_lists || [];
        const selectedList = allLists.find((l: any) => l.id === listId);
        if (selectedList) {
          listsToProcess.push(selectedList);
        }
      } catch (error: any) {
        console.error(`[Amplemarket Sync] Error fetching list ${listId}:`, error.message);
      }
    }
  }
  
  // Process each list
  for (const list of listsToProcess) {
    listsScanned++;
    console.log(`[Amplemarket Sync] Processing list: ${list.name} (${list.id})`);
    
    try {
      const listDetailResponse = await client.getListById(list.id);
      const leads = listDetailResponse.leads || [];
      console.log(`[Amplemarket Sync] Fetched ${leads.length} leads from list`);
      
      // Process each lead directly
      for (const lead of leads) {
        leadsProcessedTotal++;
        
        try {
          // Skip if no email
          if (!lead.email) {
            leadsSkipped++;
            continue;
          }
          
          // Extract and normalize owner
          const leadOwnerEmail = extractOwnerEmail(lead);
          const normalizedLeadOwner = normalizeEmail(leadOwnerEmail);
          
          if (!leadOwnerEmail) {
            leadsSkipped++;
            continue;
          }
          
          leadsWithOwnerField++;
          
          // Capture sample lead for diagnostics (first one with owner field)
          if (!sampleLead && leadOwnerEmail) {
            sampleLead = {
              id: lead.id,
              email: lead.email,
              first_name: lead.first_name,
              last_name: lead.last_name,
              company_name: lead.company_name,
              owner: lead.owner,
            };
            // Determine owner field path
            if (typeof lead.owner === 'string') {
              ownerFieldPath = 'owner';
            } else if (typeof lead.owner === 'object' && lead.owner?.email) {
              ownerFieldPath = 'owner.email';
            } else {
              ownerFieldPath = 'unknown';
            }
          }
          
          // Filter by owner
          if (normalizedLeadOwner !== normalizedSelectedEmail) {
            leadsWrongOwner++;
            continue;
          }
          
          leadsMatchingOwner++;
          
          // Check if lead already exists by amplemarket_lead_id
          const [existingLead] = await db
            .select()
            .from(leads)
            .where(and(
              eq(leads.tenantId, tenantId),
              eq(leads.amplemarketLeadId, lead.id)
            ))
            .limit(1);
          
          const leadData = {
            source: 'amplemarket' as const,
            sourceType: 'lead' as const,
            amplemarketLeadId: lead.id,
            ownerEmail: leadOwnerEmail,
            email: lead.email,
            firstName: lead.first_name || null,
            lastName: lead.last_name || null,
            company: lead.company_name || null,
            title: lead.title || null,
            linkedinUrl: lead.linkedin_url || null,
            listIds: [list.id], // Track which list this lead came from
            syncedAt: new Date(),
          };
          
          if (existingLead) {
            // Update existing lead
            await db
              .update(leads)
              .set({
                ...leadData,
                updatedAt: new Date(),
              })
              .where(eq(leads.id, existingLead.id));
            leadsUpdated++;
          } else {
            // Create new lead
            await db
              .insert(leads)
              .values({
                id: nanoid(),
                tenantId,
                ...leadData,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            leadsCreated++;
          }
        } catch (error: any) {
          console.error(`[Amplemarket Sync] Error processing lead ${lead.id}:`, error.message);
          leadsSkipped++;
        }
      }
    } catch (error: any) {
      console.error(`[Amplemarket Sync] Error fetching list ${list.id}:`, error.message);
    }
  }
  
  // Summary
  console.log("[Amplemarket Sync] ===== SYNC COMPLETE =====");
  console.log(`Lists scanned: ${listsScanned}`);
  console.log(`Leads processed: ${leadsProcessedTotal}`);
  console.log(`Leads with owner field: ${leadsWithOwnerField}`);
  console.log(`Leads matching owner: ${leadsMatchingOwner}`);
  console.log(`Leads wrong owner: ${leadsWrongOwner}`);
  console.log(`Leads skipped: ${leadsSkipped}`);
  console.log(`Leads created: ${leadsCreated}`);
  console.log(`Leads updated: ${leadsUpdated}`);
  console.log("[Amplemarket Sync] ===== END SYNC =====");
  
  // Guardrail: Fail if zero leads synced
  if (leadsMatchingOwner > 0 && leadsCreated === 0 && leadsUpdated === 0) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Sync failed: ${leadsMatchingOwner} leads matched owner but 0 leads created/updated. This indicates a database or mapping issue.`
    });
  }
  
  return {
    correlationId,
    mode: syncScope,
    selected_owner: amplemarketUserEmail,
    lists_scanned: listsScanned,
    leads_processed_total: leadsProcessedTotal,
    leads_with_owner_field: leadsWithOwnerField,
    leads_matching_owner: leadsMatchingOwner,
    leads_wrong_owner: leadsWrongOwner,
    leads_skipped: leadsSkipped,
    leads_created: leadsCreated,
    leads_updated: leadsUpdated,
    sample: sampleLead ? {
      lead: sampleLead,
      owner_field_path: ownerFieldPath,
    } : null,
  };
}
