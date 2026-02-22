// ============================================================
// SyncPro HR - Core Type Definitions
// ============================================================

// --- User ---
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  status?: "active" | "invited";
  role?: "admin" | "member";
  calendar_status?: "connected" | "error" | "not_connected";
  last_synced_at?: string;
}

// --- Event Types ---
export type EventStatus = "active" | "draft" | "archived";
export type LocationType = "online" | "in-person" | "phone";
export type SchedulingMode = "fixed" | "pool";

export interface EventType {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description?: string;
  duration: number;
  buffer_before: number;
  buffer_after: number;
  location_type: LocationType;
  location_detail?: string;
  status: EventStatus;
  scheduling_mode: SchedulingMode;
  color?: string;
  created_at: string;
  updated_at: string;
}

// --- Event Roles (for pool mode) ---
export interface EventRole {
  id: string;
  event_id: string;
  name: string;
  required_count: number;
  priority_order: number;
}

// --- Event Members ---
export interface EventMember {
  id: string;
  role_id: string;
  user_id: string;
  user?: User;
}

// --- Exclusion Rules ---
export type ExclusionType = "all-day" | "time-range";

export interface ExclusionRule {
  id: string;
  event_id: string;
  name: string;
  type: ExclusionType;
  day_of_week?: number;
  specific_date?: string;
  start_time?: string;
  end_time?: string;
  recurring: boolean;
}

// --- Custom Form Fields ---
export type FieldType = "text" | "email" | "tel" | "multiline" | "url" | "file";

export interface CustomField {
  id: string;
  event_id: string;
  label: string;
  type: FieldType;
  is_required: boolean;
  sort_order: number;
  placeholder?: string;
}

// --- Bookings ---
export type BookingStatus = "confirmed" | "cancelled" | "pending";

export interface Booking {
  id: string;
  event_id: string;
  candidate_name: string;
  candidate_email: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  assigned_members?: AssignedMember[];
  custom_field_values?: Record<string, string>;
  meeting_url?: string;
  created_at: string;
}

export interface AssignedMember {
  user_id: string;
  role_id: string;
  user?: User;
}

// --- Calendar / Scheduling ---
export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  start: string;
  end: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available_members?: AvailableMembersByRole[];
}

export interface AvailableMembersByRole {
  role_id: string;
  role_name: string;
  available_user_ids: string[];
}

// --- Scheduler ---
export interface SchedulerInput {
  event: EventType;
  roles: EventRole[];
  members: EventMember[];
  exclusion_rules: ExclusionRule[];
  calendar_events: CalendarEvent[];
  date_range: { start: string; end: string };
  working_hours: { start: string; end: string };
}

export interface SchedulerOutput {
  available_slots: TimeSlot[];
}

// --- Form Submission ---
export interface BookingFormData {
  candidate_name: string;
  candidate_email: string;
  selected_slot: TimeSlot;
  custom_fields: Record<string, string>;
}

// --- Activity Log ---
export interface ActivityItem {
  id: string;
  type: "booking_created" | "booking_cancelled" | "event_created" | "member_added";
  description: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

// --- Notifications ---
export type NotificationType = "booking_received" | "booking_changed" | "booking_cancelled";

export interface Notification {
  id: string;
  type: NotificationType;
  booking_id: string;
  candidate_name: string;
  event_title: string;
  message: string;
  timestamp: string;
  is_read: boolean;
}
