export enum UserRole {
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  assigned_locations?: Location[];
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  staff_count?: number;
  movement_count?: number;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit_of_measure: string;
  reorder_level: number;
  category_id: string | null;
  category?: Category;
  archived: boolean;
  created_at: string;
  on_hand?: number;
  stock_by_location?: Record<string, number>;
}

export enum MovementKind {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

export interface StockMovement {
  id: string;
  item_id: string;
  kind: MovementKind;
  quantity: number;
  location_id: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
  reason: string | null;
  recorded_by: string;
  created_at: string;
  recorder?: User;
  location?: Location;
  from_location?: Location;
  to_location?: Location;
}

export interface ItemHistory {
  id: string;
  item_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  changed_by: string;
  changed_by_user?: User;
  created_at: string;
}

export interface AlertItem {
  item: Item;
  total_on_hand: number;
  reorder_level: number;
}

export interface DashboardData {
  active_items: number;
  below_reorder: number;
  movements_today: number;
  distinct_items_this_week: number;
  stock_by_category: Array<{ category: string; quantity: number }>;
  stock_by_location: Array<{ location: string; quantity: number }>;
  weekly_volume: Array<{
    week: string;
    receipts: number;
    issues: number;
  }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: Array<{ row: number; errors: string[] }>;
}
