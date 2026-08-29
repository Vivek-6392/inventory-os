import api from './api';
import { MovementKind, type StockMovement, type PaginatedResponse } from '../types';

export interface MovementCreatePayload {
  item_id: string;
  kind: MovementKind;
  quantity: number;
  location_id?: string | null;
  from_location_id?: string | null;
  to_location_id?: string | null;
  reason?: string | null;
}

export interface GetMovementsParams {
  item_id?: string;
  location_id?: string;
  kind?: MovementKind;
  page?: number;
  limit?: number;
}

export const recordMovement = async (payload: MovementCreatePayload): Promise<StockMovement> => {
  const res = await api.post<StockMovement>('/movements', payload);
  return res.data;
};

export const getMovements = async (params: GetMovementsParams = {}): Promise<PaginatedResponse<StockMovement>> => {
  const cleanParams: Record<string, any> = {};
  if (params.item_id) cleanParams.item_id = params.item_id;
  if (params.location_id) cleanParams.location_id = params.location_id;
  if (params.kind) cleanParams.kind = params.kind;
  if (params.page) cleanParams.page = params.page;
  if (params.limit) cleanParams.limit = params.limit;

  const res = await api.get<PaginatedResponse<StockMovement>>('/movements', { params: cleanParams });
  return res.data;
};

export const getItemMovements = async (itemId: string): Promise<StockMovement[]> => {
  const res = await api.get<StockMovement[]>(`/movements/item/${itemId}`);
  return res.data;
};
