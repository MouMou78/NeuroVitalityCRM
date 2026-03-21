import { getDb } from "./db";
import { users, people, accounts, deals, events, emailSequences, emailSequenceEnrollments } from "../drizzle/schema";
import { hash } from "bcrypt";

async function seedDemoData() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  console.log("🌱 Seeding demo data...");

  const tenantId = "demo-tenant";

  // Create demo users (Sales Managers)
  console.log("Creating demo users...");
  const hashedPassword = await hash("password123", 10);
  
  const demoUsers = await db.insert(users).values([
    {
      email: "sarah.manager@neurovitalityltd.com",
      password: hashedPassword,
      fullName: "Sarah Johnson",
      role: "Sales Manager",
      tenantId,
    },
    {
      email: "mike.manager@neurovitalityltd.com",
      password: hashedPassword,
      fullName: "Mike Chen",
      role: "Sales Manager",
      tenantId,
    },
    {
      email: "lisa.rep@neurovitalityltd.com",
      password: hashedPassword,
      fullName: "Lisa Martinez",
      role: "Sales Representative",
      tenantId,
    },
  ]).returning();

  console.log(`✓ Created ${demoUsers.length} demo users`);

  // Create demo accounts (Coach/Creator businesses)
  console.log("Creating demo accounts...");
  const demoAccounts = await db.insert(accounts).values([
    {
      name: "Wellness Warriors Coaching",
      domain: "wellnesswarriors.com",
      industry: "Health & Wellness Coaching",
      employeeCount: "1-10",
      tenantId,
    },
    {
      name: "Business Growth Academy",
      domain: "businessgrowthacademy.com",
      industry: "Business Coaching",
      employeeCount: "11-50",
      tenantId,
    },
    {
      name: "Fitness First Online",
      domain: "fitnessfirstonline.com",
      industry: "Fitness Coaching",
      employeeCount: "1-10",
      tenantId,
    },
    {
      name: "Creative Course Creators",
      domain: "creativecoursecreators.com",
      industry: "Online Education",
      employeeCount: "1-10",
      tenantId,
    },
  ]).returning();

  console.log(`✓ Created ${demoAccounts.length} demo accounts`);

  // Create demo contacts (Coaches & Creators)
  console.log("Creating demo contacts...");
  const demoContacts = await db.insert(people).values([
    {
      fullName: "Emma Thompson",
      email: "emma@wellnesswarriors.com",
      title: "Life Coach",
      companyName: "Wellness Warriors Coaching",
      accountId: demoAccounts[0].id,
      phone: "+1-555-0101",
      fitTier: "A",
      intentLevel: "High",
      combinedScore: 85,
      tenantId,
    },
    {
      fullName: "David Park",
      email: "david@businessgrowthacademy.com",
      title: "Business Coach",
      companyName: "Business Growth Academy",
      accountId: demoAccounts[1].id,
      phone: "+1-555-0102",
      fitTier: "A",
      intentLevel: "Medium",
      combinedScore: 75,
      tenantId,
    },
    {
      fullName: "Sophie Anderson",
      email: "sophie@fitnessfirstonline.com",
      title: "Fitness Coach",
      companyName: "Fitness First Online",
      accountId: demoAccounts[2].id,
      phone: "+1-555-0103",
      fitTier: "B",
      intentLevel: "High",
      combinedScore: 70,
      tenantId,
    },
    {
      fullName: "Marcus Williams",
      email: "marcus@creativecoursecreators.com",
      title: "Course Creator",
      companyName: "Creative Course Creators",
      accountId: demoAccounts[3].id,
      phone: "+1-555-0104",
      fitTier: "A",
      intentLevel: "Low",
      combinedScore: 60,
      tenantId,
    },
    {
      fullName: "Rachel Green",
      email: "rachel@wellnesscoach.com",
      title: "Wellness Coach",
      companyName: "Independent",
      phone: "+1-555-0105",
      fitTier: "B",
      intentLevel: "Medium",
      combinedScore: 55,
      tenantId,
    },
  ]).returning();

  console.log(`✓ Created ${demoContacts.length} demo contacts`);

  // Create demo deals
  console.log("Creating demo deals...");
  const demoDeals = await db.insert(deals).values([
    {
      title: "NeuroVitality - Wellness Warriors",
      value: 2500,
      stage: "Proposal",
      probability: 60,
      expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      accountId: demoAccounts[0].id,
      contactId: demoContacts[0].id,
      ownerId: demoUsers[0].id,
      tenantId,
    },
    {
      title: "NeuroVitality - Business Growth",
      value: 5000,
      stage: "Negotiation",
      probability: 75,
      expectedCloseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      accountId: demoAccounts[1].id,
      contactId: demoContacts[1].id,
      ownerId: demoUsers[1].id,
      tenantId,
    },
    {
      title: "NeuroVitality - Fitness First",
      value: 1500,
      stage: "Discovery",
      probability: 30,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      accountId: demoAccounts[2].id,
      contactId: demoContacts[2].id,
      ownerId: demoUsers[0].id,
      tenantId,
    },
  ]).returning();

  console.log(`✓ Created ${demoDeals.length} demo deals`);

  // Create demo events (meetings)
  console.log("Creating demo events...");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  await db.insert(events).values([
    {
      title: "Demo Call - Emma Thompson",
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 30 * 60 * 1000), // 30 minutes
      type: "meeting",
      location: "Google Meet",
      userId: demoUsers[0].id,
      contactId: demoContacts[0].id,
      tenantId,
    },
    {
      title: "Follow-up - David Park",
      startTime: nextWeek,
      endTime: new Date(nextWeek.getTime() + 30 * 60 * 1000), // 30 minutes
      type: "meeting",
      location: "Google Meet",
      userId: demoUsers[1].id,
      contactId: demoContacts[1].id,
      tenantId,
    },
  ]);

  console.log("✓ Created demo events");

  // Create demo sequence
  console.log("Creating demo sequence...");
  const demoSequence = await db.insert(emailSequences).values({
    name: "NeuroVitality Outreach",
    description: "Initial outreach sequence for coaches and creators",
    status: "active",
    createdBy: demoUsers[0].id,
    tenantId,
  }).returning();

  // Enroll contacts in sequence
  await db.insert(emailSequenceEnrollments).values([
    {
      sequenceId: demoSequence[0].id,
      contactId: demoContacts[3].id,
      currentStep: 2,
      status: "active",
      enrolledBy: demoUsers[2].id,
      tenantId,
    },
    {
      sequenceId: demoSequence[0].id,
      contactId: demoContacts[4].id,
      currentStep: 1,
      status: "active",
      enrolledBy: demoUsers[2].id,
      tenantId,
    },
  ]);

  console.log("✓ Created demo sequence with enrollments");

  console.log("\n✅ Demo data seeding complete!");
  console.log("\nDemo Users:");
  console.log("  - sarah.manager@neurovitalityltd.com / password123 (Sales Manager)");
  console.log("  - mike.manager@neurovitalityltd.com / password123 (Sales Manager)");
  console.log("  - lisa.rep@neurovitalityltd.com / password123 (Sales Representative)");
  console.log("\nYou can now log in with any of these accounts.");
}

// Run the seed function
seedDemoData()
  .then(() => {
    console.log("Seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding data:", error);
    process.exit(1);
  });
