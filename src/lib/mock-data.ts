import type {
  User,
  EventType,
  EventRole,
  EventMember,
  ExclusionRule,
  CustomField,
  CalendarEvent,
  Booking,
} from "@/types";

// --- Mock Users ---
export const mockUsers: User[] = [
  {
    id: "u1",
    email: "tanaka@example.com",
    full_name: "田中 太郎",
    avatar_url: undefined,
  },
  {
    id: "u2",
    email: "suzuki@example.com",
    full_name: "鈴木 花子",
    avatar_url: undefined,
  },
  {
    id: "u3",
    email: "sato@example.com",
    full_name: "佐藤 一郎",
    avatar_url: undefined,
  },
  {
    id: "u4",
    email: "yamada@example.com",
    full_name: "山田 美咲",
    avatar_url: undefined,
  },
  {
    id: "u5",
    email: "ito@example.com",
    full_name: "伊藤 健太",
    avatar_url: undefined,
  },
];

// --- Mock Event Types ---
export const mockEventTypes: EventType[] = [
  {
    id: "evt1",
    user_id: "u1",
    title: "エンジニア一次面接",
    slug: "engineer-first",
    description: "エンジニア採用の一次技術面接（60分）",
    duration: 60,
    buffer_before: 15,
    buffer_after: 15,
    location_type: "online",
    location_detail: "Google Meet (自動生成)",
    status: "active",
    scheduling_mode: "pool",
    color: "#3b82f6",
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-02-10T00:00:00Z",
  },
  {
    id: "evt2",
    user_id: "u1",
    title: "エンジニア最終面接",
    slug: "engineer-final",
    description: "エンジニア採用の最終面接（90分）",
    duration: 90,
    buffer_before: 30,
    buffer_after: 15,
    location_type: "in-person",
    location_detail: "本社 会議室A",
    status: "active",
    scheduling_mode: "fixed",
    color: "#8b5cf6",
    created_at: "2026-01-20T00:00:00Z",
    updated_at: "2026-02-10T00:00:00Z",
  },
  {
    id: "evt3",
    user_id: "u1",
    title: "デザイナー面接",
    slug: "designer-interview",
    description: "デザイナー採用のポートフォリオレビュー＋面接（45分）",
    duration: 45,
    buffer_before: 15,
    buffer_after: 15,
    location_type: "online",
    location_detail: "Zoom",
    status: "draft",
    scheduling_mode: "pool",
    color: "#ec4899",
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
  {
    id: "evt4",
    user_id: "u1",
    title: "カジュアル面談",
    slug: "casual-chat",
    description: "カジュアルな採用面談（30分）",
    duration: 30,
    buffer_before: 0,
    buffer_after: 15,
    location_type: "online",
    location_detail: "Google Meet",
    status: "active",
    scheduling_mode: "fixed",
    color: "#22c55e",
    created_at: "2026-02-05T00:00:00Z",
    updated_at: "2026-02-12T00:00:00Z",
  },
];

// --- Mock Roles ---
export const mockRoles: EventRole[] = [
  // evt1: エンジニア一次面接 (pool mode)
  {
    id: "r1",
    event_id: "evt1",
    name: "面接責任者",
    required_count: 1,
    priority_order: 1,
  },
  {
    id: "r2",
    event_id: "evt1",
    name: "技術面接官",
    required_count: 2,
    priority_order: 2,
  },
  // evt2: エンジニア最終面接 (fixed mode)
  {
    id: "r3",
    event_id: "evt2",
    name: "面接官",
    required_count: 3,
    priority_order: 1,
  },
  // evt3: デザイナー面接 (pool mode)
  {
    id: "r4",
    event_id: "evt3",
    name: "デザインリード",
    required_count: 1,
    priority_order: 1,
  },
  {
    id: "r5",
    event_id: "evt3",
    name: "面接官",
    required_count: 1,
    priority_order: 2,
  },
  // evt4: カジュアル面談 (fixed mode)
  {
    id: "r6",
    event_id: "evt4",
    name: "担当者",
    required_count: 1,
    priority_order: 1,
  },
];

// --- Mock Members ---
export const mockMembers: EventMember[] = [
  // evt1 roles
  { id: "m1", role_id: "r1", user_id: "u1" },
  { id: "m2", role_id: "r1", user_id: "u2" },
  { id: "m3", role_id: "r2", user_id: "u3" },
  { id: "m4", role_id: "r2", user_id: "u4" },
  { id: "m5", role_id: "r2", user_id: "u5" },
  // evt2 roles
  { id: "m6", role_id: "r3", user_id: "u1" },
  { id: "m7", role_id: "r3", user_id: "u2" },
  { id: "m8", role_id: "r3", user_id: "u3" },
  // evt3 roles
  { id: "m9", role_id: "r4", user_id: "u4" },
  { id: "m10", role_id: "r5", user_id: "u1" },
  { id: "m11", role_id: "r5", user_id: "u5" },
  // evt4 roles
  { id: "m12", role_id: "r6", user_id: "u1" },
];

// --- Mock Exclusion Rules ---
export const mockExclusionRules: ExclusionRule[] = [
  {
    id: "ex1",
    event_id: "evt1",
    name: "全社定例会議",
    type: "time-range",
    day_of_week: 1, // Monday
    start_time: "09:00",
    end_time: "10:00",
    recurring: true,
  },
  {
    id: "ex2",
    event_id: "evt1",
    name: "昼休み",
    type: "time-range",
    day_of_week: undefined,
    start_time: "12:00",
    end_time: "13:00",
    recurring: true,
  },
  {
    id: "ex3",
    event_id: "evt2",
    name: "スプリントレビュー",
    type: "time-range",
    day_of_week: 5, // Friday
    start_time: "15:00",
    end_time: "17:00",
    recurring: true,
  },
];

// --- Mock Custom Fields ---
export const mockCustomFields: CustomField[] = [
  {
    id: "cf1",
    event_id: "evt1",
    label: "GitHub URL",
    type: "url",
    is_required: false,
    sort_order: 1,
    placeholder: "https://github.com/username",
  },
  {
    id: "cf2",
    event_id: "evt1",
    label: "希望年収",
    type: "text",
    is_required: false,
    sort_order: 2,
    placeholder: "例: 600万円",
  },
  {
    id: "cf3",
    event_id: "evt1",
    label: "備考・質問",
    type: "multiline",
    is_required: false,
    sort_order: 3,
    placeholder: "事前にお伝えしたいことがあればご記入ください",
  },
  {
    id: "cf4",
    event_id: "evt3",
    label: "ポートフォリオURL",
    type: "url",
    is_required: true,
    sort_order: 1,
    placeholder: "https://your-portfolio.com",
  },
];

// --- Mock Calendar Events (busy times) ---
function generateMockCalendarEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const baseDate = new Date("2026-02-18");

  for (let day = 0; day < 14; day++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + day);

    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dateStr = date.toISOString().split("T")[0];

    // u1 has meetings 10-11 most days
    if (day % 2 === 0) {
      events.push({
        id: `cal-u1-${day}-1`,
        user_id: "u1",
        title: "チームMTG",
        start: `${dateStr}T10:00:00`,
        end: `${dateStr}T11:00:00`,
      });
    }

    // u2 is busy 14-16 on even days
    if (day % 2 === 0) {
      events.push({
        id: `cal-u2-${day}-1`,
        user_id: "u2",
        title: "プロジェクトレビュー",
        start: `${dateStr}T14:00:00`,
        end: `${dateStr}T16:00:00`,
      });
    }

    // u3 has morning meetings MWF
    if (date.getDay() === 1 || date.getDay() === 3 || date.getDay() === 5) {
      events.push({
        id: `cal-u3-${day}-1`,
        user_id: "u3",
        title: "朝会",
        start: `${dateStr}T09:00:00`,
        end: `${dateStr}T09:30:00`,
      });
    }

    // u4 has afternoon slot on TTh
    if (date.getDay() === 2 || date.getDay() === 4) {
      events.push({
        id: `cal-u4-${day}-1`,
        user_id: "u4",
        title: "1on1",
        start: `${dateStr}T15:00:00`,
        end: `${dateStr}T16:00:00`,
      });
    }

    // u5 has lunch meeting on Wed
    if (date.getDay() === 3) {
      events.push({
        id: `cal-u5-${day}-1`,
        user_id: "u5",
        title: "ランチMTG",
        start: `${dateStr}T11:30:00`,
        end: `${dateStr}T13:00:00`,
      });
    }
  }

  return events;
}

export const mockCalendarEvents: CalendarEvent[] =
  generateMockCalendarEvents();

// --- Mock Bookings ---
export const mockBookings: Booking[] = [
  {
    id: "b1",
    event_id: "evt1",
    candidate_name: "高橋 直樹",
    candidate_email: "takahashi@candidate.com",
    start_time: "2026-02-20T10:00:00",
    end_time: "2026-02-20T11:00:00",
    status: "confirmed",
    created_at: "2026-02-15T10:00:00Z",
  },
  {
    id: "b2",
    event_id: "evt1",
    candidate_name: "渡辺 あゆみ",
    candidate_email: "watanabe@candidate.com",
    start_time: "2026-02-21T14:00:00",
    end_time: "2026-02-21T15:00:00",
    status: "confirmed",
    created_at: "2026-02-15T12:00:00Z",
  },
  {
    id: "b3",
    event_id: "evt4",
    candidate_name: "中村 大輔",
    candidate_email: "nakamura@candidate.com",
    start_time: "2026-02-22T11:00:00",
    end_time: "2026-02-22T11:30:00",
    status: "pending",
    created_at: "2026-02-16T09:00:00Z",
  },
];

// --- Helper to get mock data for a specific event ---
export function getEventData(eventId: string) {
  const event = mockEventTypes.find((e) => e.id === eventId);
  const roles = mockRoles.filter((r) => r.event_id === eventId);
  const roleIds = roles.map((r) => r.id);
  const members = mockMembers.filter((m) => roleIds.includes(m.role_id));
  const exclusionRules = mockExclusionRules.filter(
    (r) => r.event_id === eventId
  );
  const customFields = mockCustomFields.filter(
    (f) => f.event_id === eventId
  );
  const bookings = mockBookings.filter((b) => b.event_id === eventId);

  return { event, roles, members, exclusionRules, customFields, bookings };
}

export function getEventBySlug(slug: string) {
  const event = mockEventTypes.find((e) => e.slug === slug);
  if (!event) return null;
  return getEventData(event.id);
}

export function getUserById(userId: string) {
  return mockUsers.find((u) => u.id === userId);
}
