export type UserRole = 'customer' | 'kitchen_owner' | 'delivery_partner' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  role: UserRole;
  phone?: string;
}

export interface Kitchen {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  address: string;
  lat: number | null;
  lng: number | null;
  fssai_license_url: string | null;
  id_proof_url: string | null;
  address_proof_url: string | null;
  is_approved: boolean;
  is_open: boolean;
  rating: number;
  total_ratings: number;
  delivery_time: string;
  image_url: string | null;
  categories: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface MenuItem {
  id: string;
  kitchen_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  is_veg: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  address_line: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  created_at: string;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  kitchen_id: string;
  delivery_partner_id: string | null;
  address_id: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  payment_method: 'cod' | 'upi';
  payment_status: 'pending' | 'completed' | 'failed';
  kitchen_rejection_reason: string | null;
  delivery_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  delivery_partner_id: string;
  status: 'assigned' | 'accepted' | 'rejected' | 'picked_up' | 'out_for_delivery' | 'delivered';
  pickup_time: string | null;
  delivery_time: string | null;
  current_lat: number | null;
  current_lng: number | null;
  created_at: string;
}

export interface DeliveryPartner {
  id: string;
  user_id: string;
  vehicle_type: 'bike' | 'scooter' | 'bicycle';
  vehicle_number: string;
  license_number: string;
  license_url: string | null;
  id_proof_url: string | null;
  is_approved: boolean;
  is_online: boolean;
  current_lat: number | null;
  current_lng: number | null;
  total_deliveries: number;
  earnings: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  valid_from: string;
  valid_until: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  customer_id: string;
  kitchen_id: string;
  food_rating: number;
  delivery_rating: number;
  comment: string | null;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_type: 'kitchen' | 'category' | 'url' | 'none' | null;
  link_value: string | null;
  priority: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  kitchen_id: string;
  item_name: string;
  unit: string;
  quantity: number;
  min_threshold: number;
  last_updated: string;
  created_at: string;
}

export interface KitchenEarning {
  id: string;
  kitchen_id: string;
  order_id: string;
  order_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_earnings: number;
  status: 'pending' | 'settled' | 'on_hold';
  settlement_date: string | null;
  created_at: string;
}
