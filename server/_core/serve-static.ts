import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  // Build output structure:
  // dist/index.js       <- compiled server (this file runs from here)
  // dist/public/        <- static frontend files
  //
  // __dirname at runtime = /app/dist (since server is compiled to dist/index.js)
  const distPath = path.resolve(__dirname, "public");

  console.log(`Serving static files from: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    console.error(`Could not find static files at: ${distPath}`);
    try {
      const files = fs.readdirSync(__dirname);
      console.log(`Contents of ${__dirname}:`, files);
    } catch (e) {
      console.error("Could not list directory:", e);
    }
    throw new Error(`Build directory not found: ${distPath}`);
  }

  // Serve static assets with long-term caching for hashed files
  app.use(express.static(distPath, {
    maxAge: '1y',        // Long cache for hashed assets (JS/CSS bundles)
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // HTML files: no caching (always fetch fresh)
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // Prevent browsers from sniffing MIME types
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
    },
  }));

  // Fall through to index.html for client-side routing
  app.use("*", (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
