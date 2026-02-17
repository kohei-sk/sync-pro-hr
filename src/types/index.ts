// ============================================================
// SyncPro HR - Core Type Definitions
// ============================================================

// --- User ---
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
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
  duration: number; // minutes
  buffer_before: number; // minutes
  buffer_after: number; // minutes
  location_type: LocationType;
  location_detail?: string; // URL or address
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
  name: string; // e.g., "責任者", "面接官", "同席者"
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
  name: string; // e.g., "定例会議"
  type: ExclusionType;
  day_of_week?: number; // 0=Sun, 1=Mon, ..., 6=Sat
  specific_date?: string; // ISO date string
  start_time?: string; // HH:mm
  end_time?: string; // HH:mm
  recurring: boolean;
}

// --- Custom Form Fields ---
export type FieldType = "text" | "email" | "tel" | "multiline" | "url";

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
  start_time: string; // ISO datetime
  end_time: string; // ISO datetime
  status: BookingStatus;
  assigned_members?: AssignedMember[];
  custom_field_values?: Record<string, string>;
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
  start: string; // ISO datetime
  end: string; // ISO datetime
}

export interface TimeSlot {
  start: string; // ISO datetime
  end: string; // ISO datetime
  available_members?: AvailableMembersByRole[];
}

export interface AvailableMembersByRole {
  role_id: string;
  role_name: string;
  available_user_ids: string[];
}

// --- Scheduler Input ---
export interface SchedulerInput {
  event: EventType;
  roles: EventRole[];
  members: EventMember[];
  exclusion_rules: ExclusionRule[];
  calendar_events: CalendarEvent[];
  date_range: {
    start: string; // ISO date
    end: string; // ISO date
  };
  working_hours: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
}

// --- Scheduler Output ---
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
