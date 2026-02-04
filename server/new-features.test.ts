import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { getMomentsByAccount } from "./db-account-activities";
import { addCampaignRecipients, getCampaignStats } from "./campaign-sender";

let TEST_TENANT_ID: string;
let TEST_USER_ID: string;
let TEST_ACCOUNT_ID: string;
let TEST_PERSON_ID: string;
let TEST_THREAD_ID: string;
const TEST_CAMPAIGN_ID = "test-campaign-new-features";

describe("New Features Tests", () => {
  beforeAll(async () => {
    // Create test tenant
    const tenant = await db.createTenant({
      name: "Test Tenant New Features",
    });
    TEST_TENANT_ID = tenant.id;

    // Create test user
    const user = await db.createUser({
      tenantId: TEST_TENANT_ID,
      email: "test-new-features@example.com",
      passwordHash: "test-hash",
      name: "Test User",
    });
    TEST_USER_ID = user.id;

    // Create test account
    const account = await db.createAccount({
      tenantId: TEST_TENANT_ID,
      name: "Test Company New Features",
      domain: "testcompany-new-features.com",
    });
    TEST_ACCOUNT_ID = account.id;

    // Create test person
    const person = await db.createPerson({
      tenantId: TEST_TENANT_ID,
      accountId: TEST_ACCOUNT_ID,
      fullName: "Test Person New Features",
      primaryEmail: "person-new-features@testcompany.com",
    });
    TEST_PERSON_ID = person.id;

    // Create test thread
    const thread = await db.createThread({
      tenantId: TEST_TENANT_ID,
      personId: TEST_PERSON_ID,
      intent: "outbound",
      status: "active",
    });
    TEST_THREAD_ID = thread.id;
  });

  afterAll(async () => {
    // Cleanup test data
    const dbInstance = await db.getDb();
    if (dbInstance) {
      const { tenants, users, accounts, people, threads, moments, marketingCampaigns, campaignRecipients } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      await dbInstance.delete(moments).where(eq(moments.tenantId, TEST_TENANT_ID));
      await dbInstance.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, TEST_CAMPAIGN_ID));
      await dbInstance.delete(marketingCampaigns).where(eq(marketingCampaigns.tenantId, TEST_TENANT_ID));
      await dbInstance.delete(threads).where(eq(threads.tenantId, TEST_TENANT_ID));
      await dbInstance.delete(people).where(eq(people.tenantId, TEST_TENANT_ID));
      await dbInstance.delete(accounts).where(eq(accounts.tenantId, TEST_TENANT_ID));
      await dbInstance.delete(users).where(eq(users.tenantId, TEST_TENANT_ID));
      await dbInstance.delete(tenants).where(eq(tenants.id, TEST_TENANT_ID));
    }
  });

  describe("Account Activity Timeline", () => {
    it("should retrieve activities for an account", async () => {
      // Create test moment
      await db.createMoment({
        tenantId: TEST_TENANT_ID,
        threadId: TEST_THREAD_ID,
        personId: TEST_PERSON_ID,
        source: "test",
        type: "email_sent",
        timestamp: new Date(),
        metadata: { subject: "Test Email" },
      });

      const activities = await getMomentsByAccount(TEST_TENANT_ID, TEST_ACCOUNT_ID);
      
      expect(activities).toBeDefined();
      expect(activities.length).toBeGreaterThan(0);
      expect(activities[0].personId).toBe(TEST_PERSON_ID);
      expect(activities[0].type).toBe("email_sent");
    });

    it("should return empty array for account with no contacts", async () => {
      const activities = await getMomentsByAccount(TEST_TENANT_ID, "non-existent-account");
      
      expect(activities).toBeDefined();
      expect(activities.length).toBe(0);
    });
  });

  describe("Campaign Email Sending", () => {
    it("should add recipients to a campaign", async () => {
      const result = await addCampaignRecipients(
        TEST_CAMPAIGN_ID,
        TEST_TENANT_ID,
        [TEST_PERSON_ID]
      );

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
    });

    it("should get campaign statistics", async () => {
      const stats = await getCampaignStats(TEST_CAMPAIGN_ID, TEST_TENANT_ID);

      expect(stats).toBeDefined();
      expect(stats?.totalRecipients).toBeGreaterThanOrEqual(0);
      expect(stats?.sentCount).toBeGreaterThanOrEqual(0);
      expect(stats?.failedCount).toBeGreaterThanOrEqual(0);
      expect(stats?.pendingCount).toBeGreaterThanOrEqual(0);
    });

    it("should calculate open and click rates", async () => {
      const stats = await getCampaignStats(TEST_CAMPAIGN_ID, TEST_TENANT_ID);

      expect(stats).toBeDefined();
      expect(stats?.openRate).toBeGreaterThanOrEqual(0);
      expect(stats?.clickRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Desktop Notification Bell", () => {
    it("should have notification system in place", async () => {
      // Test that notification queries work
      const notifications = await db.getNotificationsByUser(TEST_TENANT_ID, TEST_USER_ID);
      
      expect(notifications).toBeDefined();
      expect(Array.isArray(notifications)).toBe(true);
    });
  });
});
