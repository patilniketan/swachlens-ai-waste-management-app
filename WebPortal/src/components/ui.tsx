import { motion } from "framer-motion";
import { AlertTriangle, ClipboardList, Loader2, Sparkles, type LucideIcon } from "lucide-react";
import {
  STATUS_LABELS,
  type AiSource,
  type ComplaintPriority,
  type ComplaintStatus,
} from "../types";

const statusClass: Partial<Record<ComplaintStatus, string>> = {
  Pending: "pending",
  Assigned: "assigned",
  InProgress: "progress",
  Resolved: "resolved",
};

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <span className={`badge ${statusClass[status] ?? "neutral"}`}>
      <i />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const priorityLabel: Record<ComplaintPriority, string> = {
  CRITICAL: "Critical",
  STANDARD: "Standard",
  TRIVIAL: "Trivial",
};

export function PriorityBadge({
  priority,
  urgency,
}: {
  priority: ComplaintPriority;
  urgency?: number;
}) {
  return (
    <span className={`badge prio-${priority.toLowerCase()}`}>
      <i />
      {priorityLabel[priority]}
      {urgency !== undefined && <b className="urgency">{urgency}/10</b>}
    </span>
  );
}

const AI_OK: AiSource[] = ["gemini", "seed", "cached"];

const aiTitle: Record<string, string> = {
  gemini: "Analysed by Gemini",
  cached: "Stored demo analysis (AI_MODE=cached)",
  seed: "Simulated seed analysis",
};

// "AI" chip when analysis succeeded; "AI fallback / needs review" otherwise.
export function AiChips({
  source,
  needsManualReview,
}: {
  source: AiSource | null;
  needsManualReview: boolean;
}) {
  const ok = source !== null && AI_OK.includes(source);

  return (
    <span className="chip-row">
      {ok && (
        <span className="chip ai" title={aiTitle[source as string]}>
          <Sparkles size={11} />
          AI
        </span>
      )}
      {(!ok || needsManualReview) && (
        <span className="chip review" title="AI analysis was unavailable; check this report manually">
          <AlertTriangle size={11} />
          AI fallback / needs review
        </span>
      )}
    </span>
  );
}

// Seeded demo data must always be labelled.
export function SimulatedTag() {
  return (
    <span className="chip simulated" title="Seeded demo data, not a real report">
      Simulated
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-label={name}>
      {name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase()}
    </span>
  );
}

export function Button({
  children,
  variant = "secondary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "amber";
}) {
  return (
    <button className={`btn ${variant}`} {...props}>
      {children}
    </button>
  );
}

export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
  tone,
  icon: Icon = ClipboardList,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: string;
  icon?: LucideIcon;
}) {
  return (
    <motion.div className="stat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className={`stat-icon ${tone ?? ""}`}>
        <Icon size={18} />
      </div>
      <p>{label}</p>
      <h2>{value}</h2>
      <small className="muted-detail">{detail}</small>
    </motion.div>
  );
}

export function ChartCard({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <article className="chart-card">
      <div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      {children}
    </article>
  );
}

// ---------------- Load states ----------------

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="state-box" role="status">
      <Loader2 size={22} className="spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-box error" role="alert">
      <AlertTriangle size={22} />
      <span>{message}</span>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <ClipboardList size={28} />
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

// Renders loading / error until data is ready.
export function Async<T>({
  state,
  children,
  loadingLabel,
}: {
  state: { data: T | null; error: string | null; loading: boolean; reload: () => void };
  children: (data: T) => React.ReactNode;
  loadingLabel?: string;
}) {
  if (state.data === null && state.loading) return <Loading label={loadingLabel} />;
  if (state.data === null && state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (state.data === null) return <Loading label={loadingLabel} />;

  return (
    <>
      {state.error && (
        <div className="inline-error" role="alert">
          <AlertTriangle size={14} /> Couldn't refresh: {state.error}
        </div>
      )}
      {children(state.data)}
    </>
  );
}
