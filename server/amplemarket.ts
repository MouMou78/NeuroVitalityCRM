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
    selectedListIds: selectedListIds.length
  });
  
  // Initialize sync counters
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const syncStartTime = new Date();
  
  // Fail-fast validation: lists must be selected (no workspace-wide pulls)
  if (selectedListIds.length === 0) {
    throw new Error("No lists selected for sync. Please select specific lists in the configuration to prevent workspace-wide data pulls.");
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
      
      for (const lead of leadsList) {
        // Skip if no email
        if (!lead.email) continue;
        
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
    createdCount,
    updatedCount,
    skippedCount,
    totalProcessed: createdCount + updatedCount,
    duration: `${(new Date().getTime() - syncStartTime.getTime()) / 1000}s`
  });
  
  return { createdCount, updatedCount, skippedCount };
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
