import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  // In production, the compiled server is in dist/server/_core/index.js
  // The static files are in dist/public
  const distPath = path.resolve(__dirname, "../../public");
  
  console.log(`Checking for static files at: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
    // Fallback for different structures
    const fallbackPath = path.resolve(__dirname, "../public");
    console.log(`Checking fallback path: ${fallbackPath}`);
    if (fs.existsSync(fallbackPath)) {
      console.log(`Found static files at fallback path: ${fallbackPath}`);
      app.use(express.static(fallbackPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(fallbackPath, "index.html"));
      });
      return;
    }
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
