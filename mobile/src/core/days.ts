// Calendar days as YYYY-MM-DD text, on the climber's own calendar. A climbed
// route is kept by its day, not a moment, so it reads the same in every time zone.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const two = (n: number) => String(n).padStart(2, '0');

/** The day a moment falls on where the phone is. */
export function toDay(date: Date): string {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

export function today(): string {
  return toDay(new Date());
}

/** Noon on that day, so adding days never trips over a clock change. Null for text that isn't a day. */
function fromDay(day: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The day `days` after this one, or before it when negative. */
export function shiftDay(day: string, days: number): string {
  const date = fromDay(day);
  if (!date) return day;
  date.setDate(date.getDate() + days);
  return toDay(date);
}

/** "Nov 14", with the year once it isn't this one: "Nov 14, 2025". */
export function dayLabel(day: string, now: Date = new Date()): string {
  const date = fromDay(day);
  if (!date) return day;
  const label = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === now.getFullYear() ? label : `${label}, ${date.getFullYear()}`;
}

/** "Sat, Nov 14", or "Today" and "Yesterday", for picking a day. */
export function dayName(day: string, now: Date = new Date()): string {
  if (day === toDay(now)) return 'Today';
  if (day === shiftDay(toDay(now), -1)) return 'Yesterday';
  const date = fromDay(day);
  return date ? `${WEEKDAYS[date.getDay()]}, ${dayLabel(day, now)}` : day;
}

/** "October 2026", from a timestamp like an account's created_at. Null if it can't be read. */
export function monthAndYear(timestamp: string): string | null {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : `${LONG_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
