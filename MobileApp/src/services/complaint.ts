import { apiRequest } from './api';

import type { ApiEnvelope } from '../types/auth';

import type {
  Complaint,
  CreateComplaintPayload,
  NearbyQuery,
} from '../types/complaint';

export interface DuplicateInfo {
  detected: boolean;
  similarityScore: number;
  matchingComplaintId: string | null;
  matchingComplaintSummary: string | null;
  reason: string | null;
}

export interface AIComplaintInfo {
  priority: string;
  urgencyScore: number;
  sentimentScore: number;
  sentimentLabel: string;
  highPriority: boolean;
  wasteType: string | null;
  locationDescription: string | null;
  estimatedQuantity: string | null;
  requiredWorkers: number;
  requiredHeavyVehicles: number;
  estimatedTimeMinutes: number;
}

export interface CreateComplaintResponse {
  complaint: Complaint;
  duplicate: DuplicateInfo;
  ai: AIComplaintInfo;
}

export async function createComplaint(
  payload: CreateComplaintPayload,
): Promise<CreateComplaintResponse> {
  const formData = new FormData();

  // IMPORTANT:
  // Backend expects "text", NOT "description".
  formData.append('text', payload.description);

  formData.append('latitude', String(payload.latitude));
  formData.append('longitude', String(payload.longitude));

  formData.append('image', {
    uri: payload.imageUri,
    name: payload.imageName ?? 'complaint.jpg',
    type: payload.imageType ?? 'image/jpeg',
  } as any);

  const res = await apiRequest<ApiEnvelope<CreateComplaintResponse>>(
    '/complaints',
    {
      method: 'POST',
      formData,
    },
  );

  if (!res?.data) {
    throw new Error(
      'The complaint was submitted but no confirmation was returned.',
    );
  }

  return res.data;
}

export async function getMyComplaints(): Promise<Complaint[]> {
  const res = await apiRequest<ApiEnvelope<Complaint[]>>('/complaints', {
    method: 'GET',
  });

  return res?.data ?? [];
}

export async function getComplaintById(id: string): Promise<Complaint> {
  const res = await apiRequest<ApiEnvelope<Complaint>>(`/complaints/${id}`, {
    method: 'GET',
  });

  if (!res?.data) {
    throw new Error('Complaint not found.');
  }

  return res.data;
}

export async function getNearbyComplaints(
  query: NearbyQuery,
): Promise<Complaint[]> {
  const params = new URLSearchParams({
    latitude: String(query.latitude),
    longitude: String(query.longitude),
    radius: String(query.radius),
  });

  const res = await apiRequest<ApiEnvelope<Complaint[]>>(
    `/complaints/nearby?${params.toString()}`,
    {
      method: 'GET',
    },
  );

  return res?.data ?? [];
}
export type HotspotLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Hotspot {
  latitude: number;
  longitude: number;
  complaintCount: number;
  totalVotes: number;
  totalVerifiedWeightKg: number;
  score: number;
  level: HotspotLevel;
  complaintIds: string[];
  wasteTypes: string[];
  statuses: string[];
}

export async function getHotspots(): Promise<Hotspot[]> {
  const res = await apiRequest<ApiEnvelope<Hotspot[]>>('/complaints/hotspots', {
    method: 'GET',
  });

  return res?.data ?? [];
}