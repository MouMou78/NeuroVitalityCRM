import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { accounts, people } from '../drizzle/schema.js';
import { v4 as uuidv4 } from 'uuid';

const GUEST_TENANT_ID = 'guest-tenant-id';

const sampleAccounts = [
  {
    name: 'Acme Corporation',
    domain: 'acme.example.com',
    industry: 'Technology',
    employees: '500-1000',
    revenue: '$50M-$100M',
    headquarters: 'San Francisco, CA',
    lifecycleStage: 'Opportunity',
  },
  {
    name: 'Global Tech Solutions',
    domain: 'globaltech.example.com',
    industry: 'Software',
    employees: '1000-5000',
    revenue: '$100M-$500M',
    headquarters: 'New York, NY',
    lifecycleStage: 'SQL',
  },
  {
    name: 'Innovation Labs',
    domain: 'innovationlabs.example.com',
    industry: 'Research & Development',
    employees: '50-200',
    revenue: '$10M-$50M',
    headquarters: 'Austin, TX',
    lifecycleStage: 'MQL',
  },
  {
    name: 'Enterprise Systems Inc',
    domain: 'enterprisesystems.example.com',
    industry: 'Enterprise Software',
    employees: '5000+',
    revenue: '$500M+',
    headquarters: 'Seattle, WA',
    lifecycleStage: 'Lead',
  },
  {
    name: 'StartupHub Ventures',
    domain: 'startuphub.example.com',
    industry: 'Venture Capital',
    employees: '10-50',
    revenue: '$1M-$10M',
    headquarters: 'Palo Alto, CA',
    lifecycleStage: 'ClosedWon',
  },
];

const samplePeople = [
  {
    fullName: 'John Smith',
    primaryEmail: 'john.smith@acme.example.com',
    title: 'VP of Sales',
    companyName: 'Acme Corporation',
    buyingRole: 'Decision Maker',
  },
  {
    fullName: 'Sarah Johnson',
    primaryEmail: 'sarah.johnson@acme.example.com',
    title: 'Sales Director',
    companyName: 'Acme Corporation',
    buyingRole: 'Champion',
  },
  {
    fullName: 'Michael Chen',
    primaryEmail: 'michael.chen@globaltech.example.com',
    title: 'CTO',
    companyName: 'Global Tech Solutions',
    buyingRole: 'Decision Maker',
  },
  {
    fullName: 'Emily Davis',
    primaryEmail: 'emily.davis@globaltech.example.com',
    title: 'Engineering Manager',
    companyName: 'Global Tech Solutions',
    buyingRole: 'Influencer',
  },
  {
    fullName: 'David Wilson',
    primaryEmail: 'david.wilson@innovationlabs.example.com',
    title: 'Research Lead',
    companyName: 'Innovation Labs',
    buyingRole: 'User',
  },
  {
    fullName: 'Lisa Anderson',
    primaryEmail: 'lisa.anderson@enterprisesystems.example.com',
    title: 'Procurement Manager',
    companyName: 'Enterprise Systems Inc',
    buyingRole: 'Blocker',
  },
  {
    fullName: 'Robert Taylor',
    primaryEmail: 'robert.taylor@startuphub.example.com',
    title: 'Managing Partner',
    companyName: 'StartupHub Ventures',
    buyingRole: 'Decision Maker',
  },
  {
    fullName: 'Jennifer Martinez',
    primaryEmail: 'jennifer.martinez@startuphub.example.com',
    title: 'Investment Analyst',
    companyName: 'StartupHub Ventures',
    buyingRole: 'Influencer',
  },
];

async function seedGuestData() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log('Starting seed data generation for guest tenant...');

  try {
    // Create accounts
    const accountMap = new Map();
    for (const accountData of sampleAccounts) {
      const accountId = uuidv4();
      await db.insert(accounts).values({
        id: accountId,
        tenantId: GUEST_TENANT_ID,
        ...accountData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      accountMap.set(accountData.name, accountId);
      console.log(`Created account: ${accountData.name}`);
    }

    // Create people linked to accounts
    for (const personData of samplePeople) {
      const accountId = accountMap.get(personData.companyName);
      // Split fullName into firstName and lastName
      const nameParts = personData.fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      await db.insert(people).values({
        id: uuidv4(),
        tenantId: GUEST_TENANT_ID,
        fullName: personData.fullName,
        firstName: firstName,
        lastName: lastName,
        primaryEmail: personData.primaryEmail,
        roleTitle: personData.title,
        buyingRole: personData.buyingRole,
        companyName: personData.companyName,
        accountId: accountId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Created person: ${personData.fullName}`);
    }

    console.log('Seed data generation complete!');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedGuestData();
