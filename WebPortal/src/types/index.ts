export type ComplaintStatus = 'Pending' | 'Assigned' | 'In Progress' | 'Resolved';
export interface User { id: string; name: string; email: string; role: 'Administrator' | 'Operations Manager' | 'Field Staff'; avatarUrl?: string; }
export interface Complaint { id: string; userId: string; description: string; imageUrl?: string; latitude: number; longitude: number; address: string; wasteType: string; status: ComplaintStatus; createdAt: string; updatedAt: string; distanceKm?: number; assignedStaff?: string; reporterName?: string; }
export interface Staff { id: string; name: string; role: string; activeTasks: number; completedTasks: number; currentAssignment: string; status: 'Available' | 'On route' | 'Busy'; }
export interface Task { id: string; complaintId: string; staffId: string; status: ComplaintStatus; dueDate: string; }
export interface DashboardStats { total: number; pending: number; inProgress: number; resolved: number; today: number; activeTasks: number; hotspots: number; }
export interface AnalyticsData { label: string; value: number; }
