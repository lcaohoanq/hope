import type { Language } from "@/lib/i18n";

export const APP_TIMEZONE = "Asia/Ho_Chi_Minh";
const APP_TIMEZONE_OFFSET = "+07:00";

export function getTodayInTimezone(timezone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

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

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDisplayDate(dateKey: string, language: Language = "en") {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

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

export function formatActivityMonth(timestamp: string, language: Language = "en") {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en", {
    timeZone: APP_TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp));
}

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

export function getActivityYearRange(year: number) {
  return {
    start: new Date(`${year}-01-01T00:00:00${APP_TIMEZONE_OFFSET}`),
    end: new Date(`${year + 1}-01-01T00:00:00${APP_TIMEZONE_OFFSET}`),
  };
}

export function getLastNDays(endDateKey: string, count: number) {
  const end = parseDateKey(endDateKey);
  const start = addDays(end, -(count - 1));

  return Array.from({ length: count }, (_, index) => toDateKey(addDays(start, index)));
}

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
