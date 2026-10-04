import { z } from "zod";
import { ComplaintStatus, Priority } from "../constants/complaint.js";

// ============================================================
// REQUEST BODY SCHEMAS (used with middleware/validate.middleware.ts)
// ============================================================

const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .pipe(z.email({ error: "Enter a valid email address" }));

const id = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(64, `${label} is too long`);

// Multipart fields arrive as strings; "" must not silently become 0.
const coordinate = (label: string, min: number, max: number) =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ""
        ? undefined
        : Number(value),
    z
      .number({ error: `${label} is required and must be a number` })
      .min(min, `${label} must be between ${min} and ${max}`)
      .max(max, `${label} must be between ${min} and ${max}`),
  );

// ---------------- Auth ----------------

export const signupSchema = z.object({
  email,
  password: z
    .string({ error: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const loginSchema = z.object({
  email,
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required")
    .max(128, "Password must be at most 128 characters"),
});

export const sendOtpSchema = z.object({ email });

export const verifyOtpSchema = z.object({
  email,
  otp: z
    .string({ error: "Verification code is required" })
    .trim()
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

// ---------------- Complaints ----------------

const DESCRIPTION_MAX = 1000;

const descriptionText = z
  .string()
  .trim()
  .min(1, "Description is required")
  .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`);

// Mobile sends `text`, web/API clients send `description`.
export const complaintCreateSchema = z
  .object({
    description: descriptionText.optional(),
    text: descriptionText.optional(),
    address: z.string().trim().max(300, "Address is too long").optional(),
    latitude: coordinate("Latitude", -90, 90),
    longitude: coordinate("Longitude", -180, 180),
  })
  .refine((body) => body.description ?? body.text, {
    message: "Description is required",
    path: ["description"],
  })
  .transform(({ description, text, address, latitude, longitude }) => ({
    description: (description ?? text) as string,
    address: address || undefined,
    latitude,
    longitude,
  }));

// Staff/admin edits. Unknown fields are rejected, enums are whitelisted.
// Priority is changed only via the admin override endpoint (with a reason).
export const complaintUpdateSchema = z
  .strictObject({
    status: z.enum(ComplaintStatus).optional(),
    address: z.string().trim().max(300, "Address is too long").optional(),
    wasteType: z.string().trim().min(1).max(100, "Waste type is too long").optional(),
    isScheduled: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update",
  });

// POST /:id/verify takes no body.
export const complaintVerifySchema = z.strictObject({});

export const rejectDuplicateSchema = z.strictObject({
  reason: z.string().trim().min(1).max(500, "Reason is too long").optional(),
});

export const confirmDuplicateSchema = z.strictObject({
  masterId: id("masterId").optional(),
});

export const mergeComplaintsSchema = z.strictObject({
  complaintIds: z
    .array(id("Complaint ID"))
    .min(2, "Provide at least 2 complaint IDs")
    .max(20, "Merge at most 20 complaints at once"),
});

// ---------------- Assignments ----------------

export const assignComplaintSchema = z.strictObject({
  complaintId: id("Complaint ID"),
  staffId: id("Staff ID"),
});

// JSON or multipart (completion carries the after photo, so numbers may
// arrive as strings).
export const assignmentStatusSchema = z
  .strictObject({
    status: z.enum(["ASSIGNED", "IN_PROGRESS", "COMPLETED"], {
      error: "Status must be ASSIGNED, IN_PROGRESS or COMPLETED",
    }),
    verifiedWeightKg: z.preprocess(
      (value) =>
        value === undefined || value === null || value === "" ? undefined : Number(value),
      z
        .number({ error: "verifiedWeightKg must be a number" })
        .positive("verifiedWeightKg must be greater than 0")
        .max(100_000, "verifiedWeightKg is unrealistically large")
        .optional(),
    ),
    resolutionNotes: z.string().trim().max(1000, "Notes are too long").optional(),
  })
  .refine((body) => body.status !== "COMPLETED" || body.verifiedWeightKg !== undefined, {
    message: "verifiedWeightKg is required to complete a task",
    path: ["verifiedWeightKg"],
  });

// Admin priority override: a reason is mandatory and goes into the audit log.
export const priorityOverrideSchema = z.strictObject({
  priority: z.enum(Priority, {
    error: "Priority must be CRITICAL, STANDARD or TRIVIAL",
  }),
  reason: z
    .string({ error: "A reason is required" })
    .trim()
    .min(5, "Reason must be at least 5 characters")
    .max(500, "Reason is too long"),
});

// ---------------- Query strings ----------------

const booleanFlag = (fallback: boolean) =>
  z
    .enum(["true", "false"], { error: "Must be true or false" })
    .optional()
    .transform((value) => (value === undefined ? fallback : value === "true"));

export const paginationQuerySchema = z.object({
  take: z.coerce
    .number({ error: "take must be a number" })
    .int()
    .min(1, "take must be at least 1")
    .max(100, "take must be at most 100")
    .default(25),
  skip: z.coerce
    .number({ error: "skip must be a number" })
    .int()
    .min(0, "skip cannot be negative")
    .default(0),
  status: z.enum(ComplaintStatus).optional(),
  priority: z.enum(Priority).optional(),
  wasteType: z.string().trim().min(1).max(100).optional(),
  // urgency = urgencyScore desc, votes desc, oldest first
  sort: z.enum(["newest", "urgency"]).default("newest"),
});

export const analyticsQuerySchema = z.object({
  includeSimulated: booleanFlag(true),
});

