// Force deployment with updated OAuth credentials
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./serve-static";

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

// Auth-specific rate limiter: 10 attempts per 15 minutes per IP
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

// General API rate limiter: 300 requests per minute per IP
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

// Allowed origins for CORS
const allowedOrigins = [
  "https://www.crmneurovitality.com",
  "https://crmneurovitality.com",
  "https://www.neurovitalityltd.com",
  ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000", "http://localhost:5173"] : []),
];

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy to handle HTTPS behind load balancers (Railway)
  app.set('trust proxy', 1);

  // ── Security Headers (Helmet) ──────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "https://api.openai.com", "https://maps.googleapis.com", "wss:", "ws:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false, // Required for Google Maps
  }));

  // Remove X-Powered-By header (already done by helmet but explicit)
  app.disable('x-powered-by');

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "trpc-accept", "x-trpc-source"],
  }));

  // ── Cookie Parser ──────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── Body Parser (with size limits) ────────────────────────────────────────
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // ── Rate Limiting on Auth Endpoints ───────────────────────────────────────
  app.use("/api/trpc/customAuth.login", authRateLimiter);
  app.use("/api/trpc/customAuth.signup", authRateLimiter);
  app.use("/api/trpc/customAuth.requestPasswordReset", authRateLimiter);
  app.use("/api/trpc/customAuth.resetPassword", authRateLimiter);
  app.use("/api/trpc/customAuth.verify2FASetup", authRateLimiter);

  // ── General API Rate Limiting ──────────────────────────────────────────────
  app.use("/api", apiRateLimiter);

  // ── Routes ─────────────────────────────────────────────────────────────────
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

  // Development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ── Database Migrations ───────────────────────────────────────────────────
  if (process.env.DATABASE_URL) {
    try {
      const { drizzle } = await import('drizzle-orm/node-postgres');
      const { migrate } = await import('drizzle-orm/node-postgres/migrator');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const migrationsFolder = path.resolve(__dirname, '../../drizzle');
      const db = drizzle(process.env.DATABASE_URL);
      await migrate(db, { migrationsFolder });
      console.log('[Database] Migrations applied successfully');
    } catch (err) {
      console.warn('[Database] Migration warning (non-fatal):', err instanceof Error ? err.message : err);
    }
  }

  // Force Port 8080 for Railway deployment
  const port = 8080;

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
