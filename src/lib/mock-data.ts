import type {
  User,
  EventType,
  EventRole,
  EventMember,
  ExclusionRule,
  CustomField,
  CalendarEvent,
  Booking,
  ActivityItem,
} from "@/types";

// --- Mock Users ---
export const mockUsers: User[] = [
  {
    id: "u1",
    email: "tanaka@example.com",
    full_name: "田中 太郎",
    avatar_url: undefined,
    calendar_status: "connected",
    last_synced_at: "2026-02-18T09:30:00Z",
  },
  {
    id: "u2",
    email: "suzuki@example.com",
    full_name: "鈴木 花子",
    avatar_url: undefined,
    calendar_status: "connected",
    last_synced_at: "2026-02-18T09:25:00Z",
  },
  {
    id: "u3",
    email: "sato@example.com",
    full_name: "佐藤 一郎",
    avatar_url: undefined,
    calendar_status: "error",
    last_synced_at: "2026-02-17T14:00:00Z",
  },
  {
    id: "u4",
    email: "yamada@example.com",
    full_name: "山田 美咲",
    avatar_url: undefined,
    calendar_status: "connected",
    last_synced_at: "2026-02-18T09:28:00Z",
  },
  {
    id: "u5",
    email: "ito@example.com",
    full_name: "伊藤 健太",
    avatar_url: undefined,
    calendar_status: "not_connected",
    last_synced_at: undefined,
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
    color: "#0071c1",
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
    color: "#7c3aed",
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
    color: "#db2777",
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
    color: "#16a34a",
    created_at: "2026-02-05T00:00:00Z",
    updated_at: "2026-02-12T00:00:00Z",
  },
];

// --- Mock Roles ---
export const mockRoles: EventRole[] = [
  { id: "r1", event_id: "evt1", name: "面接責任者", required_count: 1, priority_order: 1 },
  { id: "r2", event_id: "evt1", name: "技術面接官", required_count: 2, priority_order: 2 },
  { id: "r3", event_id: "evt2", name: "面接官", required_count: 3, priority_order: 1 },
  { id: "r4", event_id: "evt3", name: "デザインリード", required_count: 1, priority_order: 1 },
  { id: "r5", event_id: "evt3", name: "面接官", required_count: 1, priority_order: 2 },
  { id: "r6", event_id: "evt4", name: "担当者", required_count: 1, priority_order: 1 },
];

// --- Mock Members ---
export const mockMembers: EventMember[] = [
  { id: "m1", role_id: "r1", user_id: "u1" },
  { id: "m2", role_id: "r1", user_id: "u2" },
  { id: "m3", role_id: "r2", user_id: "u3" },
  { id: "m4", role_id: "r2", user_id: "u4" },
  { id: "m5", role_id: "r2", user_id: "u5" },
  { id: "m6", role_id: "r3", user_id: "u1" },
  { id: "m7", role_id: "r3", user_id: "u2" },
  { id: "m8", role_id: "r3", user_id: "u3" },
  { id: "m9", role_id: "r4", user_id: "u4" },
  { id: "m10", role_id: "r5", user_id: "u1" },
  { id: "m11", role_id: "r5", user_id: "u5" },
  { id: "m12", role_id: "r6", user_id: "u1" },
];

// --- Mock Exclusion Rules ---
export const mockExclusionRules: ExclusionRule[] = [
  {
    id: "ex1",
    event_id: "evt1",
    name: "全社定例会議",
    type: "time-range",
    day_of_week: 1,
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
    day_of_week: 5,
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

    if (day % 2 === 0) {
      events.push({
        id: `cal-u1-${day}-1`,
        user_id: "u1",
        title: "チームMTG",
        start: `${dateStr}T10:00:00`,
        end: `${dateStr}T11:00:00`,
      });
    }

    if (day % 2 === 0) {
      events.push({
        id: `cal-u2-${day}-1`,
        user_id: "u2",
        title: "プロジェクトレビュー",
        start: `${dateStr}T14:00:00`,
        end: `${dateStr}T16:00:00`,
      });
    }

    if (date.getDay() === 1 || date.getDay() === 3 || date.getDay() === 5) {
      events.push({
        id: `cal-u3-${day}-1`,
        user_id: "u3",
        title: "朝会",
        start: `${dateStr}T09:00:00`,
        end: `${dateStr}T09:30:00`,
      });
    }

    if (date.getDay() === 2 || date.getDay() === 4) {
      events.push({
        id: `cal-u4-${day}-1`,
        user_id: "u4",
        title: "1on1",
        start: `${dateStr}T15:00:00`,
        end: `${dateStr}T16:00:00`,
      });
    }

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

export const mockCalendarEvents: CalendarEvent[] = generateMockCalendarEvents();

// --- Mock Bookings (expanded) ---
export const mockBookings: Booking[] = [
  {
    id: "b1",
    event_id: "evt1",
    candidate_name: "高橋 直樹",
    candidate_email: "takahashi@candidate.com",
    start_time: "2026-02-20T10:00:00",
    end_time: "2026-02-20T11:00:00",
    status: "confirmed",
    meeting_url: "https://meet.google.com/abc-defg-hij",
    assigned_members: [
      { user_id: "u1", role_id: "r1" },
      { user_id: "u3", role_id: "r2" },
      { user_id: "u4", role_id: "r2" },
    ],
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
    meeting_url: "https://meet.google.com/klm-nopq-rst",
    assigned_members: [
      { user_id: "u2", role_id: "r1" },
      { user_id: "u3", role_id: "r2" },
      { user_id: "u5", role_id: "r2" },
    ],
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
    assigned_members: [{ user_id: "u1", role_id: "r6" }],
    created_at: "2026-02-16T09:00:00Z",
  },
  {
    id: "b4",
    event_id: "evt2",
    candidate_name: "松本 健一",
    candidate_email: "matsumoto@candidate.com",
    start_time: "2026-02-19T13:00:00",
    end_time: "2026-02-19T14:30:00",
    status: "confirmed",
    assigned_members: [
      { user_id: "u1", role_id: "r3" },
      { user_id: "u2", role_id: "r3" },
      { user_id: "u3", role_id: "r3" },
    ],
    created_at: "2026-02-14T15:00:00Z",
  },
  {
    id: "b5",
    event_id: "evt1",
    candidate_name: "小林 さくら",
    candidate_email: "kobayashi@candidate.com",
    start_time: "2026-02-17T10:00:00",
    end_time: "2026-02-17T11:00:00",
    status: "cancelled",
    assigned_members: [
      { user_id: "u1", role_id: "r1" },
      { user_id: "u4", role_id: "r2" },
      { user_id: "u5", role_id: "r2" },
    ],
    created_at: "2026-02-13T08:00:00Z",
  },
  {
    id: "b6",
    event_id: "evt4",
    candidate_name: "加藤 真理",
    candidate_email: "kato@candidate.com",
    start_time: "2026-02-18T14:00:00",
    end_time: "2026-02-18T14:30:00",
    status: "confirmed",
    meeting_url: "https://meet.google.com/uvw-xyz-123",
    assigned_members: [{ user_id: "u1", role_id: "r6" }],
    created_at: "2026-02-16T11:00:00Z",
  },
  {
    id: "b7",
    event_id: "evt1",
    candidate_name: "吉田 翔太",
    candidate_email: "yoshida@candidate.com",
    start_time: "2026-02-25T11:00:00",
    end_time: "2026-02-25T12:00:00",
    status: "confirmed",
    meeting_url: "https://meet.google.com/456-789-abc",
    assigned_members: [
      { user_id: "u2", role_id: "r1" },
      { user_id: "u3", role_id: "r2" },
      { user_id: "u4", role_id: "r2" },
    ],
    created_at: "2026-02-17T16:00:00Z",
  },
];

// --- Mock Activity Log ---
export const mockActivities: ActivityItem[] = [
  {
    id: "act1",
    type: "booking_created",
    description: "吉田 翔太さんが「エンジニア一次面接」を予約しました",
    timestamp: "2026-02-17T16:00:00Z",
  },
  {
    id: "act2",
    type: "booking_cancelled",
    description: "小林 さくらさんが「エンジニア一次面接」をキャンセルしました",
    timestamp: "2026-02-17T10:00:00Z",
  },
  {
    id: "act3",
    type: "booking_created",
    description: "加藤 真理さんが「カジュアル面談」を予約しました",
    timestamp: "2026-02-16T11:00:00Z",
  },
  {
    id: "act4",
    type: "booking_created",
    description: "中村 大輔さんが「カジュアル面談」を予約しました",
    timestamp: "2026-02-16T09:00:00Z",
  },
  {
    id: "act5",
    type: "booking_created",
    description: "渡辺 あゆみさんが「エンジニア一次面接」を予約しました",
    timestamp: "2026-02-15T12:00:00Z",
  },
  {
    id: "act6",
    type: "booking_created",
    description: "高橋 直樹さんが「エンジニア一次面接」を予約しました",
    timestamp: "2026-02-15T10:00:00Z",
  },
  {
    id: "act7",
    type: "event_created",
    description: "田中 太郎が「カジュアル面談」を作成しました",
    timestamp: "2026-02-05T00:00:00Z",
  },
];

// --- Daily booking stats for chart (past 7 days) ---
export const mockDailyBookingStats = [
  { date: "2/12", count: 1 },
  { date: "2/13", count: 2 },
  { date: "2/14", count: 1 },
  { date: "2/15", count: 3 },
  { date: "2/16", count: 2 },
  { date: "2/17", count: 1 },
  { date: "2/18", count: 2 },
];

// --- Helper functions ---
export function getEventData(eventId: string) {
  const event = mockEventTypes.find((e) => e.id === eventId);
  const roles = mockRoles.filter((r) => r.event_id === eventId);
  const roleIds = roles.map((r) => r.id);
  const members = mockMembers.filter((m) => roleIds.includes(m.role_id));
  const exclusionRules = mockExclusionRules.filter((r) => r.event_id === eventId);
  const customFields = mockCustomFields.filter((f) => f.event_id === eventId);
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
