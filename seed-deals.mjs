// Development-only seed script for sample deal data
// This script only runs in development mode and will not affect production

import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";

// Check if running in development
if (process.env.NODE_ENV === "production") {
  console.log("Skipping seed script in production mode");
  process.exit(0);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

// Get tenant ID from environment or use demo tenant
const TENANT_ID = process.env.OWNER_OPEN_ID || "demo-tenant";

// Sample deal data
const sampleDeals = [
  {
    title: "Enterprise Software License - Acme Corp",
    value: 125000,
    stage: "negotiation",
    probability: 75,
    expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    contactName: "John Smith",
    companyName: "Acme Corporation"
  },
  {
    title: "Cloud Migration Project - TechStart",
    value: 85000,
    stage: "proposal",
    probability: 60,
    expectedCloseDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
    contactName: "Sarah Johnson",
    companyName: "TechStart Inc"
  },
  {
    title: "Annual Support Contract - Global Tech",
    value: 45000,
    stage: "qualified",
    probability: 40,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
    contactName: "Michael Chen",
    companyName: "Global Tech Solutions"
  },
  {
    title: "Consulting Services - Innovation Labs",
    value: 65000,
    stage: "discovery",
    probability: 25,
    expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 1.5 months from now
    contactName: "David Wilson",
    companyName: "Innovation Labs"
  },
  {
    title: "Training Program - Enterprise Systems",
    value: 35000,
    stage: "closed-won",
    probability: 100,
    expectedCloseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago (closed)
    contactName: "Lisa Anderson",
    companyName: "Enterprise Systems Inc"
  },
  {
    title: "Custom Development - StartupHub",
    value: 95000,
    stage: "proposal",
    probability: 55,
    expectedCloseDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 4 weeks from now
    contactName: "Jennifer Martinez",
    companyName: "StartupHub Ventures"
  }
];

async function seedDeals() {
  console.log("Starting to seed sample deal data...");
  console.log(`Using tenant ID: ${TENANT_ID}`);
  
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: "default" });
  
  try {
    // Create deals and associated moments
    for (const dealData of sampleDeals) {
      const dealId = randomUUID();
      const threadId = randomUUID();
      
      // Create thread for the deal
      await db.insert(schema.threads).values({
        id: threadId,
        tenantId: TENANT_ID,
        title: dealData.title,
        personId: randomUUID(), // Create a dummy person ID
        source: "manual",
        intent: "deal",
        status: "active",
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Random date within last 60 days
      });
      
      // Create deal
      await db.insert(schema.deals).values({
        id: dealId,
        tenantId: TENANT_ID,
        name: dealData.title,
        value: dealData.value,
        stageId: dealData.stage,
        probability: dealData.probability,
        expectedCloseDate: dealData.expectedCloseDate,
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      });
      
      // Create activity moments for the deal
      const momentTypes = ["email_sent", "reply_received", "meeting_held", "call_completed"];
      const numMoments = Math.floor(Math.random() * 8) + 3; // 3-10 moments per deal
      
      for (let i = 0; i < numMoments; i++) {
        const momentType = momentTypes[Math.floor(Math.random() * momentTypes.length)];
        const daysAgo = Math.floor(Math.random() * 45); // Within last 45 days
        
        await db.insert(schema.moments).values({
          id: randomUUID(),
          tenantId: TENANT_ID,
          threadId,
          personId: randomUUID(), // Dummy person ID
          source: "manual",
          type: momentType,
          timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          metadata: JSON.stringify({
            dealId,
            dealTitle: dealData.title,
            contactName: dealData.contactName,
            companyName: dealData.companyName
          })
        });
      }
      
      console.log(`✓ Created deal: ${dealData.title} ($${dealData.value.toLocaleString()})`);
    }
    
    console.log("\n✅ Successfully seeded sample deal data!");
    console.log(`Total deals created: ${sampleDeals.length}`);
    console.log("\nNote: This data is for development only and will not appear in production.");
    
  } catch (error) {
    console.error("Error seeding deals:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedDeals();
