import type { Response } from "express";

// An error whose message is safe to show to the client, with an HTTP status.
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// Prisma "record to update/delete not found".
const isNotFound = (error: unknown) =>
  (error as { code?: unknown })?.code === "P2025";

// Single place that turns an error into a response. Only HttpError messages
// reach the client; everything else is logged here and replaced with a
// generic message so internals (SQL, file paths, stack traces) never leak.
export const sendError = (
  res: Response,
  error: unknown,
  label: string,
  fallbackMessage: string,
) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  if (isNotFound(error)) {
    return res.status(404).json({
      success: false,
      message: "Not found",
    });
  }

  console.error(`${label} ERROR:`, error);

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};
