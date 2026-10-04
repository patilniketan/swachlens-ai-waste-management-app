import { CheckCircle2, CircleDot, Loader } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAnalytics, getDashboardStats } from "../api/analytics";
import { getComplaints } from "../api/complaints";
import { ComplaintTable } from "../components/ComplaintTable";
import { Async, ChartCard, EmptyState, PageTitle, Stat } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { getUser } from "../auth/session";
import { STATUS_LABELS, type ComplaintStatus } from "../types";
import { emailName, percent } from "../utils/format";

const STATUS_COLORS: Partial<Record<ComplaintStatus, string>> = {
  Pending: "#B8862B",
  Assigned: "#33648C",
  InProgress: "#7A4FB5",
  Resolved: "#2E7D5B",
};

export function Dashboard() {
  const stats = useAsync(getDashboardStats, [], { pollMs: 10_000 });
  const analytics = useAsync(() => getAnalytics(true), [], { pollMs: 30_000 });
  const recent = useAsync(() => getComplaints({ take: 5, sort: "newest" }), [], {
    pollMs: 10_000,
  });

  const today = new Date()
    .toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();

  return (
    <>
      <PageTitle eyebrow={today} title={`Hello, ${emailName(getUser()?.email)}.`} />
      <p className="lead">Live overview of reports, field work and resolution.</p>

      <Async state={stats} loadingLabel="Loading totals…">
        {({ complaints }) => (
          <section className="stat-grid">
            <Stat
              label="Total complaints"
              value={complaints.total.toLocaleString()}
              detail="All reports, including linked duplicates"
            />
            <Stat
              label="Pending"
              value={complaints.pending}
              detail={`${complaints.assigned} assigned, not yet started`}
              tone="amber-tone"
              icon={CircleDot}
            />
            <Stat
              label="In progress"
              value={complaints.inProgress}
              detail="Field work underway"
              tone="purple-tone"
              icon={Loader}
            />
            <Stat
              label="Resolved"
              value={complaints.resolved.toLocaleString()}
              detail={`${percent(complaints.resolved, complaints.total)}% of all complaints`}
              tone="green-tone"
              icon={CheckCircle2}
            />
          </section>
        )}
      </Async>

      <Async state={analytics} loadingLabel="Loading charts…">
        {(data) => {
          const open = data.byStatus.filter((row) => STATUS_COLORS[row.status]);

          return (
            <>
              {data.dataset.note && <p className="sim-note">{data.dataset.note} Charts include it.</p>}
              <section className="dashboard-grid">
                <ChartCard title="Reports & resolution" sub="Last 7 days (UTC)">
                  <ResponsiveContainer width="100%" height={245}>
                    <AreaChart data={data.last7Days.map((d) => ({ ...d, name: d.date.slice(5) }))}>
                      <defs>
                        <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#1F5D4C" stopOpacity=".22" />
                          <stop offset="100%" stopColor="#1F5D4C" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="created" name="Reported" stroke="#1F5D4C" strokeWidth={2} fill="url(#fill)" />
                      <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#D97D34" strokeWidth={2} fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Reports by status" sub="Pending, assigned, in progress, resolved">
                  <ResponsiveContainer width="100%" height={245}>
                    <PieChart>
                      <Pie
                        data={open.map((row) => ({ name: STATUS_LABELS[row.status], value: row.count }))}
                        dataKey="value"
                        innerRadius={58}
                        outerRadius={83}
                        paddingAngle={3}
                      >
                        {open.map((row) => (
                          <Cell key={row.status} fill={STATUS_COLORS[row.status]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="legend">
                    {open.map((row) => (
                      <span key={row.status}>
                        <i style={{ background: STATUS_COLORS[row.status] }} />
                        {STATUS_LABELS[row.status]} {row.count}
                      </span>
                    ))}
                  </div>
                </ChartCard>
              </section>
            </>
          );
        }}
      </Async>

      <section className="section-head">
        <div>
          <h2>Recent complaints</h2>
          <p>Latest reports received from citizens.</p>
        </div>
        <NavLink to="/complaints" className="text-link">
          View all complaints
        </NavLink>
      </section>
      <Async state={recent} loadingLabel="Loading recent complaints…">
        {({ items }) =>
          items.length ? (
            <ComplaintTable items={items} compact />
          ) : (
            <EmptyState title="No complaints yet" text="Reports from the mobile app will appear here." />
          )
        }
      </Async>
    </>
  );
}
