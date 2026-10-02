import { useState } from "react";
import { AlertTriangle, CalendarCheck, Truck, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { generatePlan, getTodayPlan } from "../api/analytics";
import { errorMessage } from "../api/client";
import { Async, Button, EmptyState, PageTitle, PriorityBadge, SimulatedTag } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import type { DailyPlan, DeferredItem, PlanItem } from "../types";
import { formatDateTime, percent, shortId } from "../utils/format";

function CapacityBar({
  label,
  icon,
  committed,
  scheduled,
  total,
  unit,
}: {
  label: string;
  icon: React.ReactNode;
  committed: number;
  scheduled: number;
  total: number;
  unit: string;
}) {
  const over = committed + scheduled > total;

  return (
    <div className="capacity">
      <div className="capacity-head">
        <span>
          {icon} {label}
        </span>
        <b className={over ? "over" : ""}>
          {committed + scheduled} / {total} {unit}
        </b>
      </div>
      <div className="capacity-bar" role="img" aria-label={`${label}: ${committed + scheduled} of ${total} ${unit} used`}>
        <i className="committed" style={{ width: `${percent(committed, total)}%` }} />
        <i className="scheduled" style={{ width: `${Math.max(0, percent(committed + scheduled, total) - percent(committed, total))}%` }} />
      </div>
      <div className="capacity-legend">
        <span>
          <i className="committed" /> Already assigned {committed}
        </span>
        <span>
          <i className="scheduled" /> Newly scheduled {scheduled}
        </span>
        <span>Free {Math.max(0, total - committed - scheduled)}</span>
      </div>
    </div>
  );
}

function PlanRow({ item, reason }: { item: PlanItem; reason?: string }) {
  return (
    <li>
      <div className="cell-tags">
        <NavLink to={`/complaints/${item.complaintId}`}>
          <strong>{shortId(item.complaintId)}</strong>
        </NavLink>
        <PriorityBadge priority={item.priority} urgency={item.urgencyScore} />
        {item.isSimulated && <SimulatedTag />}
        {item.needsManualReview && <span className="chip review">needs review</span>}
      </div>
      <p>{item.summary ?? item.wasteType ?? "Unclassified"}</p>
      <small>
        {item.requiredWorkers} workers × {item.estimatedTimeMinutes} min = {item.workerMinutes} worker-min
        {item.requiredHeavyVehicles > 0 && ` · ${item.vehicleMinutes} vehicle-min`}
        {item.voteCount > 1 && ` · ${item.voteCount} reports`}
      </small>
      {reason && <p className="defer-reason">{reason}</p>}
    </li>
  );
}

function PlanColumn({
  title,
  hint,
  items,
}: {
  title: string;
  hint: string;
  items: (PlanItem | DeferredItem)[];
}) {
  return (
    <article className="detail-card plan-col">
      <h2>
        {title} <span className="count">{items.length}</span>
      </h2>
      <p className="muted-line">{hint}</p>
      {items.length === 0 ? (
        <p className="muted-line">None.</p>
      ) : (
        <ul className="plan-list">
          {items.map((item) => (
            <PlanRow key={item.complaintId} item={item} reason={"reason" in item ? item.reason : undefined} />
          ))}
        </ul>
      )}
    </article>
  );
}

export function PlanPage() {
  // Wrapped: "no plan yet" is a real null, not "still loading".
  const plan = useAsync(async () => ({ today: await getTodayPlan() }), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);

    try {
      await generatePlan();
      await plan.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle eyebrow="RESOURCE PLANNING" title="Today's plan">
        <Button variant="amber" onClick={() => void generate()} disabled={busy}>
          <CalendarCheck size={17} />
          {busy ? "Generating…" : plan.data?.today ? "Regenerate plan" : "Generate plan"}
        </Button>
      </PageTitle>
      <p className="lead">
        Fills today's crew and vehicle time with the most urgent pending complaints. Work that is
        already assigned is reserved first.
      </p>
      {error && <p className="form-error">{error}</p>}
      <Async state={plan} loadingLabel="Loading today's plan…">
        {({ today: data }: { today: DailyPlan | null }) =>
          !data ? (
            <EmptyState
              title="No plan for today yet"
              text="Generate one to schedule today's work within the available crews and vehicles."
            />
          ) : (
            <>
              <p className="result-count">
                Plan for {data.date} (UTC) · generated {formatDateTime(data.generatedAt)} ·{" "}
                {data.resources.workers} workers, {data.resources.heavyVehicles} heavy vehicles,{" "}
                {data.shiftMinutes}-min shift
              </p>
              {data.warnings.map((warning) => (
                <p key={warning} className="warn-line">
                  <AlertTriangle size={14} /> {warning}
                </p>
              ))}
              <section className="capacity-grid">
                <CapacityBar
                  label="Crew time"
                  icon={<Users size={15} />}
                  committed={data.capacityUsed.committed.workerMinutes}
                  scheduled={data.capacityUsed.scheduled.workerMinutes}
                  total={data.capacityTotal.workerMinutes}
                  unit="worker-min"
                />
                <CapacityBar
                  label="Heavy-vehicle time"
                  icon={<Truck size={15} />}
                  committed={data.capacityUsed.committed.vehicleMinutes}
                  scheduled={data.capacityUsed.scheduled.vehicleMinutes}
                  total={data.capacityTotal.vehicleMinutes}
                  unit="vehicle-min"
                />
              </section>
              <section className="plan-grid">
                <PlanColumn title="Scheduled today" hint="Newly scheduled, most urgent first." items={data.scheduled} />
                <PlanColumn title="Deferred" hint="Did not fit today, with the reason." items={data.deferred} />
                <PlanColumn title="Already assigned" hint="In progress or assigned; capacity reserved." items={data.committed} />
              </section>
            </>
          )
        }
      </Async>
    </>
  );
}
