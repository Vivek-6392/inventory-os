import api from './api';

export interface AlertItem {
  item_id: string;
  sku: string;
  name: string;
  category_name?: string | null;
  unit_of_measure: string;
  reorder_level: number;
  on_hand: number;
  deficit: number;
  is_dismissed: boolean;
  dismissed_at?: string | null;
  dismissed_by_name?: string | null;
}

export interface AlertCountResponse {
  count: number;
}

export const listAlerts = async (): Promise<AlertItem[]> => {
  const res = await api.get<AlertItem[]>('/alerts');
  return res.data;
};

export const listAllAlerts = async (): Promise<AlertItem[]> => {
  const res = await api.get<AlertItem[]>('/alerts/all');
  return res.data;
};

export const getAlertCount = async (): Promise<number> => {
  const res = await api.get<AlertCountResponse>('/alerts/count');
  return res.data.count;
};

export const dismissAlert = async (itemId: string): Promise<AlertItem> => {
  const res = await api.post<AlertItem>(`/alerts/${itemId}/dismiss`);
  return res.data;
};

export const undismissAlert = async (itemId: string): Promise<AlertItem> => {
  const res = await api.post<AlertItem>(`/alerts/${itemId}/undismiss`);
  return res.data;
};
