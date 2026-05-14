import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import type { AppConfig } from "../config/env.js";
import { DOC_UPLOAD_SEGMENT, DOC_UPLOAD_STAGING } from "../utils/storedFilesLayout.js";

export function createSmtpSignatureMulter(uploadDirAbs: string, _config: AppConfig) {
  return multer({
    storage: multer.diskStorage({
      destination(_req, _file, cb) {
        const dest = path.join(uploadDirAbs, DOC_UPLOAD_SEGMENT, DOC_UPLOAD_STAGING);
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename(_req, file, cb) {
        const ext = path.extname(file.originalname) || ".png";
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  });
}

