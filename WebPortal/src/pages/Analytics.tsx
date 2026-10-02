import { useState } from "react";
import { CheckCircle2, Clock, Download, GitMerge, Scale } from "lucide-react";
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { downloadComplaintsCsv, getAnalytics } from "../api/analytics";
import { errorMessage } from "../api/client";
import { Async, Button, ChartCard, PageTitle, Stat } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { STATUS_LABELS } from "../types";
import { formatDateTime, percent } from "../utils/format";

const PALETTE = ["#1F5D4C", "#5F8B7A", "#D97D34", "#A38663", "#B8C7BF", "#33648C", "#7A4FB5", "#B8862B"];

export function Analytics() {
  const [includeSimulated, setIncludeSimulated] = useState(true);
  const analytics = useAsync(() => getAnalytics(includeSimulated), [includeSimulated], { pollMs: 30_000 });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);

    try {
      await downloadComplaintsCsv(includeSimulated);
    } catch (err) {
      setExportError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageTitle eyebrow="PERFORMANCE OVERVIEW" title="Analytics">
        <div className="actions">
          <div className="segmented">
            <button className={includeSimulated ? "selected" : ""} onClick={() => setIncludeSimulated(true)}>
              All data
            </button>
            <button className={!includeSimulated ? "selected" : ""} onClick={() => setIncludeSimulated(false)}>
              Real reports only
            </button>
          </div>
          <Button onClick={() => void exportCsv()} disabled={exporting}>
            <Download size={16} />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </PageTitle>
      {exportError && <p className="form-error">{exportError}</p>}

      <Async state={analytics} loadingLabel="Computing analytics…">
        {(a) => {
          const total = a.dataset.totalComplaints;
          const statusRows = a.byStatus.map((row) => ({ ...row, label: STATUS_LABELS[row.status] }));
          const maxStatus = Math.max(1, ...statusRows.map((row) => row.count));
          const decided = a.duplicateSuggestions.confirmed + a.duplicateSuggestions.rejected;

          return (
            <>
              <p className="result-count">
                Computed live from the database at {formatDateTime(a.generatedAt)}.
              </p>
              {a.dataset.simulated > 0 && (
                <p className="sim-note">
                  {a.dataset.note} Switch to "Real reports only" to exclude them.
                </p>
              )}

              <section className="stat-grid">
                <Stat label="Complaints" value={total} detail={`${a.dataset.real} real · ${a.dataset.simulated} simulated`} />
                <Stat
                  label="Resolved"
                  value={a.resolution.resolvedCount}
                  detail={`${percent(a.resolution.resolvedCount, total)}% of complaints`}
                  tone="green-tone"
                  icon={CheckCircle2}
                />
                <Stat
                  label="Avg. resolution time"
                  value={a.resolution.avgResolutionHours !== null ? `${a.resolution.avgResolutionHours}h` : "—"}
                  detail="Reported → resolved"
                  tone="purple-tone"
                  icon={Clock}
                />
                <Stat
                  label="Duplicate suggestions"
                  value={`${a.duplicateSuggestions.confirmed} / ${decided}`}
                  detail={`confirmed of decided · ${a.duplicateSuggestions.pending} pending review`}
                  tone="amber-tone"
                  icon={GitMerge}
                />
              </section>

              <section className="dashboard-grid analytics">
                <ChartCard title="Reported vs resolved" sub="Last 7 days (UTC)">
                  {a.last7Days.every((d) => d.created === 0 && d.resolved === 0) ? (
                    <p className="muted-line pad">No activity in the last 7 days.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={a.last7Days.map((d) => ({ ...d, name: d.date.slice(5) }))}>
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="created" name="Reported" fill="#1F5D4C" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="resolved" name="Resolved" fill="#D97D34" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
                <ChartCard title="Waste categories" sub="All complaints in this view">
                  {a.byWasteType.length === 0 ? (
                    <p className="muted-line pad">No complaints yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={a.byWasteType.map((row) => ({ name: row.wasteType, value: row.count }))}
                          dataKey="value"
                          outerRadius={88}
                          innerRadius={48}
                        >
                          {a.byWasteType.map((row, i) => (
                            <Cell fill={PALETTE[i % PALETTE.length]} key={row.wasteType} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </section>

              <ChartCard title="Complaints by status" sub="Including linked duplicates">
                <div className="hotspots">
                  {statusRows.map((row) => (
                    <div key={row.status}>
                      <span>{row.label}</span>
                      <div>
                        <i style={{ width: `${percent(row.count, maxStatus)}%` }} />
                      </div>
                      <b>{row.count}</b>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard
                title="AI estimate vs weighed reality"
                sub="Resolved complaints with a staff-weighed amount, grouped by the AI's relative-volume estimate"
              >
                {a.dataset.simulated > 0 && (
                  <p className="sim-note">
                    Includes simulated seed data: these weights are demo values, not field measurements.
                  </p>
                )}
                {a.aiVsVerified.length === 0 ? (
                  <p className="muted-line pad">No resolved complaints with a weighed amount yet.</p>
                ) : (
                  <div className="ai-vs-verified">
                    <table className="plain-table">
                      <thead>
                        <tr>
                          <th>AI volume estimate</th>
                          <th>Complaints</th>
                          <th>Median kg</th>
                          <th>Min kg</th>
                          <th>Max kg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.aiVsVerified.map((row) => (
                          <tr key={row.aiRelativeVolume}>
                            <td>{row.aiRelativeVolume}</td>
                            <td>{row.count}</td>
                            <td>{row.medianKg ?? "—"}</td>
                            <td>{row.minKg ?? "—"}</td>
                            <td>{row.maxKg ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={a.aiVsVerified}>
                        <XAxis dataKey="aiRelativeVolume" />
                        <YAxis unit=" kg" />
                        <Tooltip />
                        <Bar dataKey="medianKg" name="Median kg" fill="#1F5D4C" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <p className="muted-line">
                  <Scale size={13} /> The AI never estimates kilograms; it only gives a relative volume. This
                  table shows how those labels compare with what staff actually weighed.
                </p>
              </ChartCard>
            </>
          );
        }}
      </Async>
    </>
  );
}
