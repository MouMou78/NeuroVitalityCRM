import axios from "axios";
import crypto from "crypto";
import { ENV as env } from "./_core/env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Generate OAuth authorization URL for Google Calendar
 */
export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleOAuthClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline", // Request refresh token
    prompt: "consent", // Force consent to ensure refresh_token is returned
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  try {
    const response = await axios.post<GoogleTokenResponse>(
      GOOGLE_TOKEN_URL,
      {
        code,
        client_id: env.googleOAuthClientId,
        client_secret: env.googleOAuthClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Failed to exchange code for tokens:", error.response?.data || error.message);
    throw new Error("Failed to obtain Google Calendar access tokens");
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  try {
    const response = await axios.post<GoogleTokenResponse>(
      GOOGLE_TOKEN_URL,
      {
        refresh_token: refreshToken,
        client_id: env.googleOAuthClientId,
        client_secret: env.googleOAuthClientSecret,
        grant_type: "refresh_token",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Failed to refresh access token:", error.response?.data || error.message);
    throw new Error("Failed to refresh Google Calendar access token");
  }
}

/**
 * Generate a secure random state parameter for OAuth flow
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Encrypt sensitive token data before storing in database
 */
export function encryptToken(token: string): string {
  // Simple encryption using AES-256-GCM
  const algorithm = "aes-256-gcm";
  const key = crypto.scryptSync(env.jwtSecret, "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  
  // Return iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt token data retrieved from database
 */
export function decryptToken(encryptedToken: string): string {
  const algorithm = "aes-256-gcm";
  const key = crypto.scryptSync(env.jwtSecret, "salt", 32);
  
  const parts = encryptedToken.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }
  
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
