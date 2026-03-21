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
    // List what IS in __dirname for debugging
    try {
      const files = fs.readdirSync(__dirname);
      console.log(`Contents of ${__dirname}:`, files);
    } catch (e) {
      console.error("Could not list directory:", e);
    }
    throw new Error(`Build directory not found: ${distPath}`);
  }

  app.use(express.static(distPath));

  // Fall through to index.html for client-side routing
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
