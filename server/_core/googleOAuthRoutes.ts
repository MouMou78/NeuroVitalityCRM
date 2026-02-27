import { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import { getGoogleAuthUrl, exchangeCodeForTokens, generateOAuthState, encryptToken } from "../googleOAuth";
import { getDb } from "../db";
import { integrations } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// In-memory OAuth state store (survives for 10 minutes per entry)
// In a multi-instance deployment, replace with a shared Redis/DB store.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Startup validation — log a clear warning if credentials are missing
// ---------------------------------------------------------------------------
function validateGoogleOAuthConfig(): void {
  const missing: string[] = [];
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID) missing.push("GOOGLE_OAUTH_CLIENT_ID");
  if (!process.env.GOOGLE_OAUTH_CLIENT_SECRET) missing.push("GOOGLE_OAUTH_CLIENT_SECRET");
  if (missing.length > 0) {
    console.warn(
      `[Google OAuth] WARNING: Missing environment variable(s): ${missing.join(", ")}. ` +
      "Google Calendar integration will not work until these are set."
    );
  } else {
    console.log("[Google OAuth] Credentials detected — Google Calendar integration is ready.");
  }
}

export function registerGoogleOAuthRoutes(app: Express) {
  // Validate credentials at startup
  validateGoogleOAuthConfig();

  // -------------------------------------------------------------------------
  // GET /api/oauth/google
  // Initiates the Google OAuth consent flow for the authenticated user.
  // -------------------------------------------------------------------------
  app.get("/api/oauth/google", async (req: Request, res: Response) => {
    try {
      // Verify Google OAuth is configured before redirecting
      if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
        return res.redirect(
          "/integrations?google_error=not_configured"
        );
      }

      // Get tenant ID from authenticated session
      const { createContext } = await import('./context');
      const ctx = await createContext({ req, res, info: {} as any });

      const requestHost = req.get("host");
      console.log(`[Google OAuth Start] Request host: ${requestHost}`);
      console.log(`[Google OAuth Start] User: ${ctx.user?.email || 'NOT AUTHENTICATED'}`);
      console.log(`[Google OAuth Start] Tenant ID: ${ctx.user?.tenantId || 'MISSING'}`);

      if (!ctx.user || !ctx.user.tenantId) {
        console.error("[Google OAuth Start] User not authenticated or missing tenantId");
        return res.redirect("/login?redirect=/integrations");
      }

      const tenantId = ctx.user.tenantId;

      // Generate a cryptographically secure state parameter
      const state = generateOAuthState();
      oauthStates.set(state, { tenantId, createdAt: Date.now() });

      console.log(`[Google OAuth Start] Generated state: ${state}, stored tenantId: ${tenantId}`);

      // The redirect URI MUST exactly match what is registered in Google Cloud Console
      const redirectUri =
        process.env.GOOGLE_OAUTH_REDIRECT_URI ||
        "https://crm.neurovitality.com/api/oauth/google/callback";
      console.log(`[Google OAuth Start] Using redirect_uri: ${redirectUri}`);

      // Build and redirect to Google consent screen
      const authUrl = getGoogleAuthUrl(redirectUri, state);
      res.redirect(authUrl);
    } catch (error: any) {
      console.error("[Google OAuth] Failed to initiate flow:", error);
      res.redirect("/integrations?google_error=server_error");
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/oauth/google/callback
  // Handles the redirect from Google after the user grants/denies consent.
  // -------------------------------------------------------------------------
  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;
      const error = req.query.error as string;

      // Handle user denial or other OAuth errors from Google
      if (error) {
        console.warn(`[Google OAuth Callback] Google returned error: ${error}`);
        if (error === "access_denied") {
          return res.redirect("/integrations?google_error=access_denied");
        }
        return res.redirect(`/integrations?google_error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        console.error("[Google OAuth Callback] Missing code or state parameter");
        return res.redirect("/integrations?google_error=missing_params");
      }

      // Verify and consume the state parameter (CSRF protection)
      const stateData = oauthStates.get(state);
      const requestHost = req.get("host");

      console.log(
        `[Google OAuth Callback] Request host: ${requestHost}, state: ${state}, stateData found: ${!!stateData}`
      );

      if (!stateData) {
        console.error(`[Google OAuth Callback] Invalid or expired state: ${state}`);
        return res.redirect("/integrations?google_error=invalid_state");
      }

      // Consume the state (one-time use)
      oauthStates.delete(state);

      const { tenantId } = stateData;
      console.log(`[Google OAuth Callback] Restored tenantId from state: ${tenantId}`);

      // Redirect URI must exactly match the one used in the authorization request
      const redirectUri =
        process.env.GOOGLE_OAUTH_REDIRECT_URI ||
        "https://crm.neurovitality.com/api/oauth/google/callback";
      console.log(`[Google OAuth Callback] Using redirect_uri: ${redirectUri}`);

      // Exchange the authorization code for access + refresh tokens
      const tokens = await exchangeCodeForTokens(code, redirectUri);

      if (!tokens.refresh_token) {
        // This happens when the user has previously authorized the app and
        // Google does not re-issue a refresh token. The user must revoke and re-authorize.
        console.warn(
          "[Google OAuth] No refresh_token received. " +
          "User may have already authorized this app — ask them to revoke and reconnect."
        );
        return res.redirect("/integrations?google_error=no_refresh_token");
      }

      // Encrypt tokens at rest using AES-256-GCM before storing in the database
      const encryptedAccessToken = encryptToken(tokens.access_token);
      const encryptedRefreshToken = encryptToken(tokens.refresh_token);
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Upsert the integration record
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const existingIntegration = await db
        .select()
        .from(integrations)
        .where(and(eq(integrations.tenantId, tenantId), eq(integrations.provider, "google")))
        .limit(1);

      const tokenConfig = {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt.toISOString(),
        scope: tokens.scope,
      };

      if (existingIntegration.length > 0) {
        // Update existing integration
        await db
          .update(integrations)
          .set({
            status: "connected",
            config: tokenConfig,
            lastSyncedAt: new Date(),
          })
          .where(and(eq(integrations.tenantId, tenantId), eq(integrations.provider, "google")));
      } else {
        // Create new integration record
        await db.insert(integrations).values({
          id: randomUUID(),
          tenantId,
          provider: "google",
          status: "connected",
          config: tokenConfig,
          lastSyncedAt: new Date(),
        });
      }

      console.log(
        `[Google OAuth Callback] Successfully connected Google Calendar for tenant ${tenantId}`
      );

      // Redirect back to integrations page with success indicator
      res.redirect("/integrations?google_connected=true");
    } catch (error: any) {
      console.error("[Google OAuth] Callback failed:", error);
      res.redirect("/integrations?google_error=callback_failed");
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/oauth/google/disconnect
  // Disconnects Google Calendar for the authenticated user's tenant.
  // -------------------------------------------------------------------------
  app.post("/api/oauth/google/disconnect", async (req: Request, res: Response) => {
    try {
      const { createContext } = await import('./context');
      const ctx = await createContext({ req, res, info: {} as any });

      if (!ctx.user || !ctx.user.tenantId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database connection failed" });
      }

      await db
        .update(integrations)
        .set({
          status: "disconnected",
          config: {},
          lastSyncedAt: null,
        })
        .where(
          and(
            eq(integrations.tenantId, ctx.user.tenantId),
            eq(integrations.provider, "google")
          )
        );

      console.log(
        `[Google OAuth] Disconnected Google Calendar for tenant ${ctx.user.tenantId}`
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Google OAuth] Disconnect failed:", error);
      res.status(500).json({ error: "Failed to disconnect Google Calendar" });
    }
  });
}
