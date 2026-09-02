import api from './api';
import type { User, Location } from '../types';

export interface UserWithLocations extends User {
  assigned_locations: Location[];
}

export const getUsers = async (): Promise<UserWithLocations[]> => {
  const res = await api.get<UserWithLocations[]>('/users');
  return res.data;
};

export const getStaffUsers = async (): Promise<User[]> => {
  const res = await api.get<User[]>('/users/staff');
  return res.data;
};

export const assignUserLocations = async (userId: string, locationIds: string[]): Promise<UserWithLocations> => {
  const res = await api.put<UserWithLocations>(`/users/${userId}/locations`, {
    location_ids: locationIds,
  });
  return res.data;
};

export interface CreateStaffPayload {
  name: string;
  email: string;
  password: string;
  location_ids?: string[];
}

export const createStaffUser = async (payload: CreateStaffPayload): Promise<UserWithLocations> => {
  const res = await api.post<UserWithLocations>('/users', payload);
  return res.data;
};
