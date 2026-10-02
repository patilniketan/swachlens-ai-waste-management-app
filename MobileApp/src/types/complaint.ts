// Mirrors the ComplaintStatus enum in backend/prisma/schema.prisma.
export type ComplaintStatus =
  | 'Pending'
  | 'Assigned'
  | 'InProgress'
  | 'Resolved'
  | 'Linked'
  | 'Merged'
  | 'Rejected';

export const ACTIVE_STATUSES: ComplaintStatus[] = [
  'Pending',
  'Assigned',
  'InProgress',
];

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  Pending: 'Pending',
  Assigned: 'Assigned',
  InProgress: 'In Progress',
  Resolved: 'Resolved',
  Linked: 'Linked (duplicate)',
  Merged: 'Merged',
  Rejected: 'Rejected',
};

export type ComplaintPriority = 'CRITICAL' | 'STANDARD' | 'TRIVIAL';

export interface Complaint {
  id: string;
  userId: string;
  description: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  address: string;
  wasteType: string | null;
  status: ComplaintStatus;
  priority?: ComplaintPriority;
  /** Seeded demo data. Must be shown with a "Simulated" label. */
  isSimulated?: boolean;
  aiSummary?: string | null;
  /** AI analysis failed; staff will review it manually. */
  needsManualReview?: boolean;
  priorityReasons?: string[];
  createdAt: string;
  updatedAt: string;
  distanceKm?: number; // present on /nearby responses when backend supplies it
}

export interface CreateComplaintPayload {
  /** Reused on retries of the same submission so it is never created twice. */
  idempotencyKey: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  imageUri: string;
  imageName?: string;
  imageType?: string;
}

export interface NearbyQuery {
  latitude: number;
  longitude: number;
  /** Search radius in kilometres. */
  radiusKm: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}
