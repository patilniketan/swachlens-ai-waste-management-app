// Mirrors the enums in backend/prisma/schema.prisma.
export type ComplaintStatus = 'Pending' | 'Assigned' | 'InProgress' | 'Resolved' | 'Linked' | 'Merged' | 'Rejected';
export const ACTIVE_STATUSES: ComplaintStatus[] = ['Pending', 'Assigned', 'InProgress'];
export const STATUS_LABELS: Record<ComplaintStatus, string> = { Pending: 'Pending', Assigned: 'Assigned', InProgress: 'In Progress', Resolved: 'Resolved', Linked: 'Linked (duplicate)', Merged: 'Merged', Rejected: 'Rejected' };
export type ComplaintPriority = 'CRITICAL' | 'STANDARD' | 'TRIVIAL';
export type UserRole = 'CITIZEN' | 'STAFF' | 'ADMIN';
export interface User { id: string; name: string; email: string; role: 'Administrator' | 'Operations Manager' | 'Field Staff'; avatarUrl?: string; }
export interface Complaint { id: string; userId: string; description: string; imageUrl?: string; latitude: number; longitude: number; address: string; wasteType: string; status: ComplaintStatus; priority?: ComplaintPriority; createdAt: string; updatedAt: string; distanceKm?: number; assignedStaff?: string; reporterName?: string; }
export interface Staff { id: string; name: string; role: string; activeTasks: number; completedTasks: number; currentAssignment: string; status: 'Available' | 'On route' | 'Busy'; }
export interface Task { id: string; complaintId: string; staffId: string; status: ComplaintStatus; dueDate: string; }
export interface DashboardStats { total: number; pending: number; inProgress: number; resolved: number; today: number; activeTasks: number; hotspots: number; }
export interface AnalyticsData { label: string; value: number; }
