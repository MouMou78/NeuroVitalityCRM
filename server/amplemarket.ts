import axios from "axios";
import { nanoid } from "nanoid";
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
    tenantId,
    integrationId,
    amplemarketUserId,
    amplemarketUserEmail,
    amplemarketUserEmailNormalized: amplemarketUserEmail.toLowerCase().trim(),
    syncScope,
    selectedListIds: selectedListIds.length,
    selectedListIdsArray: selectedListIds
  });
  
  // Initialize sync counters
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let fetchedTotal = 0;
  let keptMatchingOwner = 0;
  let discardedOtherOwners = 0;
  const syncStartTime = new Date();
  
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
    console.log("[Amplemarket Sync] Using all_user_contacts mode - two-step fetch (list IDs, then hydrate)");
    
    const { createAmplemarketClient } = await import('./amplemarketClient');
    const client = createAmplemarketClient(apiKey);
    
    // Step 1: Collect lead IDs from all lists
    console.log("[Amplemarket Sync] Step 1: Fetching all lead lists...");
    const listsResponse = await client.getLists();
    const allLists = listsResponse.lead_lists || [];
    console.log(`[Amplemarket Sync] Found ${allLists.length} lead lists`);
    
    const matchingLeadIds: string[] = [];
    let idsScannedTotal = 0;
    
    // Fetch leads from each list and filter by owner
    for (const list of allLists) {
      console.log(`[Amplemarket Sync] Fetching leads from list: ${list.name} (${list.id})`);
      
      try {
        const listDetailResponse = await client.getListById(list.id);
        const leads = listDetailResponse.leads || [];
        
        console.log(`[Amplemarket Sync] Fetched ${leads.length} leads from list`);
        idsScannedTotal += leads.length;
        
        // Log first 5 leads from first list to prove owner field format
        if (matchingLeadIds.length === 0 && leads.length > 0) {
          const sampleSize = Math.min(5, leads.length);
          console.log(`[Amplemarket Sync] Sample of first ${sampleSize} leads:`);
          for (let i = 0; i < sampleSize; i++) {
            const sample = leads[i];
            const ownerEmail = extractOwnerEmail(sample);
            console.log(`  Lead ${i + 1}:`, {
              external_id: sample.id,
              email: sample.email,
              owner_raw: sample.owner,
              owner_extracted: ownerEmail,
              owner_normalized: normalizeEmail(ownerEmail),
              availableFields: Object.keys(sample).filter(k => k.includes('owner') || k.includes('user') || k.includes('email'))
            });
          }
        }
        
        // Filter leads by owner and collect matching IDs
        for (const lead of leads) {
          // Skip if no ID
          if (!lead.id) {
            continue;
          }
          
          // Extract and normalize owner email
          const leadOwnerEmail = extractOwnerEmail(lead);
          const normalizedLeadOwner = normalizeEmail(leadOwnerEmail);
          
          if (!leadOwnerEmail) {
            missingOwnerField++;
            discardedOtherOwners++;
            continue;
          }
          
          // Filter by owner - only keep leads matching selected user
          if (normalizedLeadOwner !== normalizedSelectedEmail) {
            discardedOtherOwners++;
            continue;
          }
          
          // This lead matches the owner - collect its ID
          matchingLeadIds.push(lead.id);
        }
      } catch (error: any) {
        console.error(`[Amplemarket Sync] Error fetching list ${list.id}:`, error.message);
        // Continue with next list
      }
    }
    
    console.log(`[Amplemarket Sync] Step 1 complete: Scanned ${idsScannedTotal} leads, found ${matchingLeadIds.length} matching owner`);
    fetchedTotal = idsScannedTotal;
    keptMatchingOwner = matchingLeadIds.length;
    
    // Step 2: Hydrate full contact details in batches
    if (matchingLeadIds.length > 0) {
      console.log(`[Amplemarket Sync] Step 2: Hydrating ${matchingLeadIds.length} contacts in batches...`);
      
      const batchSize = 100; // Hydrate 100 contacts per request
      const batches = [];
      for (let i = 0; i < matchingLeadIds.length; i += batchSize) {
        batches.push(matchingLeadIds.slice(i, i + batchSize));
      }
      
      console.log(`[Amplemarket Sync] Processing ${batches.length} batches of ${batchSize} contacts each`);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`[Amplemarket Sync] Hydrating batch ${batchIndex + 1}/${batches.length} (${batch.length} IDs)`);
        
        try {
          // Call /contacts with ids parameter
          const idsParam = batch.join(',');
          const contactsResponse = await (client as any).client.get('/contacts', {
            params: { ids: idsParam }
          });
          
          const contacts = contactsResponse.data.contacts || [];
          console.log(`[Amplemarket Sync] Hydrated ${contacts.length} contacts from batch`);
          
          // Process each hydrated contact
          for (const contact of contacts) {
            try {
              // Skip if no email
              if (!contact.email) {
                skippedCount++;
                continue;
              }
            
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
    
    console.log("[Amplemarket Sync] all_user_contacts mode complete:", {
      fetchedTotal,
      missingOwnerField,
      keptMatchingOwner,
      discardedOtherOwners,
      createdCount,
      updatedCount,
      skippedCount
    });
    
    // Diagnostic message if no contacts matched owner
    let diagnosticMessage = undefined;
    if (keptMatchingOwner === 0 && fetchedTotal > 0) {
      diagnosticMessage = `Owner field not present on fetched endpoint or owner mismatch. Fetched ${fetchedTotal} contacts but none matched owner ${amplemarketUserEmail}. Missing owner field on ${missingOwnerField} contacts. Check which endpoint is used and whether it returns owner.`;
      console.warn("[Amplemarket Sync] DIAGNOSTIC:", diagnosticMessage);
    }
    
    // Return early for all_user_contacts mode
    return { 
      createdCount, 
      updatedCount, 
      skippedCount,
      fetchedTotal,
      keptMatchingOwner,
      discardedOtherOwners,
      missingOwnerField,
      diagnosticMessage
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
    const syncResult = await syncAmplemarketContacts(
      db,
      tenantId,
      integrationId,
      apiKey,
      amplemarketUserId,
      amplemarketUserEmail,
      syncScope,
      selectedListIds
    );

    // Update sync log with results
    await db
      .update(amplemarketSyncLogs)
      .set({
        status: "completed",
        completedAt: new Date(),
        contactsCreated: syncResult.createdCount,
        contactsUpdated: syncResult.updatedCount,
        contactsSkipped: syncResult.skippedCount,
        contactsFetched: syncResult.fetchedTotal,
        contactsKept: syncResult.keptMatchingOwner,
        contactsDiscarded: syncResult.discardedOtherOwners,
        missingOwnerField: syncResult.missingOwnerField || 0,
        diagnosticMessage: syncResult.diagnosticMessage || null,
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

    return {
      accountsSynced: 0, // Accounts are derived from contacts
      contactsCreated: syncResult.createdCount,
      contactsUpdated: syncResult.updatedCount,
      contactsSkipped: syncResult.skippedCount,
      contactsFetched: syncResult.fetchedTotal,
      contactsKept: syncResult.keptMatchingOwner,
      contactsDiscarded: syncResult.discardedOtherOwners,
      totalSynced: syncResult.createdCount + syncResult.updatedCount
    };
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
