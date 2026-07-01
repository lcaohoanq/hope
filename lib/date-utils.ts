const TIMEZONE = "Asia/Ho_Chi_Minh";

export function getTodayInTimezone(timezone = TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

export function formatDisplayDate(dateKey: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

export function minutesBetween(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

export function getLastNDays(endDateKey: string, count: number) {
  const end = parseDateKey(endDateKey);
  const start = addDays(end, -(count - 1));

  return Array.from({ length: count }, (_, index) =>
    toDateKey(addDays(start, index)),
  );
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
