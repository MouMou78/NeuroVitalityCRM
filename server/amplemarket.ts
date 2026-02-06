import axios from "axios";
import qs from "qs";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { accounts, people, integrations, amplemarketSyncLogs } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const AMPLEMARKET_API_BASE = "https://api.amplemarket.com";

/**
 * Create or update account from contact company data
 */
async function syncAccountFromContact(db: any, tenantId: string, contact: any): Promise<string | null> {
  // Skip if no company domain
  if (!contact.company_domain) {
    return null;
  }

  try {
    // Check if account already exists by domain
    const [existingAccount] = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.tenantId, tenantId),
        eq(accounts.domain, contact.company_domain)
      ))
      .limit(1);

    const accountData = {
      name: contact.company_name || contact.company_domain,
      domain: contact.company_domain,
      industry: contact.industry || null,
      employees: contact.company_size ? parseInt(contact.company_size) : null,
      revenue: null,
      technologies: null,
      headquarters: contact.location || null,
      foundingYear: null,
      lastFundingRound: null,
      firstContacted: null,
      linkedinUrl: contact.company_linkedin_url || null,
      enrichmentSource: "amplemarket",
      enrichmentSnapshot: {
        company_name: contact.company_name,
        company_domain: contact.company_domain,
        industry: contact.industry,
        company_size: contact.company_size,
        location: contact.location,
      },
      updatedAt: new Date(),
    };

    if (existingAccount) {
      // Update existing account
      await db
        .update(accounts)
        .set(accountData)
        .where(eq(accounts.id, existingAccount.id));
      return existingAccount.id;
    } else {
      // Create new account
      const accountId = nanoid();
      await db.insert(accounts).values({
        id: accountId,
        tenantId,
        ...accountData,
        createdAt: new Date(),
      });
      return accountId;
    }
  } catch (error: any) {
    console.error("Error syncing account from contact:", error.message);
    return null;
  }
}

/**
 * Sync contacts from Amplemarket lead lists
 */
export async function syncAmplemarketContacts(
  db: any,
  tenantId: string,
  integrationId: string,
  apiKey: string,
  amplemarketUserId: string,
  amplemarketUserEmail: string,
  syncScope: string = 'all_user_contacts',
  selectedListIds: string[] = []
) {
  // Fail-fast validation: user must be selected
  if (!amplemarketUserId || !amplemarketUserEmail) {
    throw new Error("Amplemarket user must be selected before syncing. Please select a user in the configuration.");
  }
  
  console.log("[Amplemarket Sync] Starting sync with user scoping:", {
    correlationId: 'will be generated after counters init',
    tenantId,
    integrationId,
    amplemarketUserId,
    amplemarketUserEmail,
    amplemarketUserEmailNormalized: amplemarketUserEmail.toLowerCase().trim(),
    syncScope,
    selectedListIds: selectedListIds.length,
    selectedListIdsArray: selectedListIds
  });
  
  // Generate correlation ID for tracking
  const correlationId = nanoid();
  
  // Initialize sync counters
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let fetchedTotal = 0;
  let keptMatchingOwner = 0;
  let discardedOtherOwners = 0;
  const syncStartTime = new Date();
  
  console.log(`[Amplemarket Sync] Correlation ID: ${correlationId}`);
  
  // Validation based on sync scope
  if (syncScope === 'lists' && selectedListIds.length === 0) {
    throw new Error("No lists selected for sync. Please select at least one list or switch scope to 'All contacts for selected user'.");
  }
  
  // Helper function to extract and normalize owner email
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
  
  // Counter for all_user_contacts mode
  let missingOwnerField = 0;
  
  // For all_user_contacts mode, use two-step fetch:
  // Step 1: Get all lead lists and collect lead IDs with owner info
  // Step 2: Hydrate full contact details via /contacts?ids=... in batches
  if (syncScope === 'all_user_contacts') {
    console.log("[Amplemarket Sync] ===== COMPARISON LOGIC =====");
    console.log("extractOwnerEmail function:");
    console.log("  if (!record.owner) return null;");
    console.log("  if (typeof record.owner === 'string') return record.owner;");
    console.log("  if (typeof record.owner === 'object' && record.owner.email) return record.owner.email;");
    console.log("  return null;");
    console.log("");
    console.log("normalizeEmail function:");
    console.log("  if (!email) return null;");
    console.log("  return email.toLowerCase().trim();");
    console.log("");
    console.log("Comparison:");
    console.log(`  Selected owner (raw): "${amplemarketUserEmail}"`);
    console.log(`  Selected owner (normalized): "${normalizedSelectedEmail}"`);
    console.log(`  Match condition: normalizedContactOwner === normalizedSelectedEmail`);
    console.log("[Amplemarket Sync] ===== END COMPARISON LOGIC =====");
    console.log("");
    console.log("[Amplemarket Sync] Using all_user_contacts mode - two-step fetch (list IDs, then hydrate)");
    
    const { createAmplemarketClient } = await import('./amplemarketClient');
    const client = createAmplemarketClient(apiKey);
    
    // Step 1: Collect lead IDs from all lists
    console.log("[Amplemarket Sync] Step 1: Fetching all lead lists...");
    const listsResponse = await client.getLists();
    const allLists = listsResponse.lead_lists || [];
    console.log(`[Amplemarket Sync] Found ${allLists.length} lead lists`);
    
    const allLeadIds: string[] = [];
    let idsScannedTotal = 0;
    let listsScanned = 0;
    let listPagesFetched = 0;
    let leadItemsSeen = 0;
    let batchesTotal = 0;
    
    // Fetch leads from each list and collect ALL IDs (no early filtering)
    for (const list of allLists) {
      listsScanned++;
      console.log(`[Amplemarket Sync] Fetching leads from list: ${list.name} (${list.id})`);
      
      try {
        const listDetailResponse = await client.getListById(list.id);
        const leads = listDetailResponse.leads || [];
        
        listPagesFetched++; // Count each list fetch as a page
        leadItemsSeen += leads.length; // Count total lead items seen
        
        console.log(`[Amplemarket Sync] Fetched ${leads.length} leads from list`);
        idsScannedTotal += leads.length;
        
        // Log first 3 leads from first list - SHOW ALL FIELDS TO IDENTIFY CONTACT ID
        if (listsScanned === 1 && leads.length > 0) {
          const sampleSize = Math.min(3, leads.length);
          console.log(`[Amplemarket Sync] ===== RAW LEAD SAMPLES from /lead-lists/${list.id} (first ${sampleSize}) =====`);
          console.log("CRITICAL: We need to identify which field contains the contact ID that /contacts endpoint accepts");
          console.log("Candidate fields: id, contact_id, contact.id, person.id, prospect.id, prospect_id, etc.");
          console.log("");
          
          for (let i = 0; i < sampleSize; i++) {
            const lead = leads[i];
            
            // Show ALL top-level keys first
            console.log(`Lead ${i + 1} - ALL KEYS:`);
            console.log(Object.keys(lead));
            console.log("");
            
            // Show ALL ID-related fields (full structure)
            const idFields = ['id', 'contact_id', 'person_id', 'prospect_id', 'lead_id', 'contact', 'person', 'prospect'];
            const idSample: any = {};
            for (const field of idFields) {
              if (lead[field] !== undefined) {
                idSample[field] = lead[field];
              }
            }
            
            console.log(`Lead ${i + 1} - ID-RELATED FIELDS:`);
            console.log(JSON.stringify(idSample, null, 2));
            console.log("");
          }
          console.log("[Amplemarket Sync] ===== END RAW LEAD SAMPLES =====");
          console.log("");
          
          // Test which ID field /contacts endpoint accepts
          console.log("[Amplemarket Sync] ===== TESTING ID FIELDS WITH /contacts/{id} =====");
          const testLead = leads[0];
          const candidateFields = [
            { name: 'id', value: testLead.id },
            { name: 'contact_id', value: testLead.contact_id },
            { name: 'person_id', value: testLead.person_id },
            { name: 'prospect_id', value: testLead.prospect_id },
            { name: 'contact.id', value: testLead.contact?.id },
            { name: 'person.id', value: testLead.person?.id },
            { name: 'prospect.id', value: testLead.prospect?.id },
          ];
          
          for (const candidate of candidateFields) {
            if (!candidate.value) {
              console.log(`Field "${candidate.name}": NOT PRESENT`);
              continue;
            }
            
            try {
              console.log(`Testing field "${candidate.name}" with value "${candidate.value}"...`);
              const testResponse = await (client as any).client.get(`/contacts/${candidate.value}`);
              const contact = testResponse.data.contact || testResponse.data;
              
              if (contact && contact.email) {
                console.log(`✓ SUCCESS! Field "${candidate.name}" returns valid contact:`);
                console.log(`  Contact ID: ${contact.id}`);
                console.log(`  Email: ${contact.email}`);
                console.log(`  This is the correct field to use for hydration.`);
                break; // Found the correct field
              } else {
                console.log(`✗ Field "${candidate.name}" returned data but no email field`);
              }
            } catch (error: any) {
              console.log(`✗ Field "${candidate.name}" failed: ${error.response?.status || error.message}`);
            }
          }
          console.log("[Amplemarket Sync] ===== END ID FIELD TESTING =====");
          console.log("");
        }
        
        // Collect ALL lead IDs without filtering (owner filtering happens after hydration)
        for (const lead of leads) {
          if (lead.id) {
            allLeadIds.push(lead.id);
          }
        }
      } catch (error: any) {
        console.error(`[Amplemarket Sync] Error fetching list ${list.id}:`, error.message);
        // Continue with next list
      }
    }
    
    // Deduplicate IDs across lists
    const uniqueLeadIds = Array.from(new Set(allLeadIds));
    const duplicatesRemoved = allLeadIds.length - uniqueLeadIds.length;
    
    console.log(`[Amplemarket Sync] Step 1 complete:`, {
      lists_scanned: listsScanned,
      ids_fetched_total: idsScannedTotal,
      ids_collected_raw: allLeadIds.length,
      ids_deduped_total: uniqueLeadIds.length,
      duplicates_removed: duplicatesRemoved
    });
    
    // Step 2: Hydrate full contact details in batches
    if (uniqueLeadIds.length > 0) {
      console.log(`[Amplemarket Sync] Step 2: Hydrating ${uniqueLeadIds.length} contacts in batches...`);
      
      const batchSize = 20; // Amplemarket requires max 20 IDs per /contacts request
      const batches = [];
      for (let i = 0; i < uniqueLeadIds.length; i += batchSize) {
        batches.push(uniqueLeadIds.slice(i, i + batchSize));
      }
      
      batchesTotal = batches.length;
      console.log(`[Amplemarket Sync] Processing ${batchesTotal} batches of ${batchSize} contacts each`);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`[Amplemarket Sync] Hydrating batch ${batchIndex + 1}/${batches.length} (${batch.length} IDs)`);
        
        // CRITICAL: Hard assertion - batch size MUST be <= 20
        if (batch.length > 20) {
          throw new Error(`Batch size ${batch.length} exceeds maximum of 20. This is a bug.`);
        }
        
        try {
          // Call /contacts with ids[] parameter using repeated query params
          // Correct: /contacts?ids[]=1&ids[]=2&ids[]=3
          // Incorrect: /contacts?ids=1,2,3
          const contactsResponse = await (client as any).client.get('/contacts', {
            params: { ids: batch },
            paramsSerializer: (params: any) => qs.stringify(params, { arrayFormat: 'brackets' })
          });
          
          // Log hydration proof for first batch
          if (batchIndex === 0) {
            const serializedQuery = qs.stringify({ ids: batch }, { arrayFormat: 'brackets' });
            console.log("[Amplemarket Sync] ===== HYDRATION PROOF (batch 1) =====");
            console.log(`Batch size: ${batch.length}`);
            console.log(`Serialized query: ${serializedQuery.substring(0, 200)}...`);
            console.log(`Response contacts.length: ${contactsResponse.data.contacts?.length || 0}`);
            console.log("[Amplemarket Sync] ===== END HYDRATION PROOF =====");
          }
          
          const contacts = contactsResponse.data.contacts || [];
          console.log(`[Amplemarket Sync] Hydrated ${contacts.length} contacts from batch`);
          fetchedTotal += contacts.length;
          
          // Log first 5 contacts from first batch - SHOW RAW STRUCTURE
          if (batchIndex === 0 && contacts.length > 0) {
            const sampleSize = Math.min(5, contacts.length);
            console.log(`[Amplemarket Sync] ===== RAW CONTACT SAMPLES (first ${sampleSize}) =====`);
            console.log(`Selected owner (normalized): "${normalizedSelectedEmail}"`);
            console.log("");
            
            for (let i = 0; i < sampleSize; i++) {
              const sample = contacts[i];
              
              // Show EXACT raw structure with all owner-related fields
              const rawSample: any = {
                id: sample.id,
                email: sample.email,
              };
              
              // Include all fields that might contain owner info
              const ownerFields = ['owner', 'owner_email', 'user', 'assigned_to', 'created_by', 'updated_by'];
              for (const field of ownerFields) {
                if (sample[field] !== undefined) {
                  rawSample[field] = sample[field];
                }
              }
              
              console.log(`Contact ${i + 1} RAW:`);
              console.log(JSON.stringify(rawSample, null, 2));
              
              // Show extraction and comparison
              const ownerEmail = extractOwnerEmail(sample);
              const normalizedOwner = normalizeEmail(ownerEmail);
              console.log(`  Extracted owner: "${ownerEmail}"`);
              console.log(`  Normalized owner: "${normalizedOwner}"`);
              console.log(`  Matches selected: ${normalizedOwner === normalizedSelectedEmail}`);
              console.log("");
            }
            console.log("[Amplemarket Sync] ===== END RAW SAMPLES =====");
          }
          
          // Process each hydrated contact with STRICT owner filtering
          for (const contact of contacts) {
            try {
              // Skip if no email
              if (!contact.email) {
                skippedCount++;
                continue;
              }
              
              // CRITICAL: Owner filtering on hydrated contact
              const contactOwnerEmail = extractOwnerEmail(contact);
              const normalizedContactOwner = normalizeEmail(contactOwnerEmail);
              
              if (!contactOwnerEmail) {
                missingOwnerField++;
                discardedOtherOwners++;
                continue;
              }
              
              // Track contacts that have owner field
              const contactsWithOwnerField = fetchedTotal - missingOwnerField;
              
              // Filter by owner - only keep contacts matching selected user
              if (normalizedContactOwner !== normalizedSelectedEmail) {
                discardedOtherOwners++;
                continue;
              }
              
              keptMatchingOwner++;
            
              // Check if person already exists by email
              const [existingPerson] = await db
                .select()
                .from(people)
                .where(and(
                  eq(people.tenantId, tenantId),
                  eq(people.primaryEmail, contact.email)
                ))
                .limit(1);

              // Create or update account from contact company data
              const accountId = await syncAccountFromContact(db, tenantId, contact);

              const personData = {
                accountId,
                fullName: `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || contact.email,
                firstName: contact.first_name,
                lastName: contact.last_name,
                primaryEmail: contact.email,
                companyName: contact.company_name,
                companyDomain: contact.company_domain,
                companySize: null,
                roleTitle: contact.title,
                simplifiedTitle: null,
                phone: contact.phone_numbers?.[0]?.number || null,
                manuallyAddedNumber: null,
                manuallyAddedNumberDncStatus: null,
                sourcedNumber: null,
                sourcedNumberDncStatus: null,
                mobileNumber: null,
                mobileNumberDncStatus: null,
                workNumber: null,
                workNumberDncStatus: null,
                city: null,
                state: null,
                country: null,
                location: null,
                linkedinUrl: contact.linkedin_url,
                industry: contact.industry,
                status: null,
                numberOfOpens: 0,
                label: null,
                meetingBooked: false,
                owner: null,
                sequenceName: null,
                sequenceTemplateName: null,
                savedSearchOrLeadListName: null,
                mailbox: null,
                contactUrl: null,
                replied: false,
                lastStageExecuted: null,
                lastStageExecutedAt: null,
                notes: null,
                enrichmentSource: "amplemarket",
                enrichmentSnapshot: contact,
                enrichmentLastSyncedAt: new Date(),
                integrationId,
                amplemarketUserId,
                amplemarketExternalId: contact.id || contact.email,
                updatedAt: new Date(),
              };

              if (existingPerson) {
                // Update existing person
                await db
                  .update(people)
                  .set(personData)
                  .where(eq(people.id, existingPerson.id));
                updatedCount++;
              } else {
                // Create new person
                await db.insert(people).values({
                  id: nanoid(),
                  tenantId,
                  ...personData,
                  createdAt: new Date(),
                });
                createdCount++;
              }
            } catch (error: any) {
              console.error(`[Amplemarket Sync] Error upserting contact ${contact.email}:`, error.message);
              // Continue with next contact
            }
          }
        } catch (error: any) {
          console.error(`[Amplemarket Sync] Error hydrating batch ${batchIndex + 1}:`, error.message);
          // Continue with next batch
        }
      }
    }
    
    // Comprehensive sync summary with all required details
    const syncSummary = {
      mode: 'all_user_contacts',
      selected_amplemarket_user_email: amplemarketUserEmail,
      selected_amplemarket_user_id: amplemarketUserId,
      
      // Step 1: ID collection
      lists_scanned: listsScanned,
      ids_source_endpoint: '/lead-lists (all lists)',
      ids_fetched_total: idsScannedTotal,
      ids_collected_raw: allLeadIds.length,
      ids_deduped_total: uniqueLeadIds.length,
      duplicates_removed: duplicatesRemoved,
      
      // Step 2: Hydration
      hydration_endpoint: '/contacts?ids=...',
      contacts_hydrated_total: fetchedTotal,
      
      // Owner filtering (applied on hydrated contacts)
      contacts_with_owner_field_count: fetchedTotal - missingOwnerField,
      missing_owner_field: missingOwnerField,
      kept_owner_match: keptMatchingOwner,
      discarded_owner_mismatch: discardedOtherOwners,
      
      // Upsert results
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount
    };
    
    console.log("[Amplemarket Sync] ===== SYNC SUMMARY =====");
    console.log(JSON.stringify(syncSummary, null, 2));
    console.log("[Amplemarket Sync] ===== END SUMMARY =====");
    
    // HARD FAIL if contacts hydrated but none kept (prevents silent zero runs)
    if (fetchedTotal > 0 && keptMatchingOwner === 0) {
      const errorMessage = `Owner field not present or mismatch. Sync aborted to prevent data loss. Hydrated ${fetchedTotal} contacts but none matched owner ${amplemarketUserEmail}. Missing owner field on ${missingOwnerField} contacts. Check which endpoint is used and whether it returns owner.`;
      console.error("[Amplemarket Sync] HARD FAIL:", errorMessage);
      throw new Error(errorMessage);
    }
    
    // Diagnostic message if no contacts matched owner
    let diagnosticMessage = undefined;
    if (keptMatchingOwner === 0 && fetchedTotal > 0) {
      diagnosticMessage = `Owner field not present on fetched endpoint or owner mismatch. Fetched ${fetchedTotal} contacts but none matched owner ${amplemarketUserEmail}. Missing owner field on ${missingOwnerField} contacts. Check which endpoint is used and whether it returns owner.`;
      console.warn("[Amplemarket Sync] DIAGNOSTIC:", diagnosticMessage);
    }
    
    // Determine reason for zero counters
    let reason = undefined;
    if (idsScannedTotal === 0) {
      reason = "no_leads_returned_from_lists";
    } else if (uniqueLeadIds.length === 0) {
      reason = "all_leads_filtered_during_dedup";
    } else if (fetchedTotal === 0) {
      reason = "hydration_returned_empty";
    } else if (fetchedTotal - missingOwnerField === 0) {
      reason = "owner_field_missing";
    } else if (keptMatchingOwner === 0) {
      reason = "owner_mismatch";
    } else if (createdCount === 0 && updatedCount === 0) {
      reason = "upsert_failed";
    }
    
    // Return early for all_user_contacts mode with full diagnostic counters
    return { 
      // Tracking
      correlationId,
      
      // Configuration
      selected_amplemarket_user_email: amplemarketUserEmail,
      
      // Stage 1: ID Collection
      list_ids_scanned_count: listsScanned,
      list_pages_fetched_total: listPagesFetched,
      lead_items_seen_total: leadItemsSeen,
      lead_ids_fetched_total: idsScannedTotal,
      lead_ids_deduped_total: uniqueLeadIds.length,
      
      // Stage 2: Hydration
      contacts_hydration_batches_total: batchesTotal,
      contacts_hydrated_total: fetchedTotal,
      
      // Stage 3: Owner Filtering
      contacts_with_owner_field_count: fetchedTotal - missingOwnerField,
      kept_owner_match: keptMatchingOwner,
      discarded_owner_mismatch: discardedOtherOwners,
      
      // Stage 4: Upsert
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      
      // Legacy fields for backward compatibility
      createdCount, 
      updatedCount, 
      skippedCount,
      fetchedTotal,
      keptMatchingOwner,
      discardedOtherOwners,
      missingOwnerField,
      diagnosticMessage,
      
      // Diagnostic
      reason
    };
  }
  
  // Fetch contacts from each selected list
  for (const listId of selectedListIds) {
    const requestUrl = `${AMPLEMARKET_API_BASE}/lead-lists/${listId}`;
    console.log("[Amplemarket Sync] Fetching list:", {
      url: requestUrl,
      method: "GET",
      listId,
      hasApiKey: !!apiKey
    });
    
    try {
      const response = await axios.get(requestUrl, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      
      console.log("[Amplemarket Sync] List Response:", {
        status: response.status,
        listName: response.data?.name,
        leadsCount: response.data?.leads?.length || 0
      });

      const leadsList = response.data.leads || [];
      fetchedTotal += leadsList.length;
      
      console.log(`[Amplemarket Sync] Fetched ${leadsList.length} leads from list ${listId}`);
      
      // Log first 5 contacts to prove owner field format
      if (leadsList.length > 0) {
        const sampleSize = Math.min(5, leadsList.length);
        console.log(`[Amplemarket Sync] Sample of first ${sampleSize} contacts:`);
        for (let i = 0; i < sampleSize; i++) {
          const sample = leadsList[i];
          console.log(`  Contact ${i + 1}:`, {
            external_id: sample.id,
            email: sample.email,
            owner: sample.owner,
            owner_email: sample.owner_email,
            user_email: sample.user?.email,
            assigned_to: sample.assigned_to,
            created_by: sample.created_by,
            availableFields: Object.keys(sample).filter(k => k.includes('owner') || k.includes('user') || k.includes('email'))
          });
        }
      }
      
      for (const lead of leadsList) {
        // Skip if no email
        if (!lead.email) {
          skippedCount++;
          continue;
        }
        
        // CRITICAL: Filter by owner email - only import contacts owned by selected user
        if (!lead.owner) {
          console.warn("[Amplemarket Sync] Lead missing owner field:", {
            leadEmail: lead.email,
            leadId: lead.id,
            availableFields: Object.keys(lead)
          });
          throw new Error(`Amplemarket lead ${lead.email} is missing owner field. Cannot determine ownership. Aborting sync.`);
        }
        
        // Normalize owner matching: case-insensitive, trimmed, email-only
        const normalizeEmail = (email: string) => email.toLowerCase().trim();
        const leadOwnerNormalized = normalizeEmail(lead.owner);
        const expectedOwnerNormalized = normalizeEmail(amplemarketUserEmail);
        
        if (leadOwnerNormalized !== expectedOwnerNormalized) {
          discardedOtherOwners++;
          if (discardedOtherOwners <= 3) {
            console.log("[Amplemarket Sync] Skipping lead - wrong owner:", {
              leadEmail: lead.email,
              leadOwner: lead.owner,
              leadOwnerNormalized,
              expectedOwner: amplemarketUserEmail,
              expectedOwnerNormalized,
              match: leadOwnerNormalized === expectedOwnerNormalized
            });
          }
          continue;
        }
        
        keptMatchingOwner++;
        
        // Check if person already exists by email
        const [existingPerson] = await db
          .select()
          .from(people)
          .where(and(
            eq(people.tenantId, tenantId),
            eq(people.primaryEmail, lead.email)
          ))
          .limit(1);

        // Create or update account from lead company data
        const accountId = await syncAccountFromContact(db, tenantId, lead);

        const personData = {
          accountId,
          fullName: `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || lead.email,
          firstName: lead.first_name,
          lastName: lead.last_name,
          primaryEmail: lead.email,
          companyName: lead.company_name,
          companyDomain: lead.company_domain,
          companySize: null,
          roleTitle: lead.title,
          simplifiedTitle: null,
          phone: lead.phone_numbers?.[0]?.number || null,
          manuallyAddedNumber: null,
          manuallyAddedNumberDncStatus: null,
          sourcedNumber: null,
          sourcedNumberDncStatus: null,
          mobileNumber: null,
          mobileNumberDncStatus: null,
          workNumber: null,
          workNumberDncStatus: null,
          city: null,
          state: null,
          country: null,
          location: null,
          linkedinUrl: lead.linkedin_url,
          industry: lead.industry,
          status: null,
          numberOfOpens: 0,
          label: null,
          meetingBooked: false,
          owner: null,
          sequenceName: null,
          sequenceTemplateName: null,
          savedSearchOrLeadListName: null,
          mailbox: null,
          contactUrl: null,
          replied: false,
          lastStageExecuted: null,
          lastStageExecutedAt: null,
          notes: null,
          enrichmentSource: "amplemarket",
          enrichmentSnapshot: lead,
          enrichmentLastSyncedAt: new Date(),
          integrationId,
          amplemarketUserId,
          amplemarketExternalId: lead.id || lead.email, // Use lead ID or email as external ID
          updatedAt: new Date(),
        };

        if (existingPerson) {
          // Update existing person
          await db
            .update(people)
            .set(personData)
            .where(eq(people.id, existingPerson.id));
          updatedCount++;
        } else {
          // Create new person
          await db.insert(people).values({
            id: nanoid(),
            tenantId,
            ...personData,
            createdAt: new Date(),
          });
          createdCount++;
        }
      }
    } catch (error: any) {
      console.error("[Amplemarket Sync] Error fetching list:", {
        listId,
        url: requestUrl,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseBody: error.response?.data,
        message: error.message
      });
      // Continue with next list instead of failing entire sync
    }
  }
  
  console.log("[Amplemarket Sync] Sync completed:", {
    fetchedTotal,
    keptMatchingOwner,
    discardedOtherOwners,
    createdCount,
    updatedCount,
    skippedCount,
    totalProcessed: createdCount + updatedCount,
    duration: `${(new Date().getTime() - syncStartTime.getTime()) / 1000}s`
  });
  
  return { 
    createdCount, 
    updatedCount, 
    skippedCount,
    fetchedTotal,
    keptMatchingOwner,
    discardedOtherOwners
  };
}

/**
 * Full Amplemarket sync: contacts (accounts are derived from contact company data)
 */
export async function syncAmplemarket(
  db: any,
  tenantId: string,
  integrationId: string,
  apiKey: string,
  amplemarketUserId: string,
  amplemarketUserEmail: string,
  syncScope: string = 'all_user_contacts',
  selectedListIds: string[] = []
) {
  const syncStartTime = new Date();
  
  // Create sync log entry
  const syncLogId = nanoid();
  await db.insert(amplemarketSyncLogs).values({
    id: syncLogId,
    tenantId,
    integrationId,
    status: "running",
    startedAt: syncStartTime,
    amplemarketUserId,
    amplemarketUserEmail,
    selectedLists: selectedListIds.join(","),
    contactsCreated: 0,
    contactsUpdated: 0,
    contactsSkipped: 0,
  });

  try {
    // Use new simplified sync that processes leads directly
    const { syncAmplemarketFromLeads } = await import('./amplemarketSyncFromLeads');
    const syncResult = await syncAmplemarketFromLeads(
      db,
      tenantId,
      integrationId,
      apiKey,
      amplemarketUserEmail,
      selectedListIds,
      syncScope
    );

    // Update sync log with results
    await db
      .update(amplemarketSyncLogs)
      .set({
        status: "completed",
        completedAt: new Date(),
        
        // Sync results from lead-based sync
        contactsCreated: syncResult.leads_created,
        contactsUpdated: syncResult.leads_updated,
        contactsSkipped: syncResult.leads_skipped,
        contactsFetched: syncResult.leads_processed_total,
        contactsKept: syncResult.leads_matching_owner,
        contactsDiscarded: syncResult.leads_wrong_owner,
        
        // Diagnostic counters
        correlationId: syncResult.correlationId,
        listIdsScannedCount: syncResult.lists_scanned,
        leadIdsFetchedTotal: syncResult.leads_processed_total,
        contactsWithOwnerFieldCount: syncResult.leads_with_owner_field,
        keptOwnerMatch: syncResult.leads_matching_owner,
        discardedOwnerMismatch: syncResult.leads_wrong_owner,
        created: syncResult.leads_created,
        updated: syncResult.leads_updated,
        skipped: syncResult.leads_skipped,
      })
      .where(eq(amplemarketSyncLogs.id, syncLogId));

    // Update last synced timestamp
    await db
      .update(integrations)
      .set({ lastSyncedAt: new Date() })
      .where(and(
        eq(integrations.tenantId, tenantId),
        eq(integrations.provider, "amplemarket")
      ));

    // Enforce 422 errors for zero-lead conditions
    const listsScanned = syncResult.lists_scanned || 0;
    const leadsProcessed = syncResult.leads_processed_total || 0;
    const leadsWithOwner = syncResult.leads_with_owner_field || 0;
    const leadsMatchingOwner = syncResult.leads_matching_owner || 0;
    const created = syncResult.leads_created || 0;
    const updated = syncResult.leads_updated || 0;
    
    // Build stable response contract
    const response = {
      correlation_id: syncResult.correlationId || nanoid(10),
      mode: 'leads',
      summary: {
        lists_scanned: listsScanned,
        lead_items_seen: leadsProcessed,
        lead_ids_deduped: leadsProcessed, // We don't dedupe across lists yet
        owner_missing: leadsProcessed - leadsWithOwner,
        owner_match: leadsMatchingOwner,
        owner_mismatch: syncResult.leads_wrong_owner || 0,
        created: created,
        updated: updated,
        skipped: syncResult.leads_skipped || 0,
      },
      sample: syncResult.sample || null,
    };
    
    // Enforce hard failure for zero-lead conditions with diagnostic payload
    if (listsScanned === 0) {
      const errorResponse = { ...response, reason: 'No lists found or list fetch failed' };
      throw new TRPCError({
        code: 'UNPROCESSABLE_CONTENT',
        message: 'No lists found or list fetch failed',
        cause: errorResponse
      });
    }
    
    if (leadsProcessed === 0 && listsScanned > 0) {
      const errorResponse = { ...response, reason: 'Lists returned no leads' };
      throw new TRPCError({
        code: 'UNPROCESSABLE_CONTENT',
        message: 'Lists returned no leads',
        cause: errorResponse
      });
    }
    
    if (leadsMatchingOwner === 0 && leadsProcessed > 0) {
      const errorResponse = { ...response, reason: 'Owner mismatch or owner field missing' };
      throw new TRPCError({
        code: 'UNPROCESSABLE_CONTENT',
        message: `Owner mismatch or owner field missing. Processed ${leadsProcessed} leads but none matched "${amplemarketUserEmail}". Owner field present: ${leadsWithOwner}/${leadsProcessed}`,
        cause: errorResponse
      });
    }
    
    return response;
  } catch (error: any) {
    // Update sync log with error
    await db
      .update(amplemarketSyncLogs)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: error.message || "Unknown error",
      })
      .where(eq(amplemarketSyncLogs.id, syncLogId));
    
    throw error;
  }
}

/**
 * Sync email tasks from Amplemarket /tasks endpoint
 * Per Amplemarket support: email activity must be fetched from /tasks with type filter
 * Per Amplemarket support: task endpoints require user_id from List Users endpoint
 */
export async function syncAmplemarketEmailTasks(
  db: any,
  tenantId: string,
  integrationId: string,
  apiKey: string,
  amplemarketUserEmail: string
) {
  // Fail-fast validation: user must be selected
  if (!amplemarketUserEmail) {
    throw new Error("Amplemarket user must be selected before syncing email tasks. Please select a user in the configuration.");
  }
  
  // Import getUserIdByEmail dynamically to avoid circular dependency
  const { getUserIdByEmail } = await import("./amplemarketUserScope");
  
  // Retrieve user_id from List Users endpoint (required for task calls)
  const amplemarketUserId = await getUserIdByEmail(apiKey, amplemarketUserEmail);
  
  console.log("[Amplemarket Email Tasks] Starting sync with user scoping:", {
    tenantId,
    integrationId,
    amplemarketUserId,
    amplemarketUserEmail
  });
  
  // Initialize sync counters
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const syncStartTime = new Date();
  
  // Fetch email tasks from /tasks endpoint with type=email filter and user_id
  const requestUrl = `${AMPLEMARKET_API_BASE}/tasks`;
  const params = {
    type: 'email', // Filter for email tasks only
    user_id: amplemarketUserId, // Scope to selected user
    limit: 1000 // Fetch up to 1000 tasks
  };
  
  console.log("[Amplemarket Email Tasks] Fetching tasks:", {
    url: requestUrl,
    method: "GET",
    params,
    hasApiKey: !!apiKey
  });
  
  try {
    const response = await axios.get(requestUrl, {
      headers: { "Authorization": `Bearer ${apiKey}` },
      params
    });
    
    console.log("[Amplemarket Email Tasks] Response:", {
      status: response.status,
      tasksCount: response.data?.tasks?.length || 0,
      responseKeys: Object.keys(response.data || {})
    });

    const tasks = response.data.tasks || [];
    
    for (const task of tasks) {
      // Skip if no email or contact info
      if (!task.contact_email) {
        skippedCount++;
        continue;
      }
      
      // Find the person in CRM by email
      const [person] = await db
        .select()
        .from(people)
        .where(and(
          eq(people.tenantId, tenantId),
          eq(people.primaryEmail, task.contact_email)
        ))
        .limit(1);
      
      if (!person) {
        console.log("[Amplemarket Email Tasks] Contact not found in CRM:", task.contact_email);
        skippedCount++;
        continue;
      }
      
      // TODO: Store email task as moment or in dedicated table
      // For now, just log the task data
      console.log("[Amplemarket Email Tasks] Task data:", {
        contactEmail: task.contact_email,
        taskType: task.type,
        taskStatus: task.status,
        taskId: task.id,
        availableFields: Object.keys(task)
      });
      
      createdCount++;
    }
    
    const syncDuration = Date.now() - syncStartTime.getTime();
    
    console.log("[Amplemarket Email Tasks] Sync completed:", {
      tenantId,
      integrationId,
      amplemarketUserId,
      amplemarketUserEmail,
      createdCount,
      updatedCount,
      skippedCount,
      totalTasks: tasks.length,
      durationMs: syncDuration
    });
    
    return {
      success: true,
      createdCount,
      updatedCount,
      skippedCount,
      totalTasks: tasks.length
    };
  } catch (error: any) {
    console.error("[Amplemarket Email Tasks] Error fetching tasks:", {
      url: requestUrl,
      status: error.response?.status,
      statusText: error.response?.statusText,
      errorMessage: error.message,
      responseData: error.response?.data
    });
    
    // Enhanced 404 logging per requirements
    if (error.response?.status === 404) {
      const fullPath = error.config?.url || requestUrl;
      const fullUrl = `${fullPath}?${new URLSearchParams(params as any).toString()}`;
      console.error("[Amplemarket Email Tasks] 404 ERROR - Endpoint does not exist:", {
        fullPath,
        fullUrl,
        method: error.config?.method?.toUpperCase() || "GET",
        params,
        message: "The /tasks endpoint does not exist or is not accessible with current credentials"
      });
      throw new Error(`Amplemarket endpoint does not exist: ${fullUrl}. Please verify the API endpoint with Amplemarket support.`);
    }
    
    throw error;
  }
}
