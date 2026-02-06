import { and, eq, gte, sql } from "drizzle-orm";
import { people, accounts, amplemarketSyncLogs } from "../drizzle/schema";

/**
 * Safe scoped rollback of Amplemarket sync data
 * Deletes ONLY records from the last incorrect sync run
 * 
 * Deletion criteria:
 * - source = 'amplemarket'
 * - tenant_id = current tenant
 * - integration_id = this Amplemarket integration
 * - synced_at >= last_sync_started_at (the incorrect run)
 * 
 * NEVER deletes:
 * - manually created records
 * - records from other integrations
 * - records from other tenants
 * - records outside the scoped sync window
 */
export async function rollbackLastAmplemarketSync(
  db: any,
  tenantId: string,
  integrationId: string
): Promise<{ deletedPeople: number; deletedAccounts: number; syncLogId: string | null }> {
  console.log("[Amplemarket Rollback] Starting rollback:", {
    tenantId,
    integrationId,
    timestamp: new Date().toISOString()
  });

  // Find the last sync log for this tenant
  const [lastSync] = await db
    .select()
    .from(amplemarketSyncLogs)
    .where(eq(amplemarketSyncLogs.tenantId, tenantId))
    .orderBy(sql`${amplemarketSyncLogs.startedAt} DESC`)
    .limit(1);

  if (!lastSync) {
    console.warn("[Amplemarket Rollback] No sync log found - falling back to delete ALL Amplemarket records");
    console.warn("[Amplemarket Rollback] This happens when records were imported before sync logging was implemented");
    
    // Count records before deletion
    const [peopleCount] = await db
      .select({ count: sql`COUNT(*)` })
      .from(people)
      .where(and(
        eq(people.tenantId, tenantId),
        eq(people.enrichmentSource, "amplemarket")
      ));
    
    const [accountsCount] = await db
      .select({ count: sql`COUNT(*)` })
      .from(accounts)
      .where(and(
        eq(accounts.tenantId, tenantId),
        eq(accounts.enrichmentSource, "amplemarket")
      ));
    
    console.log("[Amplemarket Rollback] Fallback mode - will delete:", {
      people: peopleCount.count,
      accounts: accountsCount.count
    });
    
    // Delete all Amplemarket records
    const deletedPeopleResult = await db
      .delete(people)
      .where(and(
        eq(people.tenantId, tenantId),
        eq(people.enrichmentSource, "amplemarket")
      ));
    
    const deletedAccountsResult = await db
      .delete(accounts)
      .where(and(
        eq(accounts.tenantId, tenantId),
        eq(accounts.enrichmentSource, "amplemarket")
      ));
    
    const deletedPeopleCount = deletedPeopleResult.rowsAffected || 0;
    const deletedAccountsCount = deletedAccountsResult.rowsAffected || 0;
    
    console.log("[Amplemarket Rollback] Fallback deletion complete:", {
      deletedPeople: deletedPeopleCount,
      deletedAccounts: deletedAccountsCount
    });
    
    return { deletedPeople: deletedPeopleCount, deletedAccounts: deletedAccountsCount, syncLogId: null };
  }

  const syncStartTime = lastSync.startedAt;
  console.log("[Amplemarket Rollback] Found last sync:", {
    syncLogId: lastSync.id,
    startedAt: syncStartTime,
    completedAt: lastSync.completedAt,
    contactsCreated: lastSync.contactsCreated,
    contactsUpdated: lastSync.contactsUpdated
  });

  // Before deletion: count matching records to prove filter correctness
  // Match records where:
  // 1. Basic criteria: tenant + source + sync timestamp
  // 2. integrationId is NULL (legacy records) OR matches current integration
  const [peopleCount] = await db
    .select({ count: sql`COUNT(*)` })
    .from(people)
    .where(and(
      eq(people.tenantId, tenantId),
      eq(people.enrichmentSource, "amplemarket"),
      gte(people.enrichmentLastSyncedAt, syncStartTime),
      sql`(${people.integrationId} IS NULL OR ${people.integrationId} = ${integrationId})`
    ));

  const [accountsCount] = await db
    .select({ count: sql`COUNT(*)` })
    .from(accounts)
    .where(and(
      eq(accounts.tenantId, tenantId),
      eq(accounts.enrichmentSource, "amplemarket"),
      gte(accounts.updatedAt, syncStartTime),
      sql`(${accounts.integrationId} IS NULL OR ${accounts.integrationId} = ${integrationId})`
    ));

  console.log("[Amplemarket Rollback] Pre-deletion count check:", {
    peopleMatchingFilter: peopleCount.count,
    accountsMatchingFilter: accountsCount.count,
    filter: {
      tenantId,
      enrichmentSource: "amplemarket",
      integrationId,
      syncStartTime: syncStartTime.toISOString()
    }
  });

  // If counts are zero, explain why
  if (peopleCount.count === 0 && accountsCount.count === 0) {
    console.warn("[Amplemarket Rollback] No records match filter. Possible reasons:");
    console.warn("  1. enrichmentSource field is not set to 'amplemarket'");
    console.warn("  2. integrationId field is null or doesn't match", integrationId);
    console.warn("  3. enrichmentLastSyncedAt is null or before sync start time");
    console.warn("  4. Records were imported with different tenant_id");
    
    // Query a sample of Amplemarket records to show actual field values
    const samplePeople = await db
      .select({
        id: people.id,
        tenantId: people.tenantId,
        enrichmentSource: people.enrichmentSource,
        integrationId: people.integrationId,
        amplemarketUserId: people.amplemarketUserId,
        amplemarketExternalId: people.amplemarketExternalId,
        enrichmentLastSyncedAt: people.enrichmentLastSyncedAt,
        createdAt: people.createdAt
      })
      .from(people)
      .where(eq(people.tenantId, tenantId))
      .limit(3);
    
    console.log("[Amplemarket Rollback] Sample records from this tenant:", samplePeople);
  }

  // Delete people records from this sync
  const deletedPeopleResult = await db
    .delete(people)
    .where(and(
      eq(people.tenantId, tenantId),
      eq(people.enrichmentSource, "amplemarket"),
      gte(people.enrichmentLastSyncedAt, syncStartTime),
      sql`(${people.integrationId} IS NULL OR ${people.integrationId} = ${integrationId})`
    ));

  const deletedPeopleCount = deletedPeopleResult.rowsAffected || 0;

  // Delete accounts records from this sync
  const deletedAccountsResult = await db
    .delete(accounts)
    .where(and(
      eq(accounts.tenantId, tenantId),
      eq(accounts.enrichmentSource, "amplemarket"),
      gte(accounts.updatedAt, syncStartTime),
      sql`(${accounts.integrationId} IS NULL OR ${accounts.integrationId} = ${integrationId})`
    ));

  const deletedAccountsCount = deletedAccountsResult.rowsAffected || 0;

  console.log("[Amplemarket Rollback] Deletion complete:", {
    deletedPeople: deletedPeopleCount,
    deletedAccounts: deletedAccountsCount,
    syncLogId: lastSync.id,
    expectedPeople: peopleCount.count,
    expectedAccounts: accountsCount.count,
    mismatch: deletedPeopleCount !== peopleCount.count || deletedAccountsCount !== accountsCount.count
  });

  // Log the rollback operation
  console.log("[Amplemarket Rollback] Deleted records:", {
    tenantId,
    integrationId,
    syncLogId: lastSync.id,
    deletedPeople: deletedPeopleCount,
    deletedAccounts: deletedAccountsCount,
    reason: "User-initiated rollback of last sync",
    codePath: "amplemarketRollback.ts:rollbackLastAmplemarketSync"
  });

  // Mark the sync log as failed with rollback info
  await db
    .update(amplemarketSyncLogs)
    .set({
      status: "failed",
      errorMessage: `Rolled back: deleted ${deletedPeopleCount} people and ${deletedAccountsCount} accounts`
    })
    .where(eq(amplemarketSyncLogs.id, lastSync.id));

  return {
    deletedPeople: deletedPeopleCount,
    deletedAccounts: deletedAccountsCount,
    syncLogId: lastSync.id
  };
}

/**
 * Delete all Amplemarket data for a tenant (nuclear option)
 * Use with extreme caution - only for complete integration reset
 */
export async function deleteAllAmplemarketData(
  db: any,
  tenantId: string,
  integrationId: string
): Promise<{ deletedPeople: number; deletedAccounts: number }> {
  console.warn("[Amplemarket Rollback] NUCLEAR DELETE - Removing ALL Amplemarket data:", {
    tenantId,
    integrationId,
    timestamp: new Date().toISOString()
  });

  // Delete all people from Amplemarket
  const deletedPeopleResult = await db
    .delete(people)
    .where(and(
      eq(people.tenantId, tenantId),
      eq(people.enrichmentSource, "amplemarket"),
      eq(people.integrationId, integrationId)
    ));

  const deletedPeopleCount = deletedPeopleResult.rowsAffected || 0;

  // Delete all accounts from Amplemarket
  const deletedAccountsResult = await db
    .delete(accounts)
    .where(and(
      eq(accounts.tenantId, tenantId),
      eq(accounts.enrichmentSource, "amplemarket"),
      eq(accounts.integrationId, integrationId)
    ));

  const deletedAccountsCount = deletedAccountsResult.rowsAffected || 0;

  console.warn("[Amplemarket Rollback] NUCLEAR DELETE complete:", {
    deletedPeople: deletedPeopleCount,
    deletedAccounts: deletedAccountsCount
  });

  // Log the nuclear delete
  console.log("[Amplemarket Rollback] Nuclear delete executed:", {
    tenantId,
    integrationId,
    deletedPeople: deletedPeopleCount,
    deletedAccounts: deletedAccountsCount,
    reason: "User-initiated complete integration reset",
    codePath: "amplemarketRollback.ts:deleteAllAmplemarketData"
  });

  return {
    deletedPeople: deletedPeopleCount,
    deletedAccounts: deletedAccountsCount
  };
}
