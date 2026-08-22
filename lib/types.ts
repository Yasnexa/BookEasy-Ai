export type UserRole = 'customer' | 'business_owner' | 'staff' | 'super_admin';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'rescheduled'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export type BusinessStatus = 'pending' | 'approved' | 'suspended' | 'deactivated';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  address: string;
  city: string;
  phone: string;
  email: string | null;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  heading_color: string;
  body_color: string;
  muted_color: string;
  button_text_color: string;
  button_hover_bg_color: string;
  button_hover_text_color: string;
  nav_text_color: string;
  card_text_color: string;
  status: BusinessStatus;
  rating: number;
  review_count: number;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  category: string | null;
  active: boolean;
  created_at: string;
}

export interface Staff {
  id: string;
  business_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role_title: string;
  bio: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
}

export interface WorkingHours {
  id: string;
  staff_id: string;
  day_of_week: number; // 0 = Sunday
  start_time: string; // "09:00"
  end_time: string; // "17:00"
  is_working: boolean;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

export interface Customer {
  id: string;
  business_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  total_visits: number;
  last_visit: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  service_id: string;
  staff_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  service_name: string;
  staff_name: string;
  start_time: string; // ISO
  end_time: string; // ISO
  duration_minutes: number;
  price: number;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  business_id: string | null;
  type: 'booking' | 'reminder' | 'cancellation' | 'system' | 'review';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  business_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  amount: number;
  created_at: string;
}

export interface Review {
  id: string;
  business_id: string;
  customer_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  suggested_slots?: TimeSlot[];
  pending_action?: 'book' | 'reschedule' | 'cancel' | 'confirm' | null;
}
