// Force deployment with updated OAuth credentials
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL not set — skipping migrations.");
    return;
  }
  try {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const postgres = (await import("postgres")).default;
    const client = postgres(process.env.DATABASE_URL, {
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 1,
    });
    const db = drizzle(client);
    console.log("[Database] Running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("[Database] Migrations complete.");
    await client.end();
  } catch (err) {
    console.error("[Database] Migration error:", err);
    // Don't crash the server — app can still run if tables already exist
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust proxy to handle HTTPS behind load balancers
  app.set('trust proxy', 1);
  // Configure cookie parser for session management
  app.use(cookieParser());
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Health check endpoint for Railway deployment — responds immediately
  app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  // TEMPORARY: one-time endpoint to upgrade ian@neurovitalityltd.com to engineering role
  // This endpoint will be removed after use
  app.post("/api/upgrade-to-engineering", async (req: any, res: any) => {
    const secret = req.body?.secret;
    if (secret !== "NV-ENG-UPGRADE-2026") {
      return res.status(403).json({ error: "Invalid secret" });
    }
    try {
      const { getDb } = await import("../db");
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "DB unavailable" });
      const result = await db.update(users).set({ role: "engineering" }).where(eq(users.email, "ian@neurovitalityltd.com")).returning({ id: users.id, email: users.email, role: users.role });
      if (result.length === 0) return res.status(404).json({ error: "User not found" });
      return res.json({ success: true, user: result[0] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });


  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Google OAuth routes
  const { registerGoogleOAuthRoutes } = await import("./googleOAuthRoutes");
  registerGoogleOAuthRoutes(app);
  // File upload endpoint
  const uploadRouter = (await import("../upload")).default;
  app.use("/api", uploadRouter);
  // Email tracking endpoints
  const trackingRouter = (await import("../tracking-routes")).default;
  app.use("/api", trackingRouter);
  // Webhook endpoints
  const { handleAmplemarketWebhook } = await import("../webhooks/amplemarket");
  app.post("/api/webhooks/amplemarket", handleAmplemarketWebhook);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Run DB migrations in the background after server is already listening
    // This ensures the healthcheck passes immediately while migrations complete
    runMigrations().catch(console.error);
  });
}

startServer().catch(console.error);
