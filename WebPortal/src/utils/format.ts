export const shortId = (id: string) => (id.startsWith("seed-") ? id.slice(5) : id.slice(-8)).toUpperCase();

export const formatDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    : "—";

export const formatDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "—";

// "12s ago", "3 min ago"
export const timeAgo = (date: Date | null, now = Date.now()) => {
  if (!date) return "never";

  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;

  return `${Math.round(seconds / 3600)} h ago`;
};

// Name-like label from an email: "staff1@swachhlens.demo" -> "staff1"
export const emailName = (email: string | null | undefined) => email?.split("@")[0] ?? "—";

export const percent = (part: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0;
