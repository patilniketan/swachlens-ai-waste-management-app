// Midnight UTC of the current day: the key for per-day rows (Resource).
export const utcToday = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

// "YYYY-MM-DD" for a UTC day.
export const utcDayKey = (date: Date) => date.toISOString().slice(0, 10);
