import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { randomBytes } from "crypto";
import path from "path";

const router = Router();

// Allowed MIME types for file uploads (allowlist approach)
const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text
  "text/plain",
  "text/csv",
  // Archives
  "application/zip",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB limit
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed`));
    }
  },
});

/**
 * Sanitize a filename to prevent path traversal and injection
 */
function sanitizeFilename(filename: string): string {
  // Remove directory traversal sequences and null bytes
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  // Limit length
  return base.substring(0, 100);
}

/**
 * Check if the request has a valid session cookie (lightweight auth check)
 */
function isAuthenticated(req: any): boolean {
  return !!req.cookies?.['custom_auth_session'];
}

router.post("/upload", (req, res, next) => {
  // Require authentication for file uploads
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const randomSuffix = randomBytes(16).toString("hex");
    const safeFilename = sanitizeFilename(file.originalname);
    // Store with random prefix to prevent enumeration
    const fileKey = `uploads/${randomSuffix}/${safeFilename}`;

    const { url } = await storagePut(
      fileKey,
      file.buffer,
      file.mimetype
    );

    res.json({
      url,
      fileName: safeFilename,
      fileType: file.mimetype,
      fileSize: file.size,
    });
  } catch (error: any) {
    if (error.message?.includes("not allowed")) {
      return res.status(415).json({ error: error.message });
    }
    console.error("File upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

export default router;
