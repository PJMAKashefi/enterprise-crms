import {
  DocumentShare,
  ExternalAccessStatus,
  AccessSchedule,
  ExternalUser,
} from '../src/types';

export interface AccessEvaluationResult {
  status: ExternalAccessStatus;
  allowed: boolean;
  reason: string;
  nextActiveTime?: string;
  isWithinValidityWindow: boolean;
  isWithinDailyHours: boolean;
  isWorkingDay: boolean;
  isHoliday: boolean;
  currentTimeInZone: string;
  timezone: string;
}

/**
 * Parses date + time string in format YYYY-MM-DD and HH:mm
 */
function parseDateTimeParts(dateStr: string, timeStr: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = (timeStr || '00:00').split(':').map(Number);
  return { year, month, day, hour, minute };
}

/**
 * Gets the current date & time components in the specified timezone.
 */
export function getCurrentTimeInZone(timeZone: string = 'Europe/Amsterdam', date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  isoLike: string;
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    let year = 2026;
    let month = 1;
    let day = 1;
    let hour = 0;
    let minute = 0;

    for (const part of parts) {
      if (part.type === 'year') year = Number(part.value);
      if (part.type === 'month') month = Number(part.value);
      if (part.type === 'day') day = Number(part.value);
      if (part.type === 'hour') hour = Number(part.value);
      if (part.type === 'minute') minute = Number(part.value);
    }

    // Determine day of week in timezone
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Europe/Amsterdam',
      weekday: 'short',
    });
    const weekdayStr = dayFormatter.format(date);
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const dayOfWeek = dayMap[weekdayStr] !== undefined ? dayMap[weekdayStr] : date.getDay();

    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const hourStr = String(hour).padStart(2, '0');
    const minStr = String(minute).padStart(2, '0');
    const dateFormatted = `${year}-${monthStr}-${dayStr}`;
    const timeFormatted = `${hourStr}:${minStr}`;

    return {
      year,
      month,
      day,
      hour,
      minute,
      dayOfWeek,
      dateStr: dateFormatted,
      timeStr: timeFormatted,
      isoLike: `${dateFormatted}T${timeFormatted}:00`,
    };
  } catch (err) {
    // Fallback to UTC if timezone is invalid
    const iso = date.toISOString();
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      dayOfWeek: date.getUTCDay(),
      dateStr: iso.slice(0, 10),
      timeStr: iso.slice(11, 16),
      isoLike: iso,
    };
  }
}

/**
 * Core server-side evaluation engine:
 * Evaluates whether an external user is currently permitted to access a shared document.
 */
export function evaluateAccessSchedule(
  share: DocumentShare,
  externalUser?: ExternalUser,
  currentDate: Date = new Date()
): AccessEvaluationResult {
  const schedule = share.schedule;
  const timeZone = schedule.timeZone || 'Europe/Amsterdam';
  const now = getCurrentTimeInZone(timeZone, currentDate);

  // 1. Explicit Revocation Check
  if (share.status === 'revoked') {
    return {
      status: 'revoked',
      allowed: false,
      reason: `Access was revoked by the document administrator${share.revocationReason ? `: ${share.revocationReason}` : '.'}`,
      isWithinValidityWindow: false,
      isWithinDailyHours: false,
      isWorkingDay: false,
      isHoliday: false,
      currentTimeInZone: `${now.dateStr} ${now.timeStr}`,
      timezone: timeZone,
    };
  }

  // 2. User status check
  if (externalUser && (externalUser.status === 'revoked' || externalUser.status === 'suspended')) {
    return {
      status: externalUser.status === 'revoked' ? 'revoked' : 'suspended',
      allowed: false,
      reason: `The external user account is ${externalUser.status}. Please contact PJMAK Administration.`,
      isWithinValidityWindow: false,
      isWithinDailyHours: false,
      isWorkingDay: false,
      isHoliday: false,
      currentTimeInZone: `${now.dateStr} ${now.timeStr}`,
      timezone: timeZone,
    };
  }

  // 3. Overall Validity Window Check (Start Date/Time -> Expiry Date/Time)
  const currentStamp = `${now.dateStr}T${now.timeStr}`;
  const startStamp = `${schedule.startDate}T${schedule.startTime || '00:00'}`;
  const expiryStamp = `${schedule.expiryDate}T${schedule.expiryTime || '23:59'}`;

  if (currentStamp < startStamp) {
    return {
      status: 'pending',
      allowed: false,
      reason: `Access window has not started yet. Authorization begins on ${schedule.startDate} at ${schedule.startTime || '00:00'} (${timeZone}).`,
      nextActiveTime: `${schedule.startDate} ${schedule.startTime || '09:00'} (${timeZone})`,
      isWithinValidityWindow: false,
      isWithinDailyHours: false,
      isWorkingDay: false,
      isHoliday: false,
      currentTimeInZone: `${now.dateStr} ${now.timeStr}`,
      timezone: timeZone,
    };
  }

  if (currentStamp > expiryStamp) {
    const hasPendingExtension = share.extensionRequests?.some((e) => e.status === 'pending');
    return {
      status: hasPendingExtension ? 'extension_requested' : 'expired',
      allowed: false,
      reason: hasPendingExtension
        ? `Access authorization expired on ${schedule.expiryDate} at ${schedule.expiryTime}. An extension request is currently pending administrative review.`
        : `Access authorization expired on ${schedule.expiryDate} at ${schedule.expiryTime} (${timeZone}).`,
      isWithinValidityWindow: false,
      isWithinDailyHours: false,
      isWorkingDay: false,
      isHoliday: false,
      currentTimeInZone: `${now.dateStr} ${now.timeStr}`,
      timezone: timeZone,
    };
  }

  // 4. Daily Working Calendar Evaluation
  const workingDays = schedule.workingDays || [1, 2, 3, 4, 5]; // Default Mon-Fri
  const isWorkingDay = workingDays.includes(now.dayOfWeek);

  const publicHolidays = schedule.publicHolidays || [];
  const isHoliday = publicHolidays.includes(now.dateStr);

  const dailyStart = schedule.dailyStartTime || '09:00';
  const dailyEnd = schedule.dailyEndTime || '17:00';
  const isWithinDailyHours = now.timeStr >= dailyStart && now.timeStr < dailyEnd;

  // Check if today is weekend / non-working day or holiday
  if (!isWorkingDay || isHoliday) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[now.dayOfWeek];
    const holidayText = isHoliday ? 'on public holidays' : `on non-working days (${currentDayName})`;
    
    return {
      status: 'outside_working_hours',
      allowed: false,
      reason: `Access is inactive ${holidayText}. Authorized working schedule is Monday–Friday, ${dailyStart}–${dailyEnd} (${timeZone}).`,
      nextActiveTime: calculateNextActiveWorkingSlot(schedule, now),
      isWithinValidityWindow: true,
      isWithinDailyHours,
      isWorkingDay,
      isHoliday,
      currentTimeInZone: `${now.dateStr} ${now.timeStr}`,
      timezone: timeZone,
    };
  }

  // Check if outside daily working hours (e.g. before 09:00 or after 17:00)
  if (!isWithinDailyHours) {
    return {
      status: 'outside_working_hours',
      allowed: false,
      reason: `Outside permitted daily working hours (${dailyStart}–${dailyEnd} ${timeZone}). Current time is ${now.timeStr}.`,
      nextActiveTime: calculateNextActiveWorkingSlot(schedule, now),
      isWithinValidityWindow: true,
      isWithinDailyHours: false,
      isWorkingDay: true,
      isHoliday: false,
      currentTimeInZone: `${now.dateStr} ${now.timeStr}`,
      timezone: timeZone,
    };
  }

  // Check if an extension request is pending while currently active
  const hasPendingExtension = share.extensionRequests?.some((e) => e.status === 'pending');

  return {
    status: hasPendingExtension ? 'extension_requested' : 'active',
    allowed: true,
    reason: hasPendingExtension
      ? 'Access is currently active (an extension request is pending administrative review).'
      : 'Access is authorized and active within permitted schedule.',
    isWithinValidityWindow: true,
    isWithinDailyHours: true,
    isWorkingDay: true,
    isHoliday: false,
    currentTimeInZone: `${now.dateStr} ${now.timeStr}`,
    timezone: timeZone,
  };
}

/**
 * Calculates the next active working slot for displaying to user
 */
function calculateNextActiveWorkingSlot(
  schedule: AccessSchedule,
  now: { dateStr: string; timeStr: string; dayOfWeek: number }
): string {
  const dailyStart = schedule.dailyStartTime || '09:00';
  const dailyEnd = schedule.dailyEndTime || '17:00';
  const workingDays = schedule.workingDays || [1, 2, 3, 4, 5];
  const timeZone = schedule.timeZone || 'Europe/Amsterdam';

  // If today is a working day and current time is before dailyStart
  if (workingDays.includes(now.dayOfWeek) && !(schedule.publicHolidays || []).includes(now.dateStr)) {
    if (now.timeStr < dailyStart) {
      return `Today at ${dailyStart} (${timeZone})`;
    }
  }

  // Find next working day
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (let offset = 1; offset <= 7; offset++) {
    const nextDayOfWeek = (now.dayOfWeek + offset) % 7;
    if (workingDays.includes(nextDayOfWeek)) {
      const nextDayName = dayNames[nextDayOfWeek];
      if (offset === 1) {
        return `Tomorrow (${nextDayName}) at ${dailyStart} (${timeZone})`;
      }
      return `${nextDayName} at ${dailyStart} (${timeZone})`;
    }
  }

  return `Next working day at ${dailyStart} (${timeZone})`;
}
