/**
 * Custom Email/Password Authentication with Mandatory 2FA
 * Replaces Manus OAuth with self-hosted authentication
 */

import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { getDb } from './db';
import { users, tenants } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

const SALT_ROUNDS = 12;

export interface SignupInput {
  email: string;
  password: string;
  name?: string;
  tenantName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface Setup2FAResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate backup codes for 2FA recovery
 */
function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Register a new user with email/password
 * Creates a new tenant if tenantName is provided
 */
export async function signup(input: SignupInput) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    throw new Error('Invalid email format');
  }
  
  // Validate password strength
  if (input.password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  // Check if user already exists
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  
  if (existingUsers.length > 0) {
    throw new Error('User with this email already exists');
  }
  
  // Create tenant if needed
  let tenantId: string;
  if (input.tenantName) {
    const tenantIdGenerated = randomBytes(16).toString('hex');
    await db.insert(tenants).values({
      id: tenantIdGenerated,
      name: input.tenantName,
    });
    tenantId = tenantIdGenerated;
  } else {
    // Use default tenant or first tenant
    const defaultTenants = await db.select().from(tenants).limit(1);
    if (defaultTenants.length === 0) {
      // Create default tenant
      const tenantIdGenerated = randomBytes(16).toString('hex');
      await db.insert(tenants).values({
        id: tenantIdGenerated,
        name: 'Default Organization',
      });
      tenantId = tenantIdGenerated;
    } else {
      tenantId = defaultTenants[0].id;
    }
  }
  
  // Hash password
  const passwordHash = await hashPassword(input.password);
  
  // Create user
  const userId = randomBytes(16).toString('hex');
  await db.insert(users).values({
    id: userId,
    tenantId,
    email: input.email,
    passwordHash,
    name: input.name || null,
    role: 'owner', // First user is owner
    twoFactorSecret: null,
    twoFactorEnabled: false, // Will be enabled during setup
    backupCodes: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    disabled: false,
  });
  
  return {
    userId,
    tenantId,
    email: input.email,
    requiresTwoFactorSetup: true,
  };
}

/**
 * Setup 2FA for a user (mandatory after signup)
 */
export async function setup2FA(userId: string): Promise<Setup2FAResult> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // Get user
  const userResults = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (userResults.length === 0) {
    throw new Error('User not found');
  }
  
  const user = userResults[0];
  
  // Generate 2FA secret
  const secret = speakeasy.generateSecret({
    name: `1twenty CRM (${user.email})`,
    issuer: '1twenty CRM',
  });
  
  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
  
  // Generate backup codes
  const backupCodes = generateBackupCodes();
  
  // Save secret and backup codes to database
  await db
    .update(users)
    .set({
      twoFactorSecret: secret.base32,
      backupCodes: backupCodes,
    })
    .where(eq(users.id, userId));
  
  return {
    secret: secret.base32,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * Verify 2FA code and enable 2FA
 */
export async function verify2FASetup(userId: string, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // Get user
  const userResults = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (userResults.length === 0) {
    throw new Error('User not found');
  }
  
  const user = userResults[0];
  
  if (!user.twoFactorSecret) {
    throw new Error('2FA not set up');
  }
  
  // Verify code
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 2, // Allow 2 time steps before/after
  });
  
  if (!verified) {
    throw new Error('Invalid 2FA code');
  }
  
  // Enable 2FA
  await db
    .update(users)
    .set({
      twoFactorEnabled: true,
    })
    .where(eq(users.id, userId));
  
  return true;
}

/**
 * Login with email/password
 * Returns user if password is correct, but requires 2FA verification
 */
export async function login(input: LoginInput) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // Find user by email
  const userResults = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  
  if (userResults.length === 0) {
    throw new Error('Invalid email or password');
  }
  
  const user = userResults[0];
  
  // Check if user is disabled
  if (user.disabled) {
    throw new Error('Account is disabled');
  }
  
  // Verify password
  const passwordValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new Error('Invalid email or password');
  }
  
  // Check if 2FA is enabled
  if (!user.twoFactorEnabled) {
    throw new Error('2FA setup required');
  }
  
  // If 2FA code is not provided, return pending status
  if (!input.twoFactorCode) {
    return {
      userId: user.id,
      email: user.email,
      requires2FA: true,
    };
  }
  
  // Verify 2FA code
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret!,
    encoding: 'base32',
    token: input.twoFactorCode,
    window: 2,
  });
  
  if (!verified) {
    // Check if it's a backup code
    if (user.backupCodes && user.backupCodes.includes(input.twoFactorCode)) {
      // Remove used backup code
      const updatedCodes = user.backupCodes.filter(c => c !== input.twoFactorCode);
      await db
        .update(users)
        .set({
          backupCodes: updatedCodes,
        })
        .where(eq(users.id, user.id));
    } else {
      throw new Error('Invalid 2FA code');
    }
  }
  
  // Return authenticated user
  return {
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
    authenticated: true,
  };
}

/**
 * Generate password reset token
 */
export async function generatePasswordResetToken(email: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // Find user
  const userResults = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (userResults.length === 0) {
    // Don't reveal if user exists
    return '';
  }
  
  const user = userResults[0];
  
  // Generate token
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 hour
  
  // Save token
  await db
    .update(users)
    .set({
      passwordResetToken: token,
      passwordResetExpires: expires,
    })
    .where(eq(users.id, user.id));
  
  return token;
}

/**
 * Reset password using token
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // Find user with valid token
  const userResults = await db
    .select()
    .from(users)
    .where(eq(users.passwordResetToken, token))
    .limit(1);
  
  if (userResults.length === 0) {
    throw new Error('Invalid or expired reset token');
  }
  
  const user = userResults[0];
  
  // Check if token is expired
  if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw new Error('Reset token has expired');
  }
  
  // Validate new password
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  // Hash new password
  const passwordHash = await hashPassword(newPassword);
  
  // Update password and clear reset token
  await db
    .update(users)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    })
    .where(eq(users.id, user.id));
  
  return true;
}
