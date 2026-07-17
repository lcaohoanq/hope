import type { Language } from "./i18n";

/** Default timezone for app-local dates and activity formatting. */
export const APP_TIMEZONE = "Asia/Ho_Chi_Minh";
const APP_TIMEZONE_OFFSET = "+07:00";

/**
 * Today's calendar date in `YYYY-MM-DD` for the given timezone.
 *
 * @param timezone - IANA timezone (defaults to {@link APP_TIMEZONE}).
 * @returns Date key string.
 */
export function getTodayInTimezone(timezone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Current clock time (`HH:mm`, 24-hour) in the given timezone.
 *
 * @param timezone - IANA timezone (defaults to {@link APP_TIMEZONE}).
 * @returns Time string.
 */
export function getCurrentTimeInTimezone(timezone = APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/**
 * Return a new `Date` offset by `amount` calendar days.
 *
 * @param date - Starting date.
 * @param amount - Days to add (negative to subtract).
 * @returns New `Date` instance.
 */
export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/**
 * Format a local `Date` as `YYYY-MM-DD`.
 *
 * @param date - Local date.
 * @returns Date key string.
 */
export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a `YYYY-MM-DD` key into a local midnight `Date`.
 *
 * @param dateKey - Date key string.
 * @returns Local `Date`.
 */
export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Locale-aware short display date for a date key.
 *
 * @param dateKey - `YYYY-MM-DD` key.
 * @param language - UI language.
 * @returns Formatted date string.
 */
export function formatDisplayDate(dateKey: string, language: Language = "en") {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

/**
 * Format an ISO timestamp as activity copy (`Mon D, HH:mm`) in {@link APP_TIMEZONE}.
 *
 * @param timestamp - ISO timestamp.
 * @param language - UI language.
 * @returns Formatted string.
 */
export function formatActivityTimestamp(timestamp: string, language: Language = "en") {
  const locale = language === "vi" ? "vi-VN" : "en";
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
  return `${date}, ${time}`;
}

/**
 * Format an ISO timestamp as a month + year label in {@link APP_TIMEZONE}.
 *
 * @param timestamp - ISO timestamp.
 * @param language - UI language.
 * @returns Formatted month string.
 */
export function formatActivityMonth(timestamp: string, language: Language = "en") {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en", {
    timeZone: APP_TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp));
}

/**
 * Stable month key (`YYYY-MM`) for grouping activity in {@link APP_TIMEZONE}.
 *
 * @param timestamp - ISO timestamp.
 * @returns Month key string.
 */
export function getActivityMonthKey(timestamp: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

/**
 * Inclusive calendar-year bounds in {@link APP_TIMEZONE} for activity queries.
 *
 * @param year - Four-digit year.
 * @returns `{ start, end }` Date range (`end` exclusive next Jan 1).
 */
export function getActivityYearRange(year: number) {
  return {
    start: new Date(`${year}-01-01T00:00:00${APP_TIMEZONE_OFFSET}`),
    end: new Date(`${year + 1}-01-01T00:00:00${APP_TIMEZONE_OFFSET}`),
  };
}

/**
 * Build `count` consecutive date keys ending at `endDateKey`.
 *
 * @param endDateKey - Last day (`YYYY-MM-DD`).
 * @param count - Number of days including the end day.
 * @returns Ascending date key array.
 */
export function getLastNDays(endDateKey: string, count: number) {
  const end = parseDateKey(endDateKey);
  const start = addDays(end, -(count - 1));

  return Array.from({ length: count }, (_, index) => toDateKey(addDays(start, index)));
}

/**
 * Inclusive list of date keys from `startDateKey` through `endDateKey`.
 *
 * @param startDateKey - First day (`YYYY-MM-DD`).
 * @param endDateKey - Last day (`YYYY-MM-DD`).
 * @returns Ascending date key array.
 */
export function getDaysInRange(startDateKey: string, endDateKey: string) {
  const days: string[] = [];
  let current = parseDateKey(startDateKey);
  const end = parseDateKey(endDateKey);

  while (current <= end) {
    days.push(toDateKey(current));
    current = addDays(current, 1);
  }

  return days;
}
