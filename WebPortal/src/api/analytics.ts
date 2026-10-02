import { apiClient, unwrap } from "./client";
import type { Analytics, DailyPlan, DashboardStats, EvalResults } from "../types";

export const getDashboardStats = () =>
  unwrap<DashboardStats>(apiClient.get("/admin/dashboard"));

export const getAnalytics = (includeSimulated: boolean) =>
  unwrap<Analytics>(apiClient.get("/admin/analytics", { params: { includeSimulated } }));

// Downloads the CSV with the auth header (a plain link would not send it).
export const downloadComplaintsCsv = async (includeSimulated: boolean) => {
  const response = await apiClient.get<Blob>("/admin/reports/export.csv", {
    params: { includeSimulated },
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `complaints-${new Date().toISOString().slice(0, 10)}${includeSimulated ? "" : "-real-only"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// Latest offline evaluation, or null when `npm run eval` has not been run.
export const getEvaluation = () => unwrap<EvalResults | null>(apiClient.get("/admin/eval/latest"));

// ---------------- Daily plan ----------------

export const getTodayPlan = () => unwrap<DailyPlan | null>(apiClient.get("/admin/plan/today"));

export const generatePlan = () => unwrap<DailyPlan>(apiClient.post("/admin/plan/generate", {}));
