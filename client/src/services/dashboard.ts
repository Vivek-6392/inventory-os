import api from './api';

export interface CategoryStockDistribution {
  category_id?: string | null;
  category_name: string;
  item_count: number;
  total_stock: number;
}

export interface LocationStockDistribution {
  location_id: string;
  location_name: string;
  total_stock: number;
  movement_count: number;
}

export interface LowStockItemSummary {
  item_id: string;
  sku: string;
  name: string;
  category_name?: string | null;
  unit_of_measure: string;
  reorder_level: number;
  on_hand: number;
  deficit: number;
}

export interface RecentMovementSummary {
  id: string;
  item_name: string;
  item_sku: string;
  kind: string;
  quantity: number;
  location_name?: string | null;
  from_location_name?: string | null;
  to_location_name?: string | null;
  reason?: string | null;
  user_name: string;
  created_at: string;
}

export interface MovementTrendDay {
  date: string;
  receipts: number;
  issues: number;
  transfers: number;
  adjustments: number;
}

export interface MovementTrendWeek {
  week_label: string;
  receipts: number;
  issues: number;
  transfers: number;
  adjustments: number;
}

export interface DashboardStats {
  total_items: number;
  archived_items: number;
  total_stock_units: number;
  low_stock_count: number;
  total_locations: number;
  total_movements: number;
  movements_today: number;
  distinct_items_moved_this_week: number;
  category_distribution: CategoryStockDistribution[];
  location_distribution: LocationStockDistribution[];
  low_stock_items: LowStockItemSummary[];
  recent_movements: RecentMovementSummary[];
  movement_trends: MovementTrendDay[];
  weekly_movement_trends?: MovementTrendWeek[];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await api.get<DashboardStats>('/dashboard/stats');
  return res.data;
};
