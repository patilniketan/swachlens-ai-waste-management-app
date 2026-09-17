import type { Complaint, ComplaintStatus } from '../types';
export interface ComplaintFilters { status?: ComplaintStatus; wasteType?: string; search?: string; dateFrom?: string; dateTo?: string; }
/** Implement using the existing backend's complaint REST endpoints. */
export async function getComplaints(_filters?: ComplaintFilters): Promise<Complaint[]> { throw new Error('Complaints API is not connected.'); }
export async function updateComplaint(_id: string, _payload: Partial<Complaint>): Promise<Complaint> { throw new Error('Complaints API is not connected.'); }
