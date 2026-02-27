import nodemailer from "nodemailer";
import { getDb } from "./db";
import { emailAccounts, campaignRecipients, marketingCampaigns } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Send a marketing campaign using configured SMTP email account
 */
export async function sendCampaign(campaignId: string, tenantId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get campaign details
  const campaign = await db
    .select()
    .from(marketingCampaigns)
    .where(and(eq(marketingCampaigns.id, campaignId), eq(marketingCampaigns.tenantId, tenantId)))
    .limit(1);

  if (!campaign[0]) {
    throw new Error("Campaign not found");
  }

  const campaignData = campaign[0];

  // Get default email account for this user
  const emailAccount = await db
    .select()
    .from(emailAccounts)
    .where(
      and(
        eq(emailAccounts.tenantId, tenantId),
        eq(emailAccounts.userId, userId),
        eq(emailAccounts.isDefault, true)
      )
    )
    .limit(1);

  if (!emailAccount[0]) {
    throw new Error("No default email account configured. Please configure an email account first.");
  }

  const account = emailAccount[0];

  // Create nodemailer transporter
  const transporter = nodemailer.createTransport({
    host: account.smtpHost!,
    port: account.smtpPort!,
    secure: account.smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: account.smtpUser!,
      pass: account.smtpPass!, // Note: In production, decrypt this
    },
  });

  // Verify connection
  try {
    await transporter.verify();
  } catch (error: any) {
    throw new Error(`SMTP connection failed: ${error.message}`);
  }

  // Get recipients
  const recipients = await db
    .select()
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        eq(campaignRecipients.status, "pending")
      )
    );

  if (recipients.length === 0) {
    throw new Error("No recipients found for this campaign");
  }

  // Update campaign status to sending
  await db
    .update(marketingCampaigns)
    .set({ status: "sending" })
    .where(eq(marketingCampaigns.id, campaignId));

  // Send emails to each recipient
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    try {
      // Inject tracking pixels and links
      const { injectTrackingIntoEmail } = await import("./email-tracking");
      const baseUrl = process.env.VITE_APP_URL || "https://crm.neurovitality.com";
      const trackedBody = injectTrackingIntoEmail(campaignData.body, recipient.id, baseUrl);
      
      // Send email with tracking
      await transporter.sendMail({
        from: `"${account.email}" <${account.email}>`,
        to: recipient.email,
        subject: campaignData.subject,
        html: trackedBody,
      });

      // Update recipient status
      await db
        .update(campaignRecipients)
        .set({
          status: "sent",
          sentAt: new Date(),
        })
        .where(eq(campaignRecipients.id, recipient.id));

      sentCount++;
    } catch (error: any) {
      // Update recipient status to failed
      await db
        .update(campaignRecipients)
        .set({
          status: "failed",
          error: error.message,
        })
        .where(eq(campaignRecipients.id, recipient.id));

      failedCount++;
    }
  }

  // Update campaign status to sent
  await db
    .update(marketingCampaigns)
    .set({
      status: "sent",
      sentAt: new Date(),
      recipientCount: sentCount + failedCount,
    })
    .where(eq(marketingCampaigns.id, campaignId));

  return {
    success: true,
    sentCount,
    failedCount,
    totalRecipients: recipients.length,
  };
}

/**
 * Add recipients to a campaign from a list of person IDs
 */
export async function addCampaignRecipients(
  campaignId: string,
  tenantId: string,
  personIds: string[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { getPeopleByTenant } = await import("./db");
  const allPeople = await getPeopleByTenant(tenantId);
  
  const selectedPeople = allPeople.filter(p => personIds.includes(p.id));

  if (selectedPeople.length === 0) {
    throw new Error("No valid recipients found");
  }

  // Insert recipients
  const recipients = selectedPeople.map(person => ({
    id: nanoid(),
    campaignId,
    personId: person.id,
    email: person.primaryEmail,
    status: "pending" as const,
  }));

  await db.insert(campaignRecipients).values(recipients);

  return {
    success: true,
    addedCount: recipients.length,
  };
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(campaignId: string, tenantId: string) {
  const db = await getDb();
  if (!db) return null;

  const recipients = await db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId));

  const totalRecipients = recipients.length;
  const sentCount = recipients.filter(r => r.status === "sent").length;
  const failedCount = recipients.filter(r => r.status === "failed").length;
  const pendingCount = recipients.filter(r => r.status === "pending").length;
  const openedCount = recipients.filter(r => r.openedAt !== null).length;
  const clickedCount = recipients.filter(r => r.clickedAt !== null).length;

  return {
    totalRecipients,
    sentCount,
    failedCount,
    pendingCount,
    openedCount,
    clickedCount,
    openRate: sentCount > 0 ? (openedCount / sentCount) * 100 : 0,
    clickRate: sentCount > 0 ? (clickedCount / sentCount) * 100 : 0,
  };
}
