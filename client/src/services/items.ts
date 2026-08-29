import api from './api';
import type { Item, PaginatedResponse } from '../types';

export interface GetItemsParams {
  search?: string;
  category_id?: string;
  location_id?: string;
  archived?: boolean;
  below_reorder?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ItemFormData {
  sku: string;
  name: string;
  description?: string;
  unit_of_measure: string;
  reorder_level: number;
  category_id?: string | null;
}

export const getItems = async (params: GetItemsParams = {}): Promise<PaginatedResponse<Item>> => {
  const cleanParams: Record<string, any> = {};
  if (params.search) cleanParams.search = params.search;
  if (params.category_id) cleanParams.category_id = params.category_id;
  if (params.location_id) cleanParams.location_id = params.location_id;
  if (params.archived !== undefined) cleanParams.archived = params.archived;
  if (params.below_reorder) cleanParams.below_reorder = true;
  if (params.sort_by) cleanParams.sort_by = params.sort_by;
  if (params.sort_order) cleanParams.sort_order = params.sort_order;
  if (params.page) cleanParams.page = params.page;
  if (params.limit) cleanParams.limit = params.limit;

  const res = await api.get<PaginatedResponse<Item>>('/items', { params: cleanParams });
  return res.data;
};

export const getItem = async (id: string): Promise<Item> => {
  const res = await api.get<Item>(`/items/${id}`);
  return res.data;
};

export const createItem = async (data: ItemFormData): Promise<Item> => {
  const res = await api.post<Item>('/items', data);
  return res.data;
};

export const updateItem = async (id: string, data: Partial<ItemFormData>): Promise<Item> => {
  const res = await api.put<Item>(`/items/${id}`, data);
  return res.data;
};

export const toggleArchiveItem = async (id: string): Promise<Item> => {
  const res = await api.patch<Item>(`/items/${id}/archive`);
  return res.data;
};
