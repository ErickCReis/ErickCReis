export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(timeZone: string) {
  let formatter = dateFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateFormatters.set(timeZone, formatter);
  }
  return formatter;
}

export function getDateKey(now: Date | number, timeZone: string) {
  const parts = getDateFormatter(timeZone).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to resolve the date in ${timeZone}.`);
  }
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function getCalendarDayOfWeek(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function getWeekStart(date: string) {
  return addCalendarDays(date, -getCalendarDayOfWeek(date));
}
