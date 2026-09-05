import api from './api';
import type { Location, User } from '../types';

export interface LocationFormData {
  name: string;
  description?: string;
  address?: string;
  type?: string;
  is_active?: boolean;
  image_url?: string;
  latitude?: number;
  longitude?: number;
}

export const getLocations = async (): Promise<Location[]> => {
  const res = await api.get<Location[]>('/locations');
  return res.data;
};

export const getLocation = async (id: string): Promise<Location> => {
  const res = await api.get<Location>(`/locations/${id}`);
  return res.data;
};

export const createLocation = async (data: LocationFormData): Promise<Location> => {
  const res = await api.post<Location>('/locations', data);
  return res.data;
};

export const updateLocation = async (id: string, data: Partial<LocationFormData>): Promise<Location> => {
  const res = await api.put<Location>(`/locations/${id}`, data);
  return res.data;
};

export const deleteLocation = async (id: string): Promise<void> => {
  await api.delete(`/locations/${id}`);
};

export const getLocationStaff = async (locationId: string): Promise<User[]> => {
  const res = await api.get<User[]>(`/locations/${locationId}/staff`);
  return res.data;
};

export const setLocationStaff = async (locationId: string, staffUserIds: string[]): Promise<User[]> => {
  const res = await api.put<User[]>(`/locations/${locationId}/staff`, {
    staff_user_ids: staffUserIds,
  });
  return res.data;
};
