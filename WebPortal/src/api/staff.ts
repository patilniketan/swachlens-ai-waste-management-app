import { apiClient, unwrap } from "./client";
import type { Assignment, StaffMember, StaffTask } from "../types";

// ---------------- Admin ----------------

export const getStaff = () => unwrap<StaffMember[]>(apiClient.get("/admin/staff"));

export const assignComplaint = (complaintId: string, staffId: string) =>
  unwrap<Assignment>(apiClient.post("/assignments", { complaintId, staffId }));

// ---------------- Staff (own tasks) ----------------

export const getMyTasks = () => unwrap<StaffTask[]>(apiClient.get("/assignments/tasks"));

export const startTask = (assignmentId: string) =>
  unwrap<Assignment>(
    apiClient.patch(`/assignments/${assignmentId}/status`, { status: "IN_PROGRESS" }),
  );

// Completion evidence: after photo + weighed kg (+ optional notes).
export const completeTask = (
  assignmentId: string,
  evidence: { afterImage: File; verifiedWeightKg: number; resolutionNotes?: string },
) => {
  const form = new FormData();
  form.append("status", "COMPLETED");
  form.append("verifiedWeightKg", String(evidence.verifiedWeightKg));

  if (evidence.resolutionNotes?.trim()) {
    form.append("resolutionNotes", evidence.resolutionNotes.trim());
  }

  form.append("afterImage", evidence.afterImage);

  return unwrap<Assignment>(apiClient.patch(`/assignments/${assignmentId}/status`, form));
};
