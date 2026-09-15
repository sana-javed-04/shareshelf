export type Role = "user" | "admin";
export type ListingType = "RENT" | "DONATE" | "SELL";
export type ItemStatus = "Available" | "Reserved" | "Rented" | "Sold";
export type Category = "Books" | "Electronics" | "Tools" | "Fashion" | "Home" | "Other";
export type Condition = "Brand New" | "Like New" | "Good" | "Fair";
export type TransactionStatus = "Pending" | "Active" | "Returned" | "Completed" | "Cancelled" | "Rejected";
export type ReportStatus = "Pending" | "Reviewed" | "Dismissed";

export const CATEGORIES: Category[] = ["Books", "Electronics", "Tools", "Fashion", "Home", "Other"];
export const CONDITIONS: Condition[] = ["Brand New", "Like New", "Good", "Fair"];
export const LISTING_TYPES: ListingType[] = ["RENT", "DONATE", "SELL"];
export const RADIUS_OPTIONS = [1, 5, 10, 20] as const;
export const REPORT_REASONS = [
  "Fake listing",
  "Wrong information",
  "Unsafe item",
  "Harassment",
  "Other",
] as const;

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  is_banned: boolean;
  latitude: number | null;
  longitude: number | null;
  area_name: string | null;
  total_transactions: number;
  created_at: string;
  updated_at: string;
}

/** Public-safe owner projection — never contains email or exact coordinates. */
export interface OwnerPublic {
  id: number;
  username: string;
  area_name: string | null;
  created_at: string;
  total_transactions: number;
  active_listings: number;
}

export interface Item {
  id: number;
  owner_id: number;
  title: string;
  description: string;
  category: Category;
  item_condition: Condition;
  listing_type: ListingType;
  price: number;
  max_rental_days: number | null;
  latitude: number | null;
  longitude: number | null;
  area_name: string;
  image_path: string | null;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
  distance_km?: number | null;
  owner?: OwnerPublic;
}

export interface Transaction {
  id: number;
  item_id: number;
  borrower_id: number;
  owner_id: number;
  pin_verified: boolean;
  status: TransactionStatus;
  start_date: string | null;
  due_date: string | null;
  return_date: string | null;
  created_at: string;
  updated_at: string;
  item?: Item;
  owner_username?: string;
  borrower_username?: string;
  /** Only ever returned to the approved borrower, once. */
  pickup_pin?: string;
}

export interface ChatMessage {
  id: number;
  item_id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  is_read: boolean;
  timestamp: string;
}

export interface Conversation {
  id: string;
  item_id: number;
  item_title: string;
  item_image: string | null;
  partner_id: number;
  partner_username: string;
  last_message: string;
  last_timestamp: string;
  unread: number;
}

export interface Report {
  id: number;
  reported_by: number;
  reported_by_username?: string;
  reported_user_id: number | null;
  reported_item_id: number | null;
  reason: string;
  description: string | null;
  status: ReportStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ItemQuery {
  q?: string;
  listing_type?: ListingType | "";
  category?: Category | "";
  item_condition?: Condition | "";
  area?: string;
  min_price?: number;
  max_price?: number;
  lat?: number;
  lng?: number;
  radius_km?: number;
  sort?: "newest" | "nearest" | "price_asc" | "price_desc";
  page?: number;
  page_size?: number;
  owner_id?: number;
  include_unavailable?: boolean;
}

export interface Paginated<T> {
  results: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  active_listings: number;
  pending_requests: number;
  active_transactions: number;
  completed_transactions: number;
  unread_messages: number;
}

export interface AdminStats {
  total_users: number;
  total_listings: number;
  available_listings: number;
  active_transactions: number;
  completed_transactions: number;
  pending_reports: number;
}
