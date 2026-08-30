import api from './api';
import type { ItemHistory } from '../types';

export const getItemHistory = async (
  itemId: string,
  actionType: 'ALL' | 'CHANGES' | 'NOTES' = 'ALL'
): Promise<ItemHistory[]> => {
  const res = await api.get<ItemHistory[]>(`/items/${itemId}/history`, {
    params: { action_type: actionType },
  });
  return res.data;
};

export const addItemNote = async (
  itemId: string,
  note: string
): Promise<ItemHistory> => {
  const res = await api.post<ItemHistory>(`/items/${itemId}/notes`, { note });
  return res.data;
};
