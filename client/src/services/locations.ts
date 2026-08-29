import api from './api';
import { Location } from '../types';

export const getLocations = async (): Promise<Location[]> => {
  try {
    const res = await api.get<Location[]>('/locations');
    return res.data;
  } catch {
    return [];
  }
};
