import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db";
import { scoreContact } from "./lead-scoring";

describe("Email Sequences & Event Tracking", () => {
  const testTenantId = "test-tenant-sequences";
  const testPersonId = "test-person-sequences";
  
  describe("Email Sequence Creation", () => {
    it("should create a sequence with steps", async () => {
      const sequence = await db.createEmailSequence(testTenantId, {
        name: "Test Outbound Sequence",
        description: "3-step outbound campaign",
        status: "active",
      });
      
      expect(sequence).toBeDefined();
      expect(sequence.name).toBe("Test Outbound Sequence");
      expect(sequence.status).toBe("active");
      
      // Create steps
      const step1 = await db.createEmailSequenceStep(sequence.id, {
        stepNumber: 1,
        subject: "Introduction",
        body: "Hello, I wanted to reach out...",
        delayDays: 0,
      });
      
      const step2 = await db.createEmailSequenceStep(sequence.id, {
        stepNumber: 2,
        subject: "Follow-up",
        body: "Just following up on my previous email...",
        delayDays: 3,
      });
      
      expect(step1.stepNumber).toBe(1);
      expect(step2.stepNumber).toBe(2);
      expect(step2.delayDays).toBe(3);
    });
    
    it("should retrieve sequences by tenant", async () => {
      const sequences = await db.getEmailSequencesByTenant(testTenantId);
      expect(sequences.length).toBeGreaterThan(0);
      expect(sequences[0].tenantId).toBe(testTenantId);
    });
    
    it("should retrieve sequence steps in order", async () => {
      const sequences = await db.getEmailSequencesByTenant(testTenantId);
      const sequence = sequences[0];
      
      const steps = await db.getEmailSequenceSteps(sequence.id);
      expect(steps.length).toBeGreaterThan(0);
      
      // Steps should be ordered by stepNumber
      for (let i = 0; i < steps.length - 1; i++) {
        expect(steps[i].stepNumber).toBeLessThan(steps[i + 1].stepNumber);
      }
    });
  });
  
  describe("Event Tracking", () => {
    it("should create tracking events", async () => {
      const event = await db.createTrackingEvent(testTenantId, {
        personId: testPersonId,
        eventType: "email_opened",
        eventData: { sequenceId: "seq-123", stepNumber: 1 },
      });
      
      expect(event).toBeDefined();
      expect(event.eventType).toBe("email_opened");
      expect(event.personId).toBe(testPersonId);
    });
    
    it("should retrieve events by person", async () => {
      const events = await db.getTrackingEventsByPerson(testTenantId, testPersonId);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].personId).toBe(testPersonId);
    });
    
    it("should order events by timestamp descending", async () => {
      const events = await db.getTrackingEventsByPerson(testTenantId, testPersonId);
      
      for (let i = 0; i < events.length - 1; i++) {
        const current = new Date(events[i].timestamp).getTime();
        const next = new Date(events[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });
  
  describe("Intent Scoring with Events", () => {
    it("should calculate intent score from email events", async () => {
      const person = {
        id: testPersonId,
        primaryEmail: "test@example.com",
        seniority: "Director",
        region: "UK&I",
      };
      
      const account = {
        id: "test-account",
        industry: "SaaS",
        employees: "51-200",
      };
      
      const events = [
        { type: "email_opened", timestamp: new Date() },
        { type: "email_clicked", timestamp: new Date() },
        { type: "demo_request", timestamp: new Date() },
      ];
      
      const scores = await scoreContact(person, account, events);
      
      expect(scores.intentScore).toBeGreaterThan(0);
      expect(scores.intentTier).toMatch(/Hot|Warm|Cold/);
    });
    
    it("should apply event decay to older events", async () => {
      const person = {
        id: testPersonId,
        primaryEmail: "test@example.com",
      };
      
      const recentEvent = new Date();
      const oldEvent = new Date();
      oldEvent.setDate(oldEvent.getDate() - 30); // 30 days ago
      
      const recentEvents = [
        { type: "email_opened", timestamp: recentEvent },
      ];
      
      const oldEvents = [
        { type: "email_opened", timestamp: oldEvent },
      ];
      
      const recentScores = await scoreContact(person, null, recentEvents);
      const oldScores = await scoreContact(person, null, oldEvents);
      
      // Recent events should score higher due to decay
      expect(recentScores.intentScore).toBeGreaterThan(oldScores.intentScore);
    });
    
    it("should combine fit and intent scores correctly", async () => {
      const person = {
        id: testPersonId,
        primaryEmail: "test@example.com",
        seniority: "C-Level",
        region: "North America",
      };
      
      const account = {
        id: "test-account",
        industry: "SaaS",
        employees: "201-500",
      };
      
      const events = [
        { type: "pricing_view", timestamp: new Date() },
        { type: "demo_request", timestamp: new Date() },
      ];
      
      const scores = await scoreContact(person, account, events);
      
      // Combined score should be weighted (60% fit, 40% intent)
      const expectedCombined = Math.round(scores.fitScore * 0.6 + scores.intentScore * 0.4);
      expect(scores.combinedScore).toBe(expectedCombined);
    });
    
    it("should provide score reasons", async () => {
      const person = {
        id: testPersonId,
        primaryEmail: "test@example.com",
        seniority: "VP",
      };
      
      const account = {
        id: "test-account",
        industry: "Technology",
      };
      
      const events = [
        { type: "email_replied", timestamp: new Date() },
      ];
      
      const scores = await scoreContact(person, account, events);
      
      expect(scores.scoreReasons).toBeDefined();
      expect(Array.isArray(scores.scoreReasons)).toBe(true);
      expect(scores.scoreReasons.length).toBeGreaterThan(0);
    });
  });
  
  describe("Tier Calculations", () => {
    it("should assign correct fit tier", async () => {
      const highFitPerson = {
        id: testPersonId,
        primaryEmail: "test@example.com",
        seniority: "C-Level",
        region: "UK&I",
      };
      
      const highFitAccount = {
        id: "test-account",
        industry: "SaaS",
        employees: "201-500",
      };
      
      const scores = await scoreContact(highFitPerson, highFitAccount, []);
      
      expect(scores.fitScore).toBeGreaterThanOrEqual(70);
      expect(scores.fitTier).toBe("A");
    });
    
    it("should assign correct intent tier for hot leads", async () => {
      const person = {
        id: testPersonId,
        primaryEmail: "test@example.com",
      };
      
      const hotEvents = [
        { type: "demo_request", timestamp: new Date() },
        { type: "pricing_view", timestamp: new Date() },
        { type: "email_replied", timestamp: new Date() },
      ];
      
      const scores = await scoreContact(person, null, hotEvents);
      
      expect(scores.intentScore).toBeGreaterThanOrEqual(70);
      expect(scores.intentTier).toBe("Hot");
    });
  });
});
