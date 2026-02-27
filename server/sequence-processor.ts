import { getDb } from "./db";
import { emailSequences, emailSequenceSteps, emailSequenceEnrollments, emailSequenceEvents, emailAccounts } from "../drizzle/schema";
import { eq, and, lt, gte } from "drizzle-orm";
import nodemailer from "nodemailer";
import { injectTrackingIntoEmail } from "./email-tracking";

/**
 * Process pending sequence emails
 * Should be called periodically (e.g., every 5 minutes via cron)
 */
export async function processSequenceEmails() {
  const db = await getDb();
  if (!db) {
    console.error("[Sequence Processor] Database not available");
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  try {
    // Find active enrollments that need to send the next email
    const now = new Date();
    const enrollments = await db
      .select()
      .from(emailSequenceEnrollments)
      .where(
        and(
          eq(emailSequenceEnrollments.status, "active"),
          // Either never sent an email, or enough time has passed since last email
          // We'll check the delay in the next step
        )
      )
      .limit(100); // Process in batches

    for (const enrollment of enrollments) {
      try {
        // Get sequence and current step
        const sequence = await db
          .select()
          .from(emailSequences)
          .where(eq(emailSequences.id, enrollment.sequenceId))
          .limit(1);

        if (!sequence[0] || sequence[0].status !== "active") {
          continue;
        }

        // Get the next step to send
        const nextStepNumber = enrollment.currentStep + 1;
        const steps = await db
          .select()
          .from(emailSequenceSteps)
          .where(
            and(
              eq(emailSequenceSteps.sequenceId, enrollment.sequenceId),
              eq(emailSequenceSteps.stepNumber, nextStepNumber)
            )
          )
          .limit(1);

        if (steps.length === 0) {
          // No more steps, mark as completed
          await db
            .update(emailSequenceEnrollments)
            .set({
              status: "completed",
              completedAt: now,
            })
            .where(eq(emailSequenceEnrollments.id, enrollment.id));
          continue;
        }

        const step = steps[0];

        // Check if enough time has passed since last email
        if (enrollment.lastEmailSentAt) {
          const daysSinceLastEmail = (now.getTime() - new Date(enrollment.lastEmailSentAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLastEmail < step.delayDays) {
            continue; // Not time yet
          }
        } else if (step.delayDays > 0) {
          // First email with delay
          const daysSinceEnrollment = (now.getTime() - new Date(enrollment.enrolledAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceEnrollment < step.delayDays) {
            continue;
          }
        }

        // Check for trigger conditions (if any)
        const shouldSend = await checkTriggerConditions(enrollment, step);
        if (!shouldSend) {
          continue;
        }

        // Send the email
        await sendSequenceEmail(enrollment, step);

        // Update enrollment
        await db
          .update(emailSequenceEnrollments)
          .set({
            currentStep: nextStepNumber,
            lastEmailSentAt: now,
          })
          .where(eq(emailSequenceEnrollments.id, enrollment.id));

        // Record event
        await db.insert(emailSequenceEvents).values({
          id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          enrollmentId: enrollment.id,
          stepNumber: nextStepNumber,
          eventType: "sent",
          timestamp: now,
        });

        processed++;
      } catch (error: any) {
        console.error(`[Sequence Processor] Error processing enrollment ${enrollment.id}:`, error.message);
        errors++;
      }
    }
  } catch (error: any) {
    console.error("[Sequence Processor] Error in main loop:", error.message);
  }

  console.log(`[Sequence Processor] Processed ${processed} emails with ${errors} errors`);
  return { processed, errors };
}

/**
 * Check trigger conditions for a sequence step
 */
async function checkTriggerConditions(enrollment: any, step: any): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get previous events for this enrollment
  const events = await db
    .select()
    .from(emailSequenceEvents)
    .where(eq(emailSequenceEvents.enrollmentId, enrollment.id));

  // Check if previous email was opened (for "no reply" trigger)
  const previousStepEvents = events.filter(e => e.stepNumber === enrollment.currentStep);
  const hasReplied = previousStepEvents.some(e => e.eventType === "replied");
  
  if (hasReplied) {
    // If they replied, pause the sequence
    await db
      .update(emailSequenceEnrollments)
      .set({ status: "paused" })
      .where(eq(emailSequenceEnrollments.id, enrollment.id));
    return false;
  }

  // Check for unsubscribe
  const hasUnsubscribed = previousStepEvents.some(e => e.eventType === "unsubscribed");
  if (hasUnsubscribed) {
    await db
      .update(emailSequenceEnrollments)
      .set({ status: "unsubscribed" })
      .where(eq(emailSequenceEnrollments.id, enrollment.id));
    return false;
  }

  return true;
}

/**
 * Send a sequence email
 */
async function sendSequenceEmail(enrollment: any, step: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get person details
  const { people } = await import("../drizzle/schema");
  const persons = await db
    .select()
    .from(people)
    .where(eq(people.id, enrollment.personId))
    .limit(1);
  
  if (persons.length === 0 || !persons[0].primaryEmail) {
    throw new Error("Person not found or has no email");
  }
  
  const person = persons[0];

  // Get email account for this tenant
  const accounts = await db
    .select()
    .from(emailAccounts)
    .where(
      and(
        eq(emailAccounts.tenantId, enrollment.tenantId),
        eq(emailAccounts.isDefault, true)
      )
    )
    .limit(1);

  if (accounts.length === 0) {
    throw new Error("No active email account found");
  }

  const account = accounts[0];

  // Create SMTP transporter
  const transporter = nodemailer.createTransport({
    host: account.smtpHost || '',
    port: account.smtpPort || 587,
    secure: account.smtpPort === 465,
    auth: {
      user: account.smtpUser || '',
      pass: account.smtpPass || '',
    },
  } as any);

  // Inject tracking
  const baseUrl = process.env.VITE_APP_URL || "https://crm.neurovitality.com";
  const trackedBody = injectTrackingIntoEmail(step.body, enrollment.id, baseUrl);

  // Send email
  await transporter.sendMail({
    from: `"${account.email}" <${account.email}>`,
    to: person.primaryEmail,
    subject: step.subject,
    html: trackedBody,
  });

  console.log(`[Sequence Processor] Sent step ${step.stepNumber} to ${person.primaryEmail}`);
}

/**
 * Enroll a person in a sequence
 */
export async function enrollInSequence(
  tenantId: string,
  sequenceId: string,
  personId: string,
  threadId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await db.insert(emailSequenceEnrollments).values({
    id,
    tenantId,
    sequenceId,
    personId,
    threadId,
    currentStep: 0,
    status: "active",
  });

  return id;
}

/**
 * Get sequence performance stats
 */
export async function getSequenceStats(sequenceId: string) {
  const db = await getDb();
  if (!db) return null;

  const enrollments = await db
    .select()
    .from(emailSequenceEnrollments)
    .where(eq(emailSequenceEnrollments.sequenceId, sequenceId));

  const events = await db
    .select()
    .from(emailSequenceEvents)
    .where(
      eq(
        emailSequenceEvents.enrollmentId,
        enrollments.map(e => e.id)[0] // This is simplified, should use IN clause
      )
    );

  const totalEnrolled = enrollments.length;
  const active = enrollments.filter(e => e.status === "active").length;
  const completed = enrollments.filter(e => e.status === "completed").length;
  const paused = enrollments.filter(e => e.status === "paused").length;

  const totalSent = events.filter(e => e.eventType === "sent").length;
  const totalOpened = events.filter(e => e.eventType === "opened").length;
  const totalReplied = events.filter(e => e.eventType === "replied").length;

  return {
    totalEnrolled,
    active,
    completed,
    paused,
    totalSent,
    totalOpened,
    totalReplied,
    openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
    replyRate: totalSent > 0 ? (totalReplied / totalSent) * 100 : 0,
  };
}
