import { apiClient, unwrap, type Envelope } from "./client";
import type {
  Complaint,
  ComplaintDetail,
  ComplaintEvent,
  ComplaintPriority,
  ComplaintStatus,
  Hotspot,
  MapComplaint,
  Pagination,
} from "../types";

export interface ComplaintFilters {
  status?: ComplaintStatus | undefined;
  priority?: ComplaintPriority | undefined;
  wasteType?: string | undefined;
  sort?: "urgency" | "newest";
  take?: number;
  skip?: number;
}

export const getComplaints = async (filters: ComplaintFilters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""),
  );

  const response = await apiClient.get<Envelope<Complaint[]> & { pagination: Pagination }>(
    "/admin/complaints",
    { params },
  );

  return { items: response.data.data, pagination: response.data.pagination };
};

export const getComplaint = (id: string) =>
  unwrap<ComplaintDetail>(apiClient.get(`/admin/complaints/${id}`));

export const getComplaintEvents = (id: string) =>
  unwrap<ComplaintEvent[]>(apiClient.get(`/admin/complaints/${id}/events`));

export const getMapComplaints = () =>
  unwrap<MapComplaint[]>(apiClient.get("/admin/complaints/map"));

export const getHotspots = () => unwrap<Hotspot[]>(apiClient.get("/complaints/hotspots"));

export const confirmDuplicate = (id: string) =>
  unwrap<unknown>(apiClient.post(`/complaints/${id}/confirm-duplicate`, {}));

export const rejectDuplicate = (id: string, reason?: string) =>
  unwrap<unknown>(
    apiClient.post(`/complaints/${id}/reject-duplicate`, reason ? { reason } : {}),
  );

export const overridePriority = (id: string, priority: ComplaintPriority, reason: string) =>
  unwrap<Complaint>(apiClient.patch(`/admin/complaints/${id}/priority`, { priority, reason }));
