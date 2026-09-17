export type ComplaintStatus = 'Pending' | 'Assigned' | 'In Progress' | 'Resolved';

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
  createdAt: string;
  updatedAt: string;
  distanceKm?: number; // present on /nearby responses when backend supplies it
}

export interface CreateComplaintPayload {
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
  radius: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}
