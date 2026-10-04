import crypto from "crypto";
import fs from "fs";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { UPLOAD_DIR } from "../config/uploads.js";

const uploadDir = UPLOAD_DIR;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// The stored extension comes from this map (the validated MIME type), never
// from the client's filename, so "x.html" can only ever be saved as an image.
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// 5MB hard cap; MAX_FILE_SIZE (bytes) can only lower it.
const UPLOAD_CAP_BYTES = 5 * 1024 * 1024;

const MAX_UPLOAD_BYTES = (() => {
  const configured = Number(process.env.MAX_FILE_SIZE);

  return Number.isInteger(configured) && configured > 0
    ? Math.min(configured, UPLOAD_CAP_BYTES)
    : UPLOAD_CAP_BYTES;
})();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  // Unguessable name: images are served from the public /uploads route.
  filename: (_req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${EXTENSION_BY_MIME[file.mimetype]}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (EXTENSION_BY_MIME[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      Object.assign(
        new Error("Only JPEG, PNG, JPG and WebP images are allowed"),
        { status: 400 },
      ),
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
});

// ---------------- Magic-byte check ----------------

const startsWith = (bytes: Buffer, signature: number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

const matchesDeclaredType = (bytes: Buffer, mimeType: string) => {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8);
    default:
      return false;
  }
};

const readHeader = async (filePath: string) => {
  const handle = await fs.promises.open(filePath, "r");

  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);

    return header.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

// Run after upload.single(): rejects files whose bytes are not the image
// type the client declared, and deletes them.
export const verifyImageContent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.file) return next();

  try {
    const header = await readHeader(req.file.path);

    if (matchesDeclaredType(header, req.file.mimetype)) return next();
  } catch (error) {
    console.error("UPLOAD CHECK ERROR:", error);
  }

  fs.promises.unlink(req.file.path).catch(() => undefined);

  return res.status(400).json({
    success: false,
    message: "The uploaded file is not a valid JPEG, PNG or WebP image.",
  });
};
