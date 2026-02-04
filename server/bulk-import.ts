import { getDb } from "./db";
import { people, accounts } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface CSVRow {
  [key: string]: string;
}

export interface FieldMapping {
  csvColumn: string;
  crmField: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
    data: CSVRow;
  }>;
}

/**
 * Parse CSV content into rows
 */
export function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error("CSV must have at least a header row and one data row");
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: CSVRow = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }

  return rows;
}

/**
 * Validate a contact row
 */
export function validateContactRow(row: CSVRow, mapping: FieldMapping[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for required fields
  const emailMapping = mapping.find(m => m.crmField === 'primaryEmail');
  if (!emailMapping || !row[emailMapping.csvColumn]) {
    errors.push("Email is required");
  } else {
    // Basic email validation
    const email = row[emailMapping.csvColumn];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Invalid email format: ${email}`);
    }
  }

  const nameMapping = mapping.find(m => m.crmField === 'fullName');
  if (!nameMapping || !row[nameMapping.csvColumn]) {
    errors.push("Name is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check for duplicate contacts
 */
export async function checkDuplicate(tenantId: string, email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const existing = await db
    .select()
    .from(people)
    .where(and(eq(people.tenantId, tenantId), eq(people.primaryEmail, email)))
    .limit(1);

  return existing.length > 0;
}

/**
 * Find or create account by domain
 */
export async function findOrCreateAccount(tenantId: string, email: string): Promise<string | null> {
  const domain = email.split('@')[1];
  if (!domain) return null;

  const db = await getDb();
  if (!db) return null;

  // Try to find existing account
  const existing = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, tenantId), eq(accounts.domain, domain)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new account
  const accountId = nanoid();
  await db.insert(accounts).values({
    id: accountId,
    tenantId,
    name: domain.split('.')[0], // Use domain name as company name
    domain,
  });

  return accountId;
}

/**
 * Import contacts from CSV
 */
export async function importContacts(
  tenantId: string,
  rows: CSVRow[],
  mapping: FieldMapping[],
  skipDuplicates: boolean = true
): Promise<ImportResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    try {
      // Validate row
      const validation = validateContactRow(row, mapping);
      if (!validation.valid) {
        result.errors.push({
          row: i + 2, // +2 because of header and 0-indexing
          error: validation.errors.join(', '),
          data: row,
        });
        result.skipped++;
        continue;
      }

      // Map fields
      const contactData: any = {
        tenantId,
      };

      for (const map of mapping) {
        const value = row[map.csvColumn];
        if (value) {
          contactData[map.crmField] = value;
        }
      }

      // Check for duplicates
      if (skipDuplicates) {
        const isDuplicate = await checkDuplicate(tenantId, contactData.primaryEmail);
        if (isDuplicate) {
          result.skipped++;
          continue;
        }
      }

      // Find or create account
      if (contactData.primaryEmail) {
        const accountId = await findOrCreateAccount(tenantId, contactData.primaryEmail);
        if (accountId) {
          contactData.accountId = accountId;
        }
      }

      // Insert contact
      const id = nanoid();
      await db.insert(people).values({ id, ...contactData });
      result.imported++;

    } catch (error: any) {
      result.errors.push({
        row: i + 2,
        error: error.message,
        data: row,
      });
      result.skipped++;
    }
  }

  return result;
}

/**
 * Get available CRM fields for mapping
 */
export function getAvailableCRMFields(): Array<{ field: string; label: string; required: boolean }> {
  return [
    { field: 'fullName', label: 'Full Name', required: true },
    { field: 'primaryEmail', label: 'Email', required: true },
    { field: 'title', label: 'Job Title', required: false },
    { field: 'phone', label: 'Phone', required: false },
    { field: 'linkedinUrl', label: 'LinkedIn URL', required: false },
    { field: 'location', label: 'Location', required: false },
  ];
}
