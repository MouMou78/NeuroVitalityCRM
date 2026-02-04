import { getDb } from "./db";
import { campaignRecipients } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Generate a tracking pixel URL for email opens
 */
export function generateTrackingPixel(recipientId: string, baseUrl: string): string {
  const trackingId = Buffer.from(recipientId).toString("base64url");
  return `${baseUrl}/api/track/open/${trackingId}`;
}

/**
 * Generate a tracked link URL for click tracking
 */
export function generateTrackedLink(
  recipientId: string,
  originalUrl: string,
  baseUrl: string
): string {
  const trackingId = Buffer.from(recipientId).toString("base64url");
  const encodedUrl = encodeURIComponent(originalUrl);
  return `${baseUrl}/api/track/click/${trackingId}?url=${encodedUrl}`;
}

/**
 * Replace all links in email body with tracked links
 */
export function injectTrackingIntoEmail(
  emailBody: string,
  recipientId: string,
  baseUrl: string
): string {
  // Replace all <a> tags with tracked versions
  const linkRegex = /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>/gi;
  
  let trackedBody = emailBody.replace(linkRegex, (match, attrs, url) => {
    const trackedUrl = generateTrackedLink(recipientId, url, baseUrl);
    return match.replace(url, trackedUrl);
  });

  // Add tracking pixel at the end of the email
  const trackingPixelUrl = generateTrackingPixel(recipientId, baseUrl);
  const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;border:0;" />`;
  
  // Insert before closing </body> tag if exists, otherwise append
  if (trackedBody.includes("</body>")) {
    trackedBody = trackedBody.replace("</body>", `${trackingPixel}</body>`);
  } else {
    trackedBody += trackingPixel;
  }

  return trackedBody;
}

/**
 * Record email open event
 */
export async function recordEmailOpen(trackingId: string) {
  try {
    const recipientId = Buffer.from(trackingId, "base64url").toString();
    
    const db = await getDb();
    if (!db) {
      console.error("[Email Tracking] Database not available");
      return false;
    }

    // Update recipient record with open timestamp
    const result = await db
      .update(campaignRecipients)
      .set({
        openedAt: new Date(),
      })
      .where(eq(campaignRecipients.id, recipientId));

    console.log(`[Email Tracking] Recorded open for recipient: ${recipientId}`);
    return true;
  } catch (error: any) {
    console.error("[Email Tracking] Error recording open:", error.message);
    return false;
  }
}

/**
 * Record email click event
 */
export async function recordEmailClick(trackingId: string, clickedUrl: string) {
  try {
    const recipientId = Buffer.from(trackingId, "base64url").toString();
    
    const db = await getDb();
    if (!db) {
      console.error("[Email Tracking] Database not available");
      return null;
    }

    // Update recipient record with click timestamp
    await db
      .update(campaignRecipients)
      .set({
        clickedAt: new Date(),
      })
      .where(eq(campaignRecipients.id, recipientId));

    console.log(`[Email Tracking] Recorded click for recipient: ${recipientId}, URL: ${clickedUrl}`);
    return clickedUrl;
  } catch (error: any) {
    console.error("[Email Tracking] Error recording click:", error.message);
    return null;
  }
}

/**
 * Get tracking statistics for a campaign
 */
export async function getCampaignTrackingStats(campaignId: string) {
  const db = await getDb();
  if (!db) return null;

  const recipients = await db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId));

  const totalSent = recipients.filter(r => r.status === "sent").length;
  const totalOpened = recipients.filter(r => r.openedAt !== null).length;
  const totalClicked = recipients.filter(r => r.clickedAt !== null).length;

  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const clickToOpenRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

  return {
    totalSent,
    totalOpened,
    totalClicked,
    openRate: Math.round(openRate * 100) / 100,
    clickRate: Math.round(clickRate * 100) / 100,
    clickToOpenRate: Math.round(clickToOpenRate * 100) / 100,
  };
}

/**
 * Generate a 1x1 transparent PNG tracking pixel
 */
export function generateTrackingPixelImage(): Buffer {
  // Base64 encoded 1x1 transparent PNG
  const base64Pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return Buffer.from(base64Pixel, "base64");
}
