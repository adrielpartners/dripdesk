export type ScheduleType = 'daily' | 'weekdays' | 'monday_wednesday_friday' | 'custom_interval' | 'custom_days_of_week';

export interface ScheduleConfig {
  sendTime?: string;
  intervalDays?: number;
  daysOfWeek?: number[];
}

export interface DueInput {
  scheduleType: ScheduleType;
  scheduleConfig?: ScheduleConfig | null;
  enrolledAt: Date;
  now: Date;
  timezone: string;
  stepOrder: number;
  delayDaysOverride?: number | null;
}

interface LocalParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
}

const DEFAULT_SEND_TIME = '09:00';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isStepDue(input: DueInput) {
  const now = localParts(input.now, input.timezone);
  const enrolled = localParts(input.enrolledAt, input.timezone);
  const elapsedDays = daysBetweenLocalDates(enrolled, now);
  const requiredDays = input.delayDaysOverride ?? requiredDelayDays(input);

  if (elapsedDays < requiredDays) return false;
  if (!isAtOrAfterSendTime(now, input.scheduleConfig?.sendTime ?? DEFAULT_SEND_TIME)) return false;

  return isAllowedSendDay(input.scheduleType, input.scheduleConfig ?? null, now.weekday);
}

function requiredDelayDays(input: DueInput) {
  if (input.scheduleType === 'custom_interval') {
    const intervalDays = normalizePositiveInteger(input.scheduleConfig?.intervalDays, 1);
    return (input.stepOrder - 1) * intervalDays;
  }

  return Math.max(0, input.stepOrder - 1);
}

function isAllowedSendDay(scheduleType: ScheduleType, config: ScheduleConfig | null, weekday: number) {
  switch (scheduleType) {
    case 'daily':
    case 'custom_interval':
      return true;
    case 'weekdays':
      return weekday >= 1 && weekday <= 5;
    case 'monday_wednesday_friday':
      return weekday === 1 || weekday === 3 || weekday === 5;
    case 'custom_days_of_week': {
      const days = config?.daysOfWeek?.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) ?? [];
      return days.length ? days.includes(weekday) : true;
    }
  }
}

function isAtOrAfterSendTime(parts: LocalParts, sendTime: string) {
  const [hour = 9, minute = 0] = sendTime.split(':').map((part) => Number(part));
  return parts.hour > hour || (parts.hour === hour && parts.minute >= minute);
}

function localParts(date: Date, timezone: string): LocalParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: weekdayNumber(values.weekday),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function daysBetweenLocalDates(start: LocalParts, end: LocalParts) {
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  return Math.floor((endUtc - startUtc) / MS_PER_DAY);
}

function weekdayNumber(weekday?: string) {
  switch (weekday) {
    case 'Sun':
      return 0;
    case 'Mon':
      return 1;
    case 'Tue':
      return 2;
    case 'Wed':
      return 3;
    case 'Thu':
      return 4;
    case 'Fri':
      return 5;
    case 'Sat':
      return 6;
    default:
      return 0;
  }
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
