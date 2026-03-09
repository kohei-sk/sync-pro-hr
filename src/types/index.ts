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
export type SchedulingMode = "fixed" | "pool" | "weekday";

// --- Reception Settings ---
export interface ReceptionSettings {
  exclude_outside_hours: boolean; // 営業時間外は受け付けない
  allowed_days: boolean[];        // [月, 火, 水, 木, 金, 土, 日] インデックス順
  accept_holidays: boolean;       // 祝日は受け付ける
}

// --- Weekday Schedule (曜日モード用) ---
export interface WeekdayScheduleEntry {
  day_index: number;    // 0=月, 1=火, 2=水, 3=木, 4=金, 5=土, 6=日
  member_ids: string[]; // 優先順にソート済みユーザーID
}

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
  reminder_settings?: ReminderSetting[];
  reception_settings?: ReceptionSettings;
  weekday_schedule?: WeekdayScheduleEntry[];
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
  candidate_phone?: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  assigned_members?: AssignedMember[];
  custom_field_values?: Record<string, string>;
  meeting_url?: string;
  reminders?: BookingReminder[];
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

// --- Reminders ---
export type ReminderChannel = "email" | "sms" | "both";

export interface ReminderTiming {
  value: number;
  unit: "hours" | "days";
}

export interface ReminderSetting {
  id: string;
  channel: ReminderChannel;
  timing: ReminderTiming;
  message: string;
  is_enabled: boolean;
}

export type ReminderStatus = "pending" | "sent" | "skipped";

export interface BookingReminder {
  reminder_id: string;
  channel: ReminderChannel;
  scheduled_at: string;
  sent_at?: string;
  status: ReminderStatus;
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
