import * as db from "./db";
import { createAmplemarketClient } from "./amplemarketClient";
import { randomUUID } from "crypto";

/**
 * Fetch and cache contact counts for all Amplemarket lists
 * This is expensive (N+1 queries) so should be run as a background job
 */
export async function fetchAndCacheListCounts(tenantId: string) {
  console.log(`[Amplemarket Sync] Starting list count fetch for tenant ${tenantId}`);
  
  const syncLogId = randomUUID();
  
  try {
    // Create sync log
    await db.createSyncLog({
      id: syncLogId,
      tenantId,
      syncType: 'list_counts',
      status: 'running'
    });
    
    // Get Amplemarket integration
    const integrations = await db.getIntegrationsByTenant(tenantId);
    const amplemarketIntegration = integrations.find((i: any) => i.provider === "amplemarket");
    
    if (!amplemarketIntegration || amplemarketIntegration.status !== "connected") {
      throw new Error("Amplemarket not connected");
    }
    
    const apiKey = (amplemarketIntegration.config as any)?.apiKey;
    if (!apiKey) {
      throw new Error("Amplemarket API key not found");
    }
    
    const client = createAmplemarketClient(apiKey);
    
    // Fetch all lists
    const listsData = await client.getLists();
    const lists = listsData.lead_lists || [];
    
    console.log(`[Amplemarket Sync] Found ${lists.length} lists to fetch counts for`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Fetch each list individually to get contact count
    for (const list of lists) {
      try {
        const listDetail = await client.getListById(list.id);
        const contactCount = listDetail.leads?.length || 0;
        
        // Cache the list count
        await db.cacheListCount(tenantId, {
          listId: list.id,
          listName: list.name,
          owner: list.owner,
          shared: list.shared || false,
          contactCount
        });
        
        successCount++;
        console.log(`[Amplemarket Sync] Cached count for list "${list.name}": ${contactCount} contacts`);
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Failed to fetch list ${list.name}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`[Amplemarket Sync] ${errorMsg}`);
      }
    }
    
    // Update sync log
    await db.updateSyncLog(syncLogId, {
      status: 'completed',
      metadata: { listsProcessed: successCount, listsFailed: errorCount },
      errors
    });
    
    console.log(`[Amplemarket Sync] List count fetch completed: ${successCount} success, ${errorCount} errors`);
    
    return {
      success: true,
      listsProcessed: successCount,
      listsFailed: errorCount,
      errors
    };
  } catch (error: any) {
    console.error(`[Amplemarket Sync] List count fetch failed:`, error);
    
    // Update sync log with error
    await db.updateSyncLog(syncLogId, {
      status: 'failed',
      errorMessage: error.message
    });
    
    throw error;
  }
}

/**
 * Get cached list counts for a tenant
 */
export async function getCachedListCounts(tenantId: string, userEmail?: string) {
  return await db.getCachedListCounts(tenantId, userEmail);
}

/**
 * Preview sync changes without actually syncing
 */
export async function previewAmplemarketSync(tenantId: string, config: {
  userId?: string;
  selectedLists?: string[];
  selectedSequences?: string[];
  conflictStrategy?: string;
}) {
  console.log(`[Amplemarket Sync] Starting preview for tenant ${tenantId}`);
  
  // Get Amplemarket integration
  const integrations = await db.getIntegrationsByTenant(tenantId);
  const amplemarketIntegration = integrations.find((i: any) => i.provider === "amplemarket");
  
  if (!amplemarketIntegration || amplemarketIntegration.status !== "connected") {
    throw new Error("Amplemarket not connected");
  }
  
  const apiKey = (amplemarketIntegration.config as any)?.apiKey;
  if (!apiKey) {
    throw new Error("Amplemarket API key not found");
  }
  
  const client = createAmplemarketClient(apiKey);
  
  // Fetch contacts from selected lists
  const listsToSync = config.selectedLists && config.selectedLists.length > 0
    ? config.selectedLists
    : (await client.getLists()).lead_lists?.map((l: any) => l.id) || [];
  
  const amplemarketContacts: any[] = [];
  
  for (const listId of listsToSync) {
    try {
      const listDetail = await client.getListById(listId);
      if (listDetail.leads) {
        amplemarketContacts.push(...listDetail.leads);
      }
    } catch (error: any) {
      console.error(`[Amplemarket Sync] Failed to fetch list ${listId}:`, error.message);
    }
  }
  
  // Get existing CRM contacts
  const existingContacts = await db.getPeopleByTenant(tenantId);
  
  const existingEmailMap = new Map();
  for (const contact of existingContacts) {
    existingEmailMap.set(contact.primaryEmail.toLowerCase(), contact);
  }
  
  // Categorize changes
  const toCreate: any[] = [];
  const toUpdate: any[] = [];
  const conflicts: any[] = [];
  
  for (const ampContact of amplemarketContacts) {
    const email = ampContact.email?.toLowerCase();
    if (!email) continue;
    
    const existing = existingEmailMap.get(email);
    
    if (!existing) {
      toCreate.push({
        email: ampContact.email,
        name: ampContact.name || ampContact.full_name,
        company: ampContact.company_name,
        title: ampContact.title,
        source: 'amplemarket'
      });
    } else {
      // Check for conflicts
      const hasConflict = 
        (ampContact.name && existing.fullName && ampContact.name !== existing.fullName) ||
        (ampContact.company_name && existing.companyName && ampContact.company_name !== existing.companyName);
      
      if (hasConflict) {
        conflicts.push({
          email: ampContact.email,
          crmData: {
            name: existing.fullName,
            company: existing.companyName,
            lastUpdated: existing.updatedAt
          },
          amplemarketData: {
            name: ampContact.name || ampContact.full_name,
            company: ampContact.company_name,
            title: ampContact.title
          },
          recommendedAction: config.conflictStrategy || 'manual'
        });
      } else {
        toUpdate.push({
          email: ampContact.email,
          name: ampContact.name || ampContact.full_name,
          company: ampContact.company_name,
          title: ampContact.title,
          source: 'amplemarket'
        });
      }
    }
  }
  
  return {
    summary: {
      totalAmplemarketContacts: amplemarketContacts.length,
      toCreate: toCreate.length,
      toUpdate: toUpdate.length,
      conflicts: conflicts.length
    },
    toCreate: toCreate.slice(0, 10), // Preview first 10
    toUpdate: toUpdate.slice(0, 10),
    conflicts: conflicts.slice(0, 10),
    hasMore: {
      toCreate: toCreate.length > 10,
      toUpdate: toUpdate.length > 10,
      conflicts: conflicts.length > 10
    }
  };
}

/**
 * Get sync history for a tenant
 */
export async function getSyncHistory(tenantId: string, limit: number = 10) {
  return await db.getAmplemarketSyncHistory(tenantId, limit);
}

/**
 * Get latest sync status
 */
export async function getLatestSyncStatus(tenantId: string) {
  return await db.getLatestSyncStatus(tenantId);
}
