import fs from "fs/promises";
import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

// Validates req.body against a Zod schema and replaces it with the parsed
// (trimmed / coerced / stripped) value. On failure: 400 with field errors,
// and any uploaded file is deleted.
export const validateBody =
  (schema: z.ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      if (req.file) {
        fs.unlink(req.file.path).catch(() => undefined);
      }

      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || null,
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: errors[0]?.message ?? "Invalid request",
        errors,
      });
    }

    req.body = result.data;

    next();
  };
