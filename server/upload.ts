import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { randomBytes } from "crypto";

const router = Router();

// General chat file upload — 16MB limit
const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 },
});

// Knowledge vault upload — 500MB limit to support video files
const ALLOWED_VAULT_EXTS = [
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv", "md", "json", "xml",
  "mp3", "wav", "ogg", "flac", "aac", "m4a",
  "mp4", "mov", "avi", "mkv", "webm", "wmv",
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg",
];
const ALLOWED_VAULT_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/markdown", "application/json", "application/xml", "text/xml",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/flac", "audio/aac", "audio/m4a", "audio/x-m4a",
  "video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm", "video/x-ms-wmv",
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff", "image/svg+xml",
];
const vaultUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    if (ALLOWED_VAULT_MIMES.includes(file.mimetype) || ALLOWED_VAULT_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported: ${file.mimetype} (.${ext})`));
    }
  },
});

// General chat file upload
const upload = chatUpload; // keep backward compat alias
router.post("/upload", chatUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const file = req.file;
    const randomSuffix = randomBytes(8).toString("hex");
    const fileKey = `chat-files/${Date.now()}-${randomSuffix}-${file.originalname}`;
    const { url } = await storagePut(fileKey, file.buffer, file.mimetype);
    res.json({ url, fileName: file.originalname, fileType: file.mimetype, fileSize: file.size });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// Knowledge vault single file upload — large file support
router.post("/vault/upload", vaultUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const file = req.file;
    const randomSuffix = randomBytes(8).toString("hex");
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "bin";
    const fileKey = `vault/${Date.now()}-${randomSuffix}.${ext}`;
    const { url } = await storagePut(fileKey, file.buffer, file.mimetype);
    res.json({ url, fileName: file.originalname, fileType: file.mimetype, fileSize: file.size, storageKey: fileKey });
  } catch (error: any) {
    console.error("Vault upload error:", error);
    if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File too large. Maximum size is 500MB." });
    res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});

// Knowledge vault multi-file upload — up to 20 files at once
router.post("/vault/upload-multi", vaultUpload.array("files", 20), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });
    const results = await Promise.all(files.map(async (file) => {
      const randomSuffix = randomBytes(8).toString("hex");
      const ext = file.originalname.split(".").pop()?.toLowerCase() || "bin";
      const fileKey = `vault/${Date.now()}-${randomSuffix}.${ext}`;
      const { url } = await storagePut(fileKey, file.buffer, file.mimetype);
      return { url, fileName: file.originalname, fileType: file.mimetype, fileSize: file.size, storageKey: fileKey };
    }));
    res.json({ files: results });
  } catch (error: any) {
    console.error("Vault multi-upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload files" });
  }
});

export { upload };
export default router;
