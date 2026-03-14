import type {
  SchedulerInput,
  SchedulerOutput,
  TimeSlot,
  AvailableMembersByRole,
  CalendarEvent,
  ExclusionRule,
  EventRole,
  EventMember,
  WeekdayScheduleEntry,
} from "@/types";
import { getEventData, mockCalendarEvents } from "./mock-data";

// ============================================================
// Pitasuke - Scheduling Engine (Intersection Engine)
// ============================================================
// Computes available time slots by intersecting:
// 1. Calendar busy times for all team members
// 2. Buffer times (before/after each slot)
// 3. Exclusion rules (recurring or specific date blocks)
// 4. Role-based requirements (fixed mode or pool mode)
// ============================================================

interface TimeRange {
  start: Date;
  end: Date;
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Get busy times for a user from their calendar events,
 * including buffer times around each event.
 */
function getUserBusyTimes(
  userId: string,
  calendarEvents: CalendarEvent[],
  bufferBefore: number,
  bufferAfter: number
): TimeRange[] {
  return calendarEvents
    .filter((event) => event.user_id === userId)
    .map((event) => ({
      start: new Date(
        new Date(event.start).getTime() - bufferBefore * 60 * 1000
      ),
      end: new Date(new Date(event.end).getTime() + bufferAfter * 60 * 1000),
    }));
}

/**
 * Check if a time range conflicts with any exclusion rules.
 */
function isExcluded(
  slot: TimeRange,
  exclusionRules: ExclusionRule[]
): boolean {
  for (const rule of exclusionRules) {
    if (rule.type === "all-day") {
      if (rule.specific_date && isSameDay(slot.start, new Date(rule.specific_date))) {
        return true;
      }
      if (rule.recurring && rule.day_of_week !== undefined) {
        if (slot.start.getDay() === rule.day_of_week) {
          return true;
        }
      }
    }

    if (rule.type === "time-range" && rule.start_time && rule.end_time) {
      const ruleStart = parseTime(rule.start_time);
      const ruleEnd = parseTime(rule.end_time);

      // Check if rule applies to this day
      let applies = false;
      if (rule.specific_date) {
        applies = isSameDay(slot.start, new Date(rule.specific_date));
      } else if (rule.recurring) {
        if (rule.day_of_week !== undefined) {
          applies = slot.start.getDay() === rule.day_of_week;
        } else {
          // Recurring every day (e.g., lunch break)
          applies = true;
        }
      }

      if (applies) {
        const exclusionStart = new Date(slot.start);
        exclusionStart.setHours(ruleStart.hours, ruleStart.minutes, 0, 0);
        const exclusionEnd = new Date(slot.start);
        exclusionEnd.setHours(ruleEnd.hours, ruleEnd.minutes, 0, 0);

        if (rangesOverlap(slot, { start: exclusionStart, end: exclusionEnd })) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a user is available during a specific time slot.
 */
function isUserAvailable(
  userId: string,
  slot: TimeRange,
  busyTimesMap: Map<string, TimeRange[]>
): boolean {
  const busyTimes = busyTimesMap.get(userId) || [];
  return !busyTimes.some((busy) => rangesOverlap(slot, busy));
}

/**
 * JS の getDay() (0=日,1=月,...,6=土) を
 * Pitasuke の day_index (0=月,1=火,...,5=土,6=日) に変換する。
 */
function jsDayToPitasuke(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/**
 * Generate candidate time slots for a date range.
 * allowedDays: Pitasuke形式 [0=月,1=火,...,5=土,6=日]。
 * 未指定の場合は平日(月〜金)のみ生成。
 */
function generateCandidateSlots(
  startDate: string,
  endDate: string,
  workingHoursStart: string,
  workingHoursEnd: string,
  durationMinutes: number,
  stepMinutes: number = 30,
  allowedDays?: boolean[]
): TimeRange[] {
  const slots: TimeRange[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const whStart = parseTime(workingHoursStart);
  const whEnd = parseTime(workingHoursEnd);

  const current = new Date(start);
  while (current <= end) {
    const pitasukeDayIndex = jsDayToPitasuke(current.getDay());
    // allowedDays が指定されていればそれを使い、なければ平日(Pitasuke 0-4)のみ
    const dayIsAllowed = allowedDays
      ? allowedDays[pitasukeDayIndex] === true
      : pitasukeDayIndex <= 4; // 0=月〜4=金
    if (dayIsAllowed) {
      const dayStart = new Date(current);
      dayStart.setHours(whStart.hours, whStart.minutes, 0, 0);

      const dayEnd = new Date(current);
      dayEnd.setHours(whEnd.hours, whEnd.minutes, 0, 0);

      const slotStart = new Date(dayStart);
      while (slotStart.getTime() + durationMinutes * 60 * 1000 <= dayEnd.getTime()) {
        const slotEnd = new Date(
          slotStart.getTime() + durationMinutes * 60 * 1000
        );
        slots.push({ start: new Date(slotStart), end: new Date(slotEnd) });
        slotStart.setMinutes(slotStart.getMinutes() + stepMinutes);
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return slots;
}

/**
 * Main scheduling function - Fixed Mode
 * All specified members must be available.
 */
function computeFixedMode(
  candidateSlots: TimeRange[],
  roles: EventRole[],
  members: EventMember[],
  busyTimesMap: Map<string, TimeRange[]>,
  exclusionRules: ExclusionRule[]
): TimeSlot[] {
  const allUserIds = members.map((m) => m.user_id);

  return candidateSlots
    .filter((slot) => {
      if (isExcluded(slot, exclusionRules)) return false;

      // All members must be available
      return allUserIds.every((userId) =>
        isUserAvailable(userId, slot, busyTimesMap)
      );
    })
    .map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      available_members: roles.map((role) => {
        const roleMembers = members.filter((m) => m.role_id === role.id);
        return {
          role_id: role.id,
          role_name: role.name,
          available_user_ids: roleMembers.map((m) => m.user_id),
        };
      }),
    }));
}

/**
 * Main scheduling function - Pool Mode
 * For each role, at least required_count members must be available.
 */
function computePoolMode(
  candidateSlots: TimeRange[],
  roles: EventRole[],
  members: EventMember[],
  busyTimesMap: Map<string, TimeRange[]>,
  exclusionRules: ExclusionRule[]
): TimeSlot[] {
  return candidateSlots
    .filter((slot) => {
      if (isExcluded(slot, exclusionRules)) return false;

      // For each role, check if enough members are available
      return roles.every((role) => {
        const roleMembers = members.filter((m) => m.role_id === role.id);
        const availableCount = roleMembers.filter((m) =>
          isUserAvailable(m.user_id, slot, busyTimesMap)
        ).length;
        return availableCount >= role.required_count;
      });
    })
    .map((slot) => {
      const available_members: AvailableMembersByRole[] = roles.map(
        (role) => {
          const roleMembers = members.filter((m) => m.role_id === role.id);
          const availableUserIds = roleMembers
            .filter((m) => isUserAvailable(m.user_id, slot, busyTimesMap))
            .map((m) => m.user_id);

          return {
            role_id: role.id,
            role_name: role.name,
            available_user_ids: availableUserIds,
          };
        }
      );

      return {
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        available_members,
      };
    });
}

/**
 * Main scheduling function - Weekday Mode
 * 曜日ごとに担当メンバーが決まっている。全員が空き状態のスロットのみ返す。
 * weekdaySchedule の day_index は Pitasuke形式 (0=月,...,5=土,6=日)。
 */
function computeWeekdayMode(
  candidateSlots: TimeRange[],
  weekdaySchedule: WeekdayScheduleEntry[],
  busyTimesMap: Map<string, TimeRange[]>,
  exclusionRules: ExclusionRule[]
): TimeSlot[] {
  // Pitasuke day_index → member_ids のマップを構築
  const scheduledDays = new Map<number, string[]>(
    weekdaySchedule.map((ws) => [ws.day_index, ws.member_ids])
  );

  return candidateSlots
    .filter((slot) => {
      if (isExcluded(slot, exclusionRules)) return false;

      const pitasukeDayIndex = jsDayToPitasuke(slot.start.getDay());
      const memberIds = scheduledDays.get(pitasukeDayIndex);

      // その曜日にメンバーが設定されていなければスキップ
      if (!memberIds || memberIds.length === 0) return false;

      // 担当全員が空き状態であること
      return memberIds.every((userId) =>
        isUserAvailable(userId, slot, busyTimesMap)
      );
    })
    .map((slot) => {
      const pitasukeDayIndex = jsDayToPitasuke(slot.start.getDay());
      const memberIds = scheduledDays.get(pitasukeDayIndex) || [];
      return {
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        available_members: [
          {
            role_id: `weekday-${pitasukeDayIndex}`,
            role_name: `曜日担当`,
            available_user_ids: memberIds,
          },
        ],
      };
    });
}

/**
 * Compute available time slots based on the scheduling input.
 * This is the main entry point for the scheduling engine.
 */
export function computeAvailableSlots(
  input: SchedulerInput
): SchedulerOutput {
  const {
    event,
    roles,
    members,
    exclusion_rules,
    calendar_events,
    date_range,
    working_hours,
  } = input;

  // Build busy times map for each user (with buffers)
  const allUserIds = [...new Set(members.map((m) => m.user_id))];
  const busyTimesMap = new Map<string, TimeRange[]>();

  for (const userId of allUserIds) {
    busyTimesMap.set(
      userId,
      getUserBusyTimes(
        userId,
        calendar_events,
        event.buffer_before,
        event.buffer_after
      )
    );
  }

  // reception_settings から allowed_days を取得（Pitasuke形式: 0=月,...,6=日）
  const receptionSettings = (event as any).reception_settings as
    | { allowed_days?: boolean[] }
    | undefined;
  const allowedDays = receptionSettings?.allowed_days;

  // weekday モードの場合は weekday_schedule からユーザーIDを収集
  const weekdaySchedule = ((event as any).weekday_schedule ||
    []) as WeekdayScheduleEntry[];

  if (event.scheduling_mode === "weekday") {
    const weekdayUserIds = [
      ...new Set(weekdaySchedule.flatMap((ws) => ws.member_ids)),
    ];
    for (const userId of weekdayUserIds) {
      if (!busyTimesMap.has(userId)) {
        busyTimesMap.set(
          userId,
          getUserBusyTimes(
            userId,
            calendar_events,
            event.buffer_before,
            event.buffer_after
          )
        );
      }
    }
  }

  // Generate all candidate time slots
  const candidateSlots = generateCandidateSlots(
    date_range.start,
    date_range.end,
    working_hours.start,
    working_hours.end,
    event.duration,
    30,
    allowedDays
  );

  // Compute based on scheduling mode
  const available_slots =
    event.scheduling_mode === "fixed"
      ? computeFixedMode(
        candidateSlots,
        roles,
        members,
        busyTimesMap,
        exclusion_rules
      )
      : event.scheduling_mode === "weekday"
        ? computeWeekdayMode(
          candidateSlots,
          weekdaySchedule,
          busyTimesMap,
          exclusion_rules
        )
        : computePoolMode(
          candidateSlots,
          roles,
          members,
          busyTimesMap,
          exclusion_rules
        );

  return { available_slots };
}

/**
 * Get available slots for a specific event using mock data.
 */
export function getAvailableSlotsForEvent(
  eventId: string,
  dateRange?: { start: string; end: string }
): SchedulerOutput {
  const data = getEventData(eventId);
  if (!data.event) {
    return { available_slots: [] };
  }

  const defaultRange = {
    start: "2026-02-18",
    end: "2026-03-03",
  };

  return computeAvailableSlots({
    event: data.event,
    roles: data.roles,
    members: data.members,
    exclusion_rules: data.exclusionRules,
    calendar_events: mockCalendarEvents,
    date_range: dateRange || defaultRange,
    working_hours: {
      start: "09:00",
      end: "18:00",
    },
  });
}
