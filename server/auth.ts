import bcrypt from "bcrypt";
import { TOTP, generateSecret } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a new TOTP secret for 2FA
 */
export function generateTwoFactorSecret(): string {
  return generateSecret();
}

/**
 * Generate a QR code URL for TOTP setup
 */
export async function generateQRCode(email: string, secret: string): Promise<string> {
  const otpauth = `otpauth://totp/KompassCRM:${encodeURIComponent(email)}?secret=${secret}&issuer=KompassCRM`;
  return QRCode.toDataURL(otpauth);
}

/**
 * Verify a TOTP token
 */
export async function verifyTwoFactorToken(token: string, secret: string): Promise<boolean> {
  try {
    const totp = new TOTP({ secret });
    const result = await totp.verify(token);
    return result.valid;
  } catch (error) {
    return false;
  }
}

/**
 * Generate backup codes for 2FA recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash backup codes for storage
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(code => hashPassword(code)));
}

/**
 * Verify a backup code against hashed codes
 */
export async function verifyBackupCode(code: string, hashedCodes: string[]): Promise<boolean> {
  for (const hashedCode of hashedCodes) {
    if (await verifyPassword(code, hashedCode)) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a password reset token
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validate password strength
 * Returns error message if invalid, null if valid
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  return null;
}
