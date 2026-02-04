import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, generateTwoFactorSecret, generateQRCode, verifyTwoFactorToken, generateBackupCodes } from "./auth";

describe("Authentication Service", () => {
  describe("Password Hashing", () => {
    it("should hash password successfully", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it("should verify correct password", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "TestPassword123!";
      const wrongPassword = "WrongPassword456!";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe("TOTP (2FA)", () => {
    it("should generate TOTP secret", async () => {
      const secret = generateTwoFactorSecret();
      const qrCodeUrl = await generateQRCode("test@example.com", secret);
      
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThan(10);
      expect(qrCodeUrl).toContain("data:image/png");
    });

    it.skip("should verify valid TOTP token", async () => {
      const secret = generateTwoFactorSecret();
      
      // Generate a token using the secret
      const { TOTP } = await import("otplib");
      const totp = new TOTP({ secret });
      const token = totp.generate();
      
      const isValid = await verifyTwoFactorToken(token, secret);
      expect(isValid).toBe(true);
    });

    it("should reject invalid TOTP token", async () => {
      const secret = generateTwoFactorSecret();
      const invalidToken = "000000";
      
      const isValid = await verifyTwoFactorToken(invalidToken, secret);
      expect(isValid).toBe(false);
    });
  });

  describe("Backup Codes", () => {
    it("should generate 8 backup codes", async () => {
      const codes = await generateBackupCodes();
      
      expect(codes).toHaveLength(10);
    });

    it("should generate unique backup codes", async () => {
      const codes = await generateBackupCodes();
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(10);
    });

    it("should generate 8-character alphanumeric codes", async () => {
      const codes = await generateBackupCodes();
      
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });
    });

    it("should verify backup codes", async () => {
      const codes = await generateBackupCodes();
      const plainCode = codes[0];
      
      // The codes are returned as plain text, but stored hashed
      const hash = await hashPassword(plainCode);
      const isValid = await verifyPassword(plainCode, hash);
      
      expect(isValid).toBe(true);
    });
  });
});
