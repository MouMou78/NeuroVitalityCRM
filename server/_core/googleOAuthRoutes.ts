import { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import { getGoogleAuthUrl, exchangeCodeForTokens, generateOAuthState, encryptToken } from "../googleOAuth";
import { getDb } from "../db";
import { integrations } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Store OAuth states temporarily (in production, use Redis or database)
const oauthStates = new Map<string, { tenantId: string; createdAt: number }>();

// Clean up expired states every 10 minutes
setInterval(() => {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  for (const [state, data] of Array.from(oauthStates.entries())) {
    if (now - data.createdAt > tenMinutes) {
      oauthStates.delete(state);
    }
  }
}, 10 * 60 * 1000);

export function registerGoogleOAuthRoutes(app: Express) {
  /**
   * Initiate Google OAuth flow
   * GET /api/oauth/google?tenantId=xxx
   */
  app.get("/api/oauth/google", async (req: Request, res: Response) => {
    try {
      // Get tenant ID from authenticated session
      const { createContext } = await import('./context');
      const ctx = await createContext({ req, res, info: {} as any });
      
      const requestHost = req.get("host");
      console.log(`[Google OAuth Start] Request host: ${requestHost}`);
      console.log(`[Google OAuth Start] User: ${ctx.user?.email || 'NOT AUTHENTICATED'}`);
      console.log(`[Google OAuth Start] Tenant ID: ${ctx.user?.tenantId || 'MISSING'}`);
      
      if (!ctx.user || !ctx.user.tenantId) {
        console.error("[Google OAuth Start] User not authenticated or missing tenantId");
        return res.status(401).send('Please log in first before connecting Google Calendar');
      }

      const tenantId = ctx.user.tenantId;

      // Generate secure state parameter
      const state = generateOAuthState();
      oauthStates.set(state, { tenantId, createdAt: Date.now() });
      
      console.log(`[Google OAuth Start] Generated state: ${state}, stored tenantId: ${tenantId}`);

      // Use hardcoded redirect URI from environment variable
      const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || "https://yourcrm.example.com/api/oauth/google/callback";
      console.log(`[Google OAuth Start] Using redirect_uri: ${redirectUri}`);

      // Generate Google authorization URL
      const authUrl = getGoogleAuthUrl(redirectUri, state);

      // Redirect user to Google consent screen
      res.redirect(authUrl);
    } catch (error: any) {
      console.error("[Google OAuth] Failed to initiate flow:", error);
      res.status(500).json({ error: "Failed to initiate Google OAuth flow" });
    }
  });

  /**
   * Handle Google OAuth callback
   * GET /api/oauth/google/callback?code=xxx&state=xxx
   */
  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;
      const error = req.query.error as string;

      // Handle user denial
      if (error === "access_denied") {
        return res.redirect("/integrations?google_error=access_denied");
      }

      if (!code || !state) {
        return res.status(400).json({ error: "code and state are required" });
      }

      // Verify state parameter
      const stateData = oauthStates.get(state);
      const requestHost = req.get("host");
      
      console.log(`[Google OAuth Callback] Request host: ${requestHost}, state: ${state}, stateData found: ${!!stateData}`);
      
      if (!stateData) {
        console.error(`[Google OAuth Callback] Invalid or expired state: ${state}`);
        return res.status(400).json({ error: "Invalid or expired state parameter" });
      }

      // Clean up used state
      oauthStates.delete(state);

      const { tenantId } = stateData;
      console.log(`[Google OAuth Callback] Restored tenantId from state: ${tenantId}`);

      // Use hardcoded redirect URI (must match the one used in authorization request)
      const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || "https://yourcrm.example.com/api/oauth/google/callback";
      console.log(`[Google OAuth Callback] Using redirect_uri: ${redirectUri}`);

      // Exchange authorization code for tokens
      const tokens = await exchangeCodeForTokens(code, redirectUri);

      if (!tokens.refresh_token) {
        console.warn("[Google OAuth] No refresh_token received. User may have already authorized this app.");
        // In this case, we should prompt the user to revoke access and re-authorize
        return res.redirect("/integrations?google_error=no_refresh_token");
      }

      // Encrypt tokens before storing
      const encryptedAccessToken = encryptToken(tokens.access_token);
      const encryptedRefreshToken = encryptToken(tokens.refresh_token);

      // Calculate token expiry time
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Store tokens in database
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection failed");
      }
      const existingIntegration = await db
        .select()
        .from(integrations)
        .where(and(eq(integrations.tenantId, tenantId), eq(integrations.provider, "google")))
        .limit(1);

      if (existingIntegration.length > 0) {
        // Update existing integration
        await db
          .update(integrations)
          .set({
            status: "connected",
            config: {
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              expiresAt: expiresAt.toISOString(),
              scope: tokens.scope,
            },
            lastSyncedAt: new Date(),
          })
          .where(and(eq(integrations.tenantId, tenantId), eq(integrations.provider, "google")));
      } else {
        // Create new integration
        await db.insert(integrations).values({
          id: randomUUID(),
          tenantId,
          provider: "google",
          status: "connected",
          config: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: expiresAt.toISOString(),
            scope: tokens.scope,
          },
          lastSyncedAt: new Date(),
        });
      }

      console.log(`[Google OAuth Callback] Successfully connected Google Calendar for tenant ${tenantId}`);
      console.log(`[Google OAuth Callback] Redirecting to /integrations?google_connected=true`);

      // Redirect back to integrations page with success message
      res.redirect("/integrations?google_connected=true");
    } catch (error: any) {
      console.error("[Google OAuth] Callback failed:", error);
      res.redirect("/integrations?google_error=callback_failed");
    }
  });
}
