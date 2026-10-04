import { apiRequest } from './api';

import type { ApiEnvelope } from '../types/auth';

import type {
  Complaint,
  CreateComplaintPayload,
  NearbyQuery,
} from '../types/complaint';

/** An AI suggestion only; staff confirm duplicates before anything is linked. */
export interface DuplicateSuggestion {
  complaintId: string;
  verdict: 'yes' | 'unsure';
  reason: string | null;
  summary: string | null;
  status: string | null;
  confirmed: boolean;
}

export type AiSource = 'gemini' | 'cached' | 'seed' | 'fallback';

export interface AIComplaintInfo {
  source: AiSource | null;
  needsManualReview: boolean;
  summary: string | null;
  wasteType: string | null;
  wasteCategories: string[];
  relativeVolume: string | null;
  condition: string | null;
  hazardousDetected: boolean;
  hazardousTypes: string[];
  accessibility: string | null;
  suggestedEquipment: string[];
  blockedRoad: boolean;
  nearSensitiveSite: boolean;
  confidence: number | null;
  priority: string;
  urgencyScore: number;
  requiredWorkers: number;
  requiredHeavyVehicles: number;
  estimatedTimeMinutes: number | null;
  priorityReasons: string[];
}

export interface CreateComplaintResponse {
  complaint: Complaint;
  duplicateSuggestion: DuplicateSuggestion | null;
  ai: AIComplaintInfo;
  /** true when this was a retry of an already-created complaint. */
  idempotentReplay: boolean;
}

export async function createComplaint(
  payload: CreateComplaintPayload,
): Promise<CreateComplaintResponse> {
  const formData = new FormData();

  formData.append('description', payload.description);
  formData.append('address', payload.address);

  formData.append('latitude', String(payload.latitude));
  formData.append('longitude', String(payload.longitude));

  if (payload.imageUri) {
    formData.append('image', {
      uri: payload.imageUri,
      name: payload.imageName ?? 'complaint.jpg',
      type: payload.imageType ?? 'image/jpeg',
    } as any);
  }

  const res = await apiRequest<ApiEnvelope<CreateComplaintResponse>>(
    '/complaints',
    {
      method: 'POST',
      formData,
      headers: { 'Idempotency-Key': payload.idempotencyKey },
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
    // Backend expects metres.
    radius: String(Math.round(query.radiusKm * 1000)),
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
  radiusMeters: number;
  /** How many of the hotspot's complaints are seeded demo data. */
  simulatedCount: number;
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