import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, MapPin, Navigation, Play } from "lucide-react";
import { assetUrl, errorMessage } from "../api/client";
import { completeTask, getMyTasks, startTask } from "../api/staff";
import { Async, Button, EmptyState, PageTitle, PriorityBadge, SimulatedTag } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import type { StaffTask } from "../types";
import { formatDateTime, shortId } from "../utils/format";

const STEP_LABEL = { ASSIGNED: "To do", IN_PROGRESS: "In progress", COMPLETED: "Completed" } as const;

function CompleteForm({ task, onDone, onCancel }: { task: StaffTask; onDone: () => void; onCancel: () => void }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview URL for the chosen photo, released when it changes.
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const weightKg = Number(weight);
  const valid = photo !== null && Number.isFinite(weightKg) && weightKg > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!photo || !valid) return;

    setBusy(true);
    setError(null);

    try {
      await completeTask(task.id, { afterImage: photo, verifiedWeightKg: weightKg, resolutionNotes: notes });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form className="complete-form" onSubmit={submit}>
      <label className="photo-input">
        <Camera size={18} />
        {photo ? photo.name : "Take or choose the after photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          required
        />
      </label>
      {preview && <img className="photo-preview" src={preview} alt="After photo preview" />}
      <label className="form-label">
        Weighed amount (kg)
        <input
          type="number"
          inputMode="decimal"
          min="0.1"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          required
          placeholder="e.g. 42.5"
        />
      </label>
      <label className="form-label">
        Notes (optional)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="actions">
        <Button type="submit" variant="primary" disabled={!valid || busy}>
          <CheckCircle2 size={16} />
          {busy ? "Uploading…" : "Mark completed"}
        </Button>
        <Button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function TaskCard({ task, onChanged }: { task: StaffTask; onChanged: () => void }) {
  const [completing, setCompleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = task.complaint;
  const image = assetUrl(c.imageUrl);

  const start = async () => {
    setBusy(true);
    setError(null);

    try {
      await startTask(task.id);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`task-card step-${task.status.toLowerCase()}`}>
      {image && <img src={image} alt={`Reported ${c.wasteType ?? "waste"}`} />}
      <div className="task-body">
        <div className="cell-tags">
          <span className="chip step">{STEP_LABEL[task.status]}</span>
          <PriorityBadge priority={c.priority} urgency={c.urgencyScore} />
          {c.isSimulated && <SimulatedTag />}
        </div>
        <h3>{c.wasteType ?? "Unclassified"}</h3>
        <p>{c.aiSummary ?? c.description}</p>
        <p className="task-meta">
          <MapPin size={14} /> {c.address ?? `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`}
        </p>
        <p className="task-meta">
          {c.requiredWorkers} workers · {c.requiredHeavyVehicles} heavy vehicles · ~{c.estimatedTimeMinutes ?? "?"} min ·{" "}
          #{shortId(c.id)}
        </p>
        {c.aiHazardousDetected && (
          <p className="warn-line">Hazardous: {c.aiHazardousTypes.join(", ") || "yes"}. Use protective equipment.</p>
        )}
        <a
          className="text-link"
          href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation size={14} /> Directions
        </a>
        {task.status === "COMPLETED" && (
          <p className="task-meta">
            Completed {formatDateTime(c.resolvedAt)}
            {c.verifiedWeightKg !== null ? ` · ${c.verifiedWeightKg} kg` : ""}
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
        {task.status === "ASSIGNED" && (
          <Button variant="primary" onClick={() => void start()} disabled={busy}>
            <Play size={16} />
            {busy ? "Starting…" : "Start (mark in progress)"}
          </Button>
        )}
        {task.status === "IN_PROGRESS" &&
          (completing ? (
            <CompleteForm task={task} onDone={onChanged} onCancel={() => setCompleting(false)} />
          ) : (
            <Button variant="amber" onClick={() => setCompleting(true)}>
              <CheckCircle2 size={16} />
              Complete with after photo
            </Button>
          ))}
      </div>
    </article>
  );
}

export function MyTasks() {
  const tasks = useAsync(getMyTasks, [], { pollMs: 30_000 });

  return (
    <>
      <PageTitle eyebrow="FIELD WORK" title="My tasks" />
      <Async state={tasks} loadingLabel="Loading your tasks…">
        {(list) => {
          const open = list.filter((t) => t.status !== "COMPLETED");
          const done = list.filter((t) => t.status === "COMPLETED");

          return (
            <>
              {open.length === 0 ? (
                <EmptyState title="No open tasks" text="New assignments from your admin will appear here." />
              ) : (
                <div className="task-list">
                  {open.map((task) => (
                    <TaskCard key={task.id} task={task} onChanged={() => void tasks.reload()} />
                  ))}
                </div>
              )}
              {done.length > 0 && (
                <details className="done-tasks">
                  <summary>Completed ({done.length})</summary>
                  <div className="task-list">
                    {done.map((task) => (
                      <TaskCard key={task.id} task={task} onChanged={() => void tasks.reload()} />
                    ))}
                  </div>
                </details>
              )}
            </>
          );
        }}
      </Async>
    </>
  );
}
