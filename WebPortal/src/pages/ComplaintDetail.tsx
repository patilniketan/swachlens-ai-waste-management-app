import { useState } from "react";
import { AlertTriangle, CheckCircle2, GitMerge, ShieldAlert, Sparkles, UserPlus, XCircle } from "lucide-react";
import { NavLink, useParams } from "react-router-dom";
import { assetUrl, errorMessage } from "../api/client";
import {
  confirmDuplicate,
  getComplaint,
  getComplaintEvents,
  overridePriority,
  rejectDuplicate,
} from "../api/complaints";
import { assignComplaint, getStaff } from "../api/staff";
import { MiniMap } from "../components/maps";
import {
  AiChips,
  Async,
  Avatar,
  Button,
  PageTitle,
  PriorityBadge,
  SimulatedTag,
  StatusBadge,
} from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import {
  ACTIVE_STATUSES,
  PRIORITIES,
  STATUS_LABELS,
  type ComplaintDetail as Detail,
  type ComplaintEvent,
  type ComplaintPriority,
} from "../types";
import { emailName, formatDateTime, shortId } from "../utils/format";

// Runs an action, tracks busy/error, then refreshes the page data.
function useAction(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);

    try {
      await action();
      onDone();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, run };
}

export function ComplaintDetail() {
  const { id = "" } = useParams();
  const detail = useAsync(() => getComplaint(id), [id]);
  const events = useAsync(() => getComplaintEvents(id), [id]);

  const refresh = () => {
    void detail.reload();
    void events.reload();
  };

  return (
    <>
      <div className="back">
        <NavLink to="/complaints">← Back to complaints</NavLink>
      </div>
      <Async state={detail} loadingLabel="Loading complaint…">
        {(c) => <DetailBody c={c} events={events} onChanged={refresh} />}
      </Async>
    </>
  );
}

function DetailBody({
  c,
  events,
  onChanged,
}: {
  c: Detail;
  events: ReturnType<typeof useAsync<ComplaintEvent[]>>;
  onChanged: () => void;
}) {
  const image = assetUrl(c.imageUrl);

  return (
    <>
      <PageTitle eyebrow="COMPLAINT DETAIL" title={shortId(c.id)}>
        <div className="actions">
          <AiChips source={c.aiSource} needsManualReview={c.needsManualReview} />
          {c.isSimulated && <SimulatedTag />}
        </div>
      </PageTitle>
      <div className="detail-layout">
        <section className="detail-main">
          <article className="detail-hero">
            {image ? (
              <img src={image} alt={`Reported ${c.wasteType ?? "waste"}`} />
            ) : (
              <div className="image-empty">No image supplied</div>
            )}
            <div>
              <div className="cell-tags">
                <StatusBadge status={c.status} />
                <PriorityBadge priority={c.priority} urgency={c.urgencyScore} />
              </div>
              <h2>{c.wasteType ?? "Unclassified"}</h2>
              <p>{c.description}</p>
              {c.voteCount > 1 && <p className="votes">Reported by {c.voteCount} citizens</p>}
            </div>
          </article>

          {c.masterComplaint && (
            <article className="detail-card notice">
              <GitMerge size={16} />
              <span>
                {c.status === "Merged" ? "Merged into" : "Linked as a duplicate of"}{" "}
                <NavLink to={`/complaints/${c.masterComplaint.id}`}>{shortId(c.masterComplaint.id)}</NavLink>
                {" — "}
                {c.masterComplaint.aiSummary ?? c.masterComplaint.description}
              </span>
            </article>
          )}

          <DuplicateCard c={c} onChanged={onChanged} />
          <AiCard c={c} />
          <PriorityCard c={c} onChanged={onChanged} />
          <ResolutionCard c={c} />
          <LinkedReports c={c} />
          <Timeline events={events} />
        </section>

        <aside className="detail-side">
          <article>
            <h3>Location</h3>
            <MiniMap latitude={c.latitude} longitude={c.longitude} priority={c.priority} />
            <p className="muted-line">{c.address ?? "No address given"}</p>
            <div className="coordinates">
              <span>
                Lat <b>{c.latitude.toFixed(5)}</b>
              </span>
              <span>
                Lng <b>{c.longitude.toFixed(5)}</b>
              </span>
            </div>
          </article>
          <article>
            <h3>Case information</h3>
            <dl>
              <dt>Reported</dt>
              <dd>{formatDateTime(c.createdAt)}</dd>
              <dt>Last updated</dt>
              <dd>{formatDateTime(c.updatedAt)}</dd>
              <dt>Reporter</dt>
              <dd>{c.User?.email ?? "—"}</dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={c.status} />
              </dd>
              <dt>Reports</dt>
              <dd>{c.voteCount}</dd>
              <dt>In today's plan</dt>
              <dd>{c.isScheduled ? "Yes" : "No"}</dd>
            </dl>
          </article>
          <AssignmentCard c={c} onChanged={onChanged} />
        </aside>
      </div>
    </>
  );
}

// ---------------- AI ----------------

function AiCard({ c }: { c: Detail }) {
  const fallback = c.aiSource === "fallback" || c.aiSource === null;

  return (
    <article className="detail-card">
      <h2>
        <Sparkles size={15} /> AI analysis
      </h2>
      {fallback && (
        <p className="warn-line">
          <AlertTriangle size={14} /> AI analysis was unavailable for this report. The fields below come
          from keyword rules only; please review the photo manually.
        </p>
      )}
      {c.aiSource === "seed" && <p className="muted-line">Simulated demo analysis (seed data).</p>}
      {c.aiSummary && <p className="ai-summary">{c.aiSummary}</p>}
      <dl className="ai-grid">
        <dt>Waste categories</dt>
        <dd>{c.aiWasteCategories.length ? c.aiWasteCategories.join(", ") : "—"}</dd>
        <dt>Relative volume</dt>
        <dd>{c.aiRelativeVolume ?? "—"}</dd>
        <dt>Condition</dt>
        <dd>{c.aiWasteCondition ?? "—"}</dd>
        <dt>Hazardous</dt>
        <dd>
          {c.aiHazardousDetected ? (
            <span className="hazard">
              <ShieldAlert size={13} /> Yes{c.aiHazardousTypes.length ? `: ${c.aiHazardousTypes.join(", ")}` : ""}
            </span>
          ) : (
            "No"
          )}
        </dd>
        <dt>Blocking a road</dt>
        <dd>{c.aiBlockedRoad ? "Yes" : "No"}</dd>
        <dt>Near school / hospital / market</dt>
        <dd>{c.aiNearSensitiveSite ? "Yes" : "No"}</dd>
        <dt>Access</dt>
        <dd>{c.aiAccessibility ?? "—"}</dd>
        <dt>Suggested equipment</dt>
        <dd>{c.aiSuggestedEquipment.length ? c.aiSuggestedEquipment.join(", ") : "—"}</dd>
        <dt>Confidence</dt>
        <dd>
          {c.aiImageConfidence !== null ? (
            <span className="confidence">
              <span className="bar">
                <i style={{ width: `${Math.round(c.aiImageConfidence * 100)}%` }} />
              </span>
              {Math.round(c.aiImageConfidence * 100)}%
            </span>
          ) : (
            "—"
          )}
        </dd>
      </dl>
    </article>
  );
}

// ---------------- Priority + override ----------------

function PriorityCard({ c, onChanged }: { c: Detail; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [priority, setPriority] = useState<ComplaintPriority>(c.priority);
  const [reason, setReason] = useState("");
  const action = useAction(onChanged);
  const canOverride = !c.masterComplaintId;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (await action.run(() => overridePriority(c.id, priority, reason.trim()))) {
      setEditing(false);
      setReason("");
    }
  };

  return (
    <article className="detail-card">
      <div className="card-head">
        <h2>Priority</h2>
        <PriorityBadge priority={c.priority} urgency={c.urgencyScore} />
      </div>
      <div className="crew">
        <span>
          <b>{c.requiredWorkers}</b> workers
        </span>
        <span>
          <b>{c.requiredHeavyVehicles}</b> heavy vehicles
        </span>
        <span>
          <b>{c.estimatedTimeMinutes ?? "—"}</b> min
        </span>
      </div>
      <p className="muted-line">
        {c.priorityOverridden
          ? "Set manually by an admin. Rule-based scoring is shown for reference."
          : "Decided by fixed rules from the AI's description, not by the AI directly:"}
      </p>
      <ul className="reasons">
        {c.priorityReasons.map((line) => (
          <li key={line} className={line.startsWith("Priority set by admin") ? "override" : ""}>
            {line}
          </li>
        ))}
      </ul>
      {canOverride &&
        (editing ? (
          <form className="inline-form" onSubmit={submit}>
            <label className="form-label">
              New priority
              <select value={priority} onChange={(e) => setPriority(e.target.value as ComplaintPriority)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Reason (required, logged)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={5}
                maxLength={500}
                required
                placeholder="e.g. School reopening tomorrow next to this site"
              />
            </label>
            {action.error && <p className="form-error">{action.error}</p>}
            <div className="actions">
              <Button type="submit" variant="primary" disabled={action.busy || reason.trim().length < 5}>
                {action.busy ? "Saving…" : "Override priority"}
              </Button>
              <Button type="button" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={() => setEditing(true)}>Override priority</Button>
        ))}
    </article>
  );
}

// ---------------- Duplicate suggestion ----------------

function DuplicateCard({ c, onChanged }: { c: Detail; onChanged: () => void }) {
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState("");
  const action = useAction(onChanged);
  const target = c.duplicateSuggestionTarget;

  if (!c.duplicateSuggestionOfId || c.masterComplaintId || !target) return null;

  return (
    <article className="detail-card dup-card">
      <h2>
        <GitMerge size={15} /> Possible duplicate{" "}
        <span className={`chip ${c.duplicateSuggestionVerdict === "yes" ? "ai" : "review"}`}>
          AI says: {c.duplicateSuggestionVerdict === "yes" ? "same issue" : "unsure"}
        </span>
      </h2>
      <p className="muted-line">{c.duplicateSuggestionReason}</p>
      <div className="dup-target">
        {assetUrl(target.imageUrl) && <img src={assetUrl(target.imageUrl) as string} alt="" />}
        <div>
          <NavLink to={`/complaints/${target.id}`}>{shortId(target.id)}</NavLink>{" "}
          <StatusBadge status={target.status} />
          <p>{target.aiSummary ?? target.description}</p>
          <small>
            {target.voteCount} report{target.voteCount === 1 ? "" : "s"} · {formatDateTime(target.createdAt)}
          </small>
        </div>
      </div>
      {dismissing ? (
        <div className="inline-form">
          <label className="form-label">
            Why is it not a duplicate? (optional)
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </label>
          <div className="actions">
            <Button
              disabled={action.busy}
              onClick={() => void action.run(() => rejectDuplicate(c.id, reason.trim() || undefined))}
            >
              {action.busy ? "Saving…" : "Dismiss suggestion"}
            </Button>
            <Button onClick={() => setDismissing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="actions">
          <Button variant="primary" disabled={action.busy} onClick={() => void action.run(() => confirmDuplicate(c.id))}>
            <CheckCircle2 size={16} />
            {action.busy ? "Linking…" : "Confirm duplicate"}
          </Button>
          <Button disabled={action.busy} onClick={() => setDismissing(true)}>
            <XCircle size={16} />
            Dismiss
          </Button>
        </div>
      )}
      {action.error && <p className="form-error">{action.error}</p>}
    </article>
  );
}

// ---------------- Assignment ----------------

function AssignmentCard({ c, onChanged }: { c: Detail; onChanged: () => void }) {
  const staff = useAsync(getStaff, []);
  const [staffId, setStaffId] = useState("");
  const action = useAction(onChanged);

  const open = c.assignments?.find((a) => a.status !== "COMPLETED");
  const latest = open ?? c.assignments?.[0];
  const assignable = ACTIVE_STATUSES.includes(c.status) && !open && !c.masterComplaintId;

  return (
    <article>
      <h3>Assignment</h3>
      {latest?.staff ? (
        <p className="assigned">
          <Avatar name={emailName(latest.staff.email)} />
          {latest.staff.email}
          <small className="muted-line"> · {latest.status.replace("_", " ").toLowerCase()}</small>
        </p>
      ) : (
        <p className="muted-line">Not assigned yet.</p>
      )}
      {assignable && (
        <>
          <label className="form-label">
            Assign to
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} disabled={!staff.data}>
              <option value="">{staff.loading ? "Loading staff…" : "Choose staff member"}</option>
              {staff.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email} ({s.assigned + s.inProgress} open)
                </option>
              ))}
            </select>
          </label>
          {staff.error && <p className="form-error">{staff.error}</p>}
          <Button
            variant="primary"
            disabled={!staffId || action.busy}
            onClick={() => void action.run(() => assignComplaint(c.id, staffId))}
          >
            <UserPlus size={16} />
            {action.busy ? "Assigning…" : "Assign"}
          </Button>
        </>
      )}
      {!assignable && !open && (
        <p className="muted-line">
          {STATUS_LABELS[c.status]} complaints are not assigned.
        </p>
      )}
      {action.error && <p className="form-error">{action.error}</p>}
    </article>
  );
}

// ---------------- Resolution, linked reports, timeline ----------------

function ResolutionCard({ c }: { c: Detail }) {
  if (c.status !== "Resolved") return null;

  const after = assetUrl(c.afterImageUrl);

  return (
    <article className="detail-card">
      <h2>
        <CheckCircle2 size={15} /> Resolution evidence
      </h2>
      <div className="evidence">
        {after ? <img src={after} alt="After clean-up" /> : <div className="image-empty">No after photo</div>}
        <dl className="ai-grid">
          <dt>Resolved</dt>
          <dd>{formatDateTime(c.resolvedAt)}</dd>
          <dt>Weighed</dt>
          <dd>{c.verifiedWeightKg !== null ? `${c.verifiedWeightKg} kg` : "—"}</dd>
          <dt>Notes</dt>
          <dd>{c.resolutionNotes ?? "—"}</dd>
        </dl>
      </div>
    </article>
  );
}

function LinkedReports({ c }: { c: Detail }) {
  if (c.childComplaints.length === 0) return null;

  return (
    <article className="detail-card">
      <h2>Linked reports ({c.childComplaints.length})</h2>
      <ul className="linked-list">
        {c.childComplaints.map((child) => (
          <li key={child.id}>
            <NavLink to={`/complaints/${child.id}`}>{shortId(child.id)}</NavLink>
            <StatusBadge status={child.status} />
            {child.isSimulated && <SimulatedTag />}
            <p>{child.description}</p>
            <small>{formatDateTime(child.createdAt)}</small>
          </li>
        ))}
      </ul>
    </article>
  );
}

const EVENT_LABEL: Record<string, (e: ComplaintEvent) => string> = {
  CREATED: () => "Reported",
  STATUS_CHANGED: (e) =>
    `Status ${STATUS_LABELS[e.fromValue as keyof typeof STATUS_LABELS] ?? e.fromValue} → ${
      STATUS_LABELS[e.toValue as keyof typeof STATUS_LABELS] ?? e.toValue
    }`,
  ASSIGNED: (e) => `Assigned to ${e.toValue}`,
  MERGED: (e) => `Merged into ${e.toValue ? shortId(e.toValue) : "another complaint"}`,
  DUPLICATE_CONFIRMED: (e) => `Duplicate confirmed (of ${e.toValue ? shortId(e.toValue) : "—"})`,
  DUPLICATE_REJECTED: (e) => `Duplicate suggestion dismissed (was ${e.fromValue ? shortId(e.fromValue) : "—"})`,
  PRIORITY_OVERRIDE: (e) => `Priority ${e.fromValue} → ${e.toValue}`,
};

function Timeline({ events }: { events: ReturnType<typeof useAsync<ComplaintEvent[]>> }) {
  return (
    <article className="detail-card">
      <h2>Timeline</h2>
      <Async state={events} loadingLabel="Loading history…">
        {(list) =>
          list.length === 0 ? (
            <p className="muted-line">No events recorded.</p>
          ) : (
            <ol className="timeline">
              {list.map((e) => (
                <li key={e.id} className={`ev-${e.type.toLowerCase()}`}>
                  <strong>{(EVENT_LABEL[e.type] ?? (() => e.type))(e)}</strong>
                  {e.reason && !e.reason.startsWith("aiSource=") && <p>{e.reason}</p>}
                  <small>
                    {formatDateTime(e.createdAt)} · {e.actor ? e.actor.email : "system"}
                  </small>
                </li>
              ))}
            </ol>
          )
        }
      </Async>
    </article>
  );
}
