// Shapes of the backend API responses. Enums mirror backend/prisma/schema.prisma.

export type ComplaintStatus =
  | 'Pending'
  | 'Assigned'
  | 'InProgress'
  | 'Resolved'
  | 'Linked'
  | 'Merged'
  | 'Rejected';

export const ALL_STATUSES: ComplaintStatus[] = [
  'Pending',
  'Assigned',
  'InProgress',
  'Resolved',
  'Linked',
  'Merged',
  'Rejected',
];

export const ACTIVE_STATUSES: ComplaintStatus[] = ['Pending', 'Assigned', 'InProgress'];

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

export const PRIORITIES: ComplaintPriority[] = ['CRITICAL', 'STANDARD', 'TRIVIAL'];

export type UserRole = 'CITIZEN' | 'STAFF' | 'ADMIN';

export type AiSource = 'gemini' | 'cached' | 'seed' | 'fallback';

export type AssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

export interface UserRef {
  id: string;
  email: string;
  role: UserRole;
}

export type AuthUser = UserRef;

export interface Assignment {
  id: string;
  complaintId: string;
  staffId: string;
  assignedBy: string;
  status: AssignmentStatus;
  assignedAt: string;
  updatedAt: string;
  staff?: UserRef;
}

export interface Complaint {
  id: string;
  userId: string;
  description: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  wasteType: string | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  urgencyScore: number;
  voteCount: number;
  requiredWorkers: number;
  requiredHeavyVehicles: number;
  estimatedTimeMinutes: number | null;
  priorityReasons: string[];
  priorityOverridden: boolean;
  aiSource: AiSource | null;
  needsManualReview: boolean;
  aiSummary: string | null;
  aiWasteCategories: string[];
  aiRelativeVolume: string | null;
  aiWasteCondition: string | null;
  aiHazardousDetected: boolean;
  aiHazardousTypes: string[];
  aiAccessibility: string | null;
  aiSuggestedEquipment: string[];
  aiBlockedRoad: boolean;
  aiNearSensitiveSite: boolean;
  aiImageConfidence: number | null;
  duplicateSuggestionOfId: string | null;
  duplicateSuggestionVerdict: 'yes' | 'no' | 'unsure' | null;
  duplicateSuggestionReason: string | null;
  masterComplaintId: string | null;
  isScheduled: boolean;
  isSimulated: boolean;
  verifiedWeightKg: number | null;
  afterImageUrl: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  User?: UserRef;
  assignments?: Assignment[];
}

export interface LinkedReport {
  id: string;
  description: string;
  status: ComplaintStatus;
  voteCount: number;
  aiSummary: string | null;
  imageUrl: string | null;
  isSimulated: boolean;
  createdAt: string;
}

export interface ComplaintDetail extends Complaint {
  childComplaints: LinkedReport[];
  masterComplaint: {
    id: string;
    aiSummary: string | null;
    description: string;
    status: ComplaintStatus;
  } | null;
  duplicateSuggestionTarget: {
    id: string;
    description: string;
    aiSummary: string | null;
    status: ComplaintStatus;
    imageUrl: string | null;
    voteCount: number;
    createdAt: string;
  } | null;
}

export type ComplaintEventType =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'ASSIGNED'
  | 'MERGED'
  | 'DUPLICATE_CONFIRMED'
  | 'DUPLICATE_REJECTED'
  | 'PRIORITY_OVERRIDE';

export interface ComplaintEvent {
  id: string;
  complaintId: string;
  actorId: string | null;
  type: ComplaintEventType;
  fromValue: string | null;
  toValue: string | null;
  reason: string | null;
  createdAt: string;
  actor: UserRef | null;
}

export interface Pagination {
  take: number;
  skip: number;
  total: number;
  hasMore: boolean;
}

export interface StaffMember {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  assigned: number;
  inProgress: number;
  completed: number;
  currentAssignment: {
    complaintId: string;
    status: AssignmentStatus;
    wasteType: string | null;
    address: string | null;
  } | null;
}

export interface StaffTask extends Assignment {
  complaint: Complaint;
  distanceKm: number | null;
}

export interface MapComplaint {
  id: string;
  latitude: number;
  longitude: number;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  wasteType: string | null;
  aiSummary: string | null;
  address: string | null;
  voteCount: number;
  urgencyScore: number;
  isSimulated: boolean;
}

export type HotspotLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Hotspot {
  latitude: number;
  longitude: number;
  complaintCount: number;
  totalVotes: number;
  radiusMeters: number;
  simulatedCount: number;
  score: number;
  level: HotspotLevel;
  complaintIds: string[];
  wasteTypes: (string | null)[];
  statuses: ComplaintStatus[];
}

export interface PlanItem {
  complaintId: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  urgencyScore: number;
  voteCount: number;
  requiredWorkers: number;
  requiredHeavyVehicles: number;
  estimatedTimeMinutes: number;
  workerMinutes: number;
  vehicleMinutes: number;
  wasteType: string | null;
  summary: string | null;
  address: string | null;
  needsManualReview: boolean;
  isSimulated: boolean;
}

export interface DeferredItem extends PlanItem {
  reason: string;
}

export interface Capacity {
  workerMinutes: number;
  vehicleMinutes: number;
}

export interface DailyPlan {
  date: string;
  generatedAt: string;
  generatedBy: string;
  shiftMinutes: number;
  resources: { workers: number; heavyVehicles: number; available: boolean };
  capacityTotal: Capacity;
  capacityUsed: Capacity & { committed: Capacity; scheduled: Capacity };
  capacityRemaining: Capacity;
  warnings: string[];
  committed: PlanItem[];
  scheduled: PlanItem[];
  deferred: DeferredItem[];
}

export interface Analytics {
  generatedAt: string;
  includeSimulated: boolean;
  dataset: { totalComplaints: number; simulated: number; real: number; note: string | null };
  byStatus: { status: ComplaintStatus; count: number }[];
  byWasteType: { wasteType: string; count: number }[];
  last7Days: { date: string; created: number; resolved: number }[];
  resolution: { resolvedCount: number; avgResolutionHours: number | null };
  duplicateSuggestions: { confirmed: number; rejected: number; pending: number };
  aiVsVerified: {
    aiRelativeVolume: string;
    count: number;
    medianKg: number | null;
    minKg: number | null;
    maxKg: number | null;
  }[];
}

export interface DashboardStats {
  complaints: {
    total: number;
    pending: number;
    assigned: number;
    inProgress: number;
    resolved: number;
  };
  staff: { total: number };
}
