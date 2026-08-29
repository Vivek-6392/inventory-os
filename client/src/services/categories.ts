import api from './api';
import type { Category } from '../types';

export const getCategories = async (): Promise<Category[]> => {
  const res = await api.get<Category[]>('/categories');
  return res.data;
};

export const createCategory = async (name: string): Promise<Category> => {
  const res = await api.post<Category>('/categories', { name });
  return res.data;
};

export const updateCategory = async (id: string, name: string): Promise<Category> => {
  const res = await api.put<Category>(`/categories/${id}`, { name });
  return res.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/categories/${id}`);
};
