import { describe, it, expect } from "vitest";
import { getGoogleAuthUrl, generateOAuthState, encryptToken, decryptToken } from "./googleOAuth";

describe("Google OAuth Integration", () => {
  describe("generateOAuthState", () => {
    it("should generate a random state string", () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();
      
      expect(state1).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(state2).toHaveLength(64);
      expect(state1).not.toBe(state2); // Should be unique
    });
  });

  describe("getGoogleAuthUrl", () => {
    it("should generate a valid Google OAuth URL", () => {
      const redirectUri = "https://example.com/callback";
      const state = "test-state-123";
      
      const authUrl = getGoogleAuthUrl(redirectUri, state);
      
      expect(authUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly");
      expect(authUrl).toContain("access_type=offline");
      expect(authUrl).toContain("prompt=consent");
    });
  });

  describe("Token encryption/decryption", () => {
    it("should encrypt and decrypt tokens correctly", () => {
      const originalToken = "test-access-token-12345";
      
      const encrypted = encryptToken(originalToken);
      expect(encrypted).not.toBe(originalToken);
      expect(encrypted).toContain(":"); // Should have iv:authTag:encrypted format
      
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(originalToken);
    });

    it("should produce different encrypted values for the same token", () => {
      const token = "test-token";
      
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);
      
      // Different IVs should produce different encrypted values
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(decryptToken(encrypted1)).toBe(token);
      expect(decryptToken(encrypted2)).toBe(token);
    });

    it("should throw error for invalid encrypted token format", () => {
      expect(() => decryptToken("invalid-format")).toThrow("Invalid encrypted token format");
    });
  });
});
