import { DocumentShare, AccessSchedule, ExternalAccessStatus } from '../types';

export interface ClientAccessStatus {
  status: ExternalAccessStatus;
  allowed: boolean;
  reason: string;
  nextActiveTime?: string;
  timeZone: string;
  isWithinValidityWindow: boolean;
  isWithinDailyHours: boolean;
  isWorkingDay: boolean;
}

export function getClientTimeInZone(timeZone: string = 'Europe/Amsterdam', date: Date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
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

    return {
      year,
      month,
      day,
      hour,
      minute,
      dayOfWeek,
      dateStr: `${year}-${monthStr}-${dayStr}`,
      timeStr: `${hourStr}:${minStr}`,
    };
  } catch (err) {
    const iso = date.toISOString();
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      dayOfWeek: date.getDay(),
      dateStr: iso.slice(0, 10),
      timeStr: iso.slice(11, 16),
    };
  }
}

export function evaluateClientAccessStatus(
  share: DocumentShare,
  currentDate: Date = new Date()
): ClientAccessStatus {
  const schedule = share.schedule;
  const timeZone = schedule.timeZone || 'Europe/Amsterdam';
  const now = getClientTimeInZone(timeZone, currentDate);

  // 1. Explicit Revocation Check
  if (share.status === 'revoked') {
    return {
      status: 'revoked',
      allowed: false,
      reason: `Access was revoked by document administrator${share.revocationReason ? `: ${share.revocationReason}` : '.'}`,
      timeZone,
      isWithinValidityWindow: false,
      isWithinDailyHours: false,
      isWorkingDay: false,
    };
  }

  // 2. Validity Window Check
  const currentStamp = `${now.dateStr}T${now.timeStr}`;
  const startStamp = `${schedule.startDate}T${schedule.startTime || '00:00'}`;
  const expiryStamp = `${schedule.expiryDate}T${schedule.expiryTime || '23:59'}`;

  if (currentStamp < startStamp) {
    return {
      status: 'pending',
      allowed: false,
      reason: `Access window begins on ${schedule.startDate} at ${schedule.startTime || '00:00'} (${timeZone}).`,
      nextActiveTime: `${schedule.startDate} ${schedule.startTime || '09:00'}`,
      timeZone,
      isWithinValidityWindow: false,
      isWithinDailyHours: false,
      isWorkingDay: false,
    };
  }

  if (currentStamp > expiryStamp) {
    const hasPendingExtension = share.extensionRequests?.some((e) => e.status === 'pending');
    return {
      status: hasPendingExtension ? 'extension_requested' : 'expired',
      allowed: false,
      reason: hasPendingExtension
        ? `Access period expired on ${schedule.expiryDate}. An extension request is pending approval.`
        : `Access period expired on ${schedule.expiryDate} at ${schedule.expiryTime} (${timeZone}).`,
      timeZone,
      isWithinValidityWindow: false,
      isWithinDailyHours: false,
      isWorkingDay: false,
    };
  }

  // 3. Working Days & Holidays
  const workingDays = schedule.workingDays || [1, 2, 3, 4, 5];
  const isWorkingDay = workingDays.includes(now.dayOfWeek);
  const publicHolidays = schedule.publicHolidays || [];
  const isHoliday = publicHolidays.includes(now.dateStr);

  const dailyStart = schedule.dailyStartTime || '09:00';
  const dailyEnd = schedule.dailyEndTime || '17:00';
  const isWithinDailyHours = now.timeStr >= dailyStart && now.timeStr < dailyEnd;

  if (!isWorkingDay || isHoliday) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[now.dayOfWeek];
    const holidayText = isHoliday ? 'on scheduled public holidays' : `on weekends / non-working days (${currentDayName})`;
    
    return {
      status: 'outside_working_hours',
      allowed: false,
      reason: `Access is inactive ${holidayText}. Permitted schedule: Monday–Friday ${dailyStart}–${dailyEnd} (${timeZone}).`,
      nextActiveTime: `Next working day at ${dailyStart} (${timeZone})`,
      timeZone,
      isWithinValidityWindow: true,
      isWithinDailyHours,
      isWorkingDay,
    };
  }

  if (!isWithinDailyHours) {
    return {
      status: 'outside_working_hours',
      allowed: false,
      reason: `Outside authorized daily working hours (${dailyStart}–${dailyEnd} ${timeZone}). Current time is ${now.timeStr}.`,
      nextActiveTime: now.timeStr < dailyStart ? `Today at ${dailyStart}` : `Tomorrow at ${dailyStart}`,
      timeZone,
      isWithinValidityWindow: true,
      isWithinDailyHours: false,
      isWorkingDay: true,
    };
  }

  const hasPendingExtension = share.extensionRequests?.some((e) => e.status === 'pending');

  return {
    status: hasPendingExtension ? 'extension_requested' : 'active',
    allowed: true,
    reason: hasPendingExtension
      ? 'Access is currently active (extension request pending review).'
      : 'Access is authorized and active within permitted schedule.',
    timeZone,
    isWithinValidityWindow: true,
    isWithinDailyHours: true,
    isWorkingDay: true,
  };
}

export function formatScheduleDisplay(schedule: AccessSchedule): string {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const workingDaysStr = (schedule.workingDays || [1, 2, 3, 4, 5])
    .map((d) => dayLabels[d])
    .join(', ');

  return `${workingDaysStr} • ${schedule.dailyStartTime || '09:00'}–${schedule.dailyEndTime || '17:00'} (${schedule.timeZone || 'Europe/Amsterdam'})`;
}
