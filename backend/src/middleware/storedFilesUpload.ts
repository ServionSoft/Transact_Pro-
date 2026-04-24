import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import type { AppConfig } from "../config/env.js";
import { resolveNumericProjectId } from "../utils/resolveProjectId.js";
import {
  DOC_UPLOAD_SEGMENT,
  DOC_UPLOAD_STAGING,
} from "../utils/storedFilesLayout.js";

export function createStoredFileMulter(uploadDirAbs: string, config: AppConfig) {
  return multer({
    storage: multer.diskStorage({
      destination(req, _file, cb) {
        if (
          resolveNumericProjectId(req.params.projectId ?? "", config) === null
        ) {
          cb(new Error("INVALID_PROJECT"), "");
          return;
        }
        const dest = path.join(
          uploadDirAbs,
          DOC_UPLOAD_SEGMENT,
          DOC_UPLOAD_STAGING
        );
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename(_req, file, cb) {
        const ext = path.extname(file.originalname) || "";
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  });
}
