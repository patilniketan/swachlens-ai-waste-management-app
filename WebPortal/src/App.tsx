import { login } from "./api/auth";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Eye,
  Filter,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  categories,
  complaints,
  currentUser,
  staff,
  stats,
  weekly,
} from "./mocks/portalData";
import { STATUS_LABELS, type Complaint, type ComplaintStatus } from "./types";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/complaints", label: "Complaints", icon: ClipboardList },
  { to: "/nearby", label: "Nearby complaints", icon: MapPin },
  { to: "/staff", label: "Staff & tasks", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];
const statusClass: Partial<Record<ComplaintStatus, string>> = {
  Pending: "pending",
  Assigned: "assigned",
  InProgress: "progress",
  Resolved: "resolved",
};
function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <span className={`badge ${statusClass[status] ?? ""}`}>
      <i />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
function Avatar({ name = currentUser.name }: { name?: string }) {
  return (
    <span className="avatar" aria-label={name}>
      {name
        .split(" ")
        .map((x) => x[0])
        .join("")
        .slice(0, 2)}
    </span>
  );
}
function Button({
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
function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  return (
    <div className="shell">
      <aside className={open ? "sidebar mobile-open" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark">C</span>
          <span>
            Civic<span>Clean</span>
          </span>
          <button
            className="mobile-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>
        <p className="workspace">OPERATIONS PORTAL</p>
        <nav>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/profile">
            <Avatar />
            <span>Profile</span>
          </NavLink>
          <NavLink to="/settings">
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
          <button>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <main>
        <header>
          <button
            className="menu"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div className="crumb">
            Operations <span>/</span>{" "}
            {location.pathname.slice(1).replace("-", " ") || "dashboard"}
          </div>
          <div className="head-actions">
            <button className="icon-btn" aria-label="Notifications">
              <Bell size={19} />
              <b />
            </button>
            <div className="profile-mini">
              <Avatar />
              <div>
                <strong>{currentUser.name}</strong>
                <small>{currentUser.role}</small>
              </div>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="page"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
function PageTitle({
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
function Stat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: string;
}) {
  return (
    <motion.div
      className="stat"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={`stat-icon ${tone ?? ""}`}>
        <ClipboardList size={18} />
      </div>
      <p>{label}</p>
      <h2>{value}</h2>
      <small>{detail}</small>
    </motion.div>
  );
}
function ComplaintTable({
  items = complaints,
  compact = false,
}: {
  items?: Complaint[];
  compact?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Complaint ID</th>
            <th>Waste type</th>
            {!compact && <th>Description</th>}
            <th>Location</th>
            <th>Reported</th>
            <th>Status</th>
            <th>Assigned staff</th>
            <th>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td>
                <strong>{c.id}</strong>
              </td>
              <td>
                <div className="type-cell">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt="" />
                  ) : (
                    <span className="image-fallback" />
                  )}
                  {c.wasteType}
                </div>
              </td>
              {!compact && <td className="description">{c.description}</td>}
              <td>{c.address}</td>
              <td>
                {new Date(c.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                })}
              </td>
              <td>
                <StatusBadge status={c.status} />
              </td>
              <td>{c.assignedStaff}</td>
              <td>
                <button
                  className="row-action"
                  aria-label={`View ${c.id}`}
                  onClick={() => navigate(`/complaints/${c.id}`)}
                >
                  <Eye size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.map((c) => (
        <article className="mobile-complaint" key={c.id}>
          <div>
            <strong>{c.id}</strong>
            <StatusBadge status={c.status} />
          </div>
          <h3>{c.wasteType}</h3>
          <p>
            <MapPin size={14} />
            {c.address}
          </p>
          <button onClick={() => navigate(`/complaints/${c.id}`)}>
            View details
          </button>
        </article>
      ))}
    </div>
  );
}
function Dashboard() {
  return (
    <>
      <PageTitle
        eyebrow="THURSDAY, 20 AUGUST"
        title={`Good morning, ${currentUser.name.split(" ")[0]}.`}
      >
        <Button variant="amber">
          <Plus size={17} />
          Create task
        </Button>
      </PageTitle>
      <p className="lead">
        Here’s what’s happening across your waste-management network.
      </p>
      <section className="stat-grid">
        <Stat
          label="Total complaints"
          value={stats.total.toLocaleString()}
          detail="↑ 8.2% from last month"
        />
        <Stat
          label="Pending review"
          value={stats.pending}
          detail="14 require attention"
          tone="amber-tone"
        />
        <Stat
          label="In progress"
          value={stats.inProgress}
          detail="58 active field tasks"
          tone="purple-tone"
        />
        <Stat
          label="Resolved"
          value={stats.resolved.toLocaleString()}
          detail="81.7% resolution rate"
          tone="green-tone"
        />
      </section>
      <section className="dashboard-grid">
        <ChartCard title="Reports & resolution" sub="Last 7 days">
          <ResponsiveContainer width="100%" height={245}>
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#1F5D4C" stopOpacity=".22" />
                  <stop offset="100%" stopColor="#1F5D4C" stopOpacity="0" />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="reports"
                stroke="#1F5D4C"
                strokeWidth={2}
                fill="url(#fill)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stroke="#D97D34"
                strokeWidth={2}
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Reports by status" sub="Current open workload">
          <ResponsiveContainer width="100%" height={245}>
            <PieChart>
              <Pie
                data={[
                  { name: "Pending", value: 86 },
                  { name: "Assigned", value: 71 },
                  { name: "In progress", value: 142 },
                  { name: "Resolved", value: 1020 },
                ]}
                dataKey="value"
                innerRadius={58}
                outerRadius={83}
                paddingAngle={3}
              >
                {["#B8862B", "#33648C", "#7A4FB5", "#2E7D5B"].map((x) => (
                  <Cell key={x} fill={x} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="legend">
            <span>
              <i className="pending-dot" />
              Pending 86
            </span>
            <span>
              <i className="assigned-dot" />
              Assigned 71
            </span>
            <span>
              <i className="progress-dot" />
              In progress 142
            </span>
          </div>
        </ChartCard>
      </section>
      <section className="section-head">
        <div>
          <h2>Recent complaints</h2>
          <p>Latest reports received from citizens.</p>
        </div>
        <NavLink to="/complaints" className="text-link">
          View all complaints
        </NavLink>
      </section>
      <ComplaintTable items={complaints.slice(0, 4)} compact />
    </>
  );
}
function ChartCard({
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
function Complaints() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const filtered = useMemo(
    () =>
      complaints.filter(
        (c) =>
          (status === "All" || c.status === status) &&
          `${c.id} ${c.wasteType} ${c.address}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [search, status],
  );
  return (
    <>
      <PageTitle eyebrow="CASE MANAGEMENT" title="Complaints">
        <Button variant="amber">
          <Plus size={17} />
          Create task
        </Button>
      </PageTitle>
      <div className="filters">
        <label className="search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID, type or location"
          />
        </label>
        <label className="select">
          <Filter size={16} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All</option>
            <option>Pending</option>
            <option>Assigned</option>
            <option value="InProgress">In Progress</option>
            <option>Resolved</option>
          </select>
        </label>
        <Button>Refresh</Button>
      </div>
      <p className="result-count">
        {filtered.length} complaints shown <span>•</span> Updated just now
      </p>
      {filtered.length ? (
        <ComplaintTable items={filtered} />
      ) : (
        <div className="empty">
          <ClipboardList size={28} />
          <h2>No complaints found</h2>
          <p>Try adjusting or clearing your current filters.</p>
          <Button
            onClick={() => {
              setSearch("");
              setStatus("All");
            }}
          >
            Reset filters
          </Button>
        </div>
      )}
    </>
  );
}
function Details() {
  const { id } = useParams();
  const c = complaints.find((x) => x.id === id) ?? complaints[0];
  const [status, setStatus] = useState(c.status);
  return (
    <>
      <div className="back">
        <NavLink to="/complaints">← Back to complaints</NavLink>
      </div>
      <PageTitle eyebrow="COMPLAINT DETAIL" title={c.id}>
        <div className="actions">
          <Button>Assign staff</Button>
          <Button variant="amber" onClick={() => setStatus("Resolved")}>
            <CheckCircle2 size={17} />
            Mark resolved
          </Button>
        </div>
      </PageTitle>
      <div className="detail-layout">
        <section className="detail-main">
          <article className="detail-hero">
            {c.imageUrl ? (
              <img src={c.imageUrl} alt={`Reported ${c.wasteType}`} />
            ) : (
              <div className="image-empty">No image supplied</div>
            )}
            <div>
              <StatusBadge status={status} />
              <h2>{c.wasteType}</h2>
              <p>{c.description}</p>
            </div>
          </article>
          <article className="detail-card">
            <h2>Location</h2>
            <div className="map-surface">
              <span className="road road-one" />
              <span className="road road-two" />
              <span className="pin">
                <MapPin size={24} />
              </span>
              <strong>{c.address}</strong>
            </div>
            <div className="coordinates">
              <span>
                Latitude <b>{c.latitude}</b>
              </span>
              <span>
                Longitude <b>{c.longitude}</b>
              </span>
            </div>
          </article>
        </section>
        <aside className="detail-side">
          <article>
            <h3>Case information</h3>
            <dl>
              <dt>Reported</dt>
              <dd>
                {new Date(c.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
              <dt>Last updated</dt>
              <dd>
                {new Date(c.updatedAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
              <dt>Reporter</dt>
              <dd>{c.reporterName}</dd>
              <dt>Current status</dt>
              <dd>
                <StatusBadge status={status} />
              </dd>
            </dl>
          </article>
          <article>
            <h3>Assignment</h3>
            <p className="assigned">
              <Avatar name={c.assignedStaff} />
              {c.assignedStaff}
            </p>
            <label className="form-label">
              Change status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
              >
                {(
                  [
                    "Pending",
                    "Assigned",
                    "InProgress",
                    "Resolved",
                  ] as ComplaintStatus[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="primary">Save changes</Button>
          </article>
        </aside>
      </div>
    </>
  );
}
function Nearby() {
  const navigate = useNavigate();
  return (
    <>
      <PageTitle eyebrow="LOCATION INTELLIGENCE" title="Nearby complaints">
        <Button>
          <Filter size={17} />
          Within 5 km
        </Button>
      </PageTitle>
      <div className="map-layout">
        <aside className="map-list">
          <div className="map-filter">
            <strong>23 complaints nearby</strong>
            <select>
              <option>All statuses</option>
              <option>Pending only</option>
            </select>
          </div>
          {complaints.map((c) => (
            <button key={c.id} onClick={() => navigate(`/complaints/${c.id}`)}>
              <StatusBadge status={c.status} />
              <strong>{c.wasteType}</strong>
              <span>
                <MapPin size={14} />
                {c.address}
              </span>
              <small>{c.distanceKm} km away</small>
            </button>
          ))}
        </aside>
        <section className="large-map">
          <div className="map-grid" />
          <span className="road road-one" />
          <span className="road road-two" />
          {complaints.map((c, i) => (
            <button
              className={`map-marker m${i}`}
              onClick={() => navigate(`/complaints/${c.id}`)}
              title={c.id}
              key={c.id}
            >
              <MapPin size={21} />
            </button>
          ))}
          <div className="map-label">Central District</div>
        </section>
      </div>
    </>
  );
}
function StaffPage() {
  return (
    <>
      <PageTitle eyebrow="WORKFORCE MANAGEMENT" title="Staff & tasks">
        <Button variant="amber">
          <Plus size={17} />
          Assign task
        </Button>
      </PageTitle>
      <section className="staff-summary">
        <Stat
          label="Active field staff"
          value="28"
          detail="4 currently on route"
        />
        <Stat
          label="Open assignments"
          value={stats.activeTasks}
          detail="12 due today"
          tone="amber-tone"
        />
        <Stat
          label="Completed today"
          value="46"
          detail="↑ 11% vs. yesterday"
          tone="green-tone"
        />
      </section>
      <div className="section-head">
        <div>
          <h2>Field team</h2>
          <p>Workload and current assignments.</p>
        </div>
        <Button>Manage staff</Button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Staff member</th>
              <th>Role</th>
              <th>Active tasks</th>
              <th>Completed</th>
              <th>Current assignment</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td>
                  <p className="person">
                    <Avatar name={s.name} />
                    <strong>{s.name}</strong>
                  </p>
                </td>
                <td>{s.role}</td>
                <td>{s.activeTasks}</td>
                <td>{s.completedTasks}</td>
                <td>{s.currentAssignment}</td>
                <td>
                  <span
                    className={`staff-status ${s.status.toLowerCase().replace(" ", "-")}`}
                  >
                    {s.status}
                  </span>
                </td>
                <td>
                  <button className="row-action">
                    <MoreHorizontal size={19} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Analytics() {
  const [range, setRange] = useState("30 days");
  return (
    <>
      <PageTitle eyebrow="PERFORMANCE OVERVIEW" title="Analytics">
        <div className="segmented">
          {["7 days", "30 days", "90 days"].map((x) => (
            <button
              className={range === x ? "selected" : ""}
              onClick={() => setRange(x)}
              key={x}
            >
              {x}
            </button>
          ))}
          <button>Custom</button>
        </div>
      </PageTitle>
      <section className="stat-grid">
        <Stat
          label="Total reports"
          value="1,248"
          detail="Across selected period"
        />
        <Stat
          label="Resolution rate"
          value="81.7%"
          detail="↑ 3.4% vs. prior period"
          tone="green-tone"
        />
        <Stat
          label="Avg. resolution time"
          value="18.4h"
          detail="↓ 2.1 hours"
          tone="purple-tone"
        />
        <Stat
          label="Most active area"
          value="Central"
          detail="312 reported cases"
          tone="amber-tone"
        />
      </section>
      <section className="dashboard-grid analytics">
        <ChartCard title="Complaint trends" sub={range}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weekly}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="reports" fill="#1F5D4C" radius={[3, 3, 0, 0]} />
              <Bar dataKey="resolved" fill="#D97D34" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Waste category distribution"
          sub="All reported issues"
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categories}
                dataKey="value"
                outerRadius={88}
                innerRadius={48}
              >
                {["#1F5D4C", "#5F8B7A", "#D97D34", "#A38663", "#B8C7BF"].map(
                  (x) => (
                    <Cell fill={x} key={x} />
                  ),
                )}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
      <ChartCard title="Area hotspot activity" sub="Reports by municipal zone">
        <div className="hotspots">
          {[
            "Central district",
            "South zone",
            "Riverside ward",
            "Market precinct",
          ].map((x, i) => (
            <div key={x}>
              <span>{x}</span>
              <div>
                <i style={{ width: `${90 - i * 17}%` }} />
              </div>
              <b>{312 - i * 54}</b>
            </div>
          ))}
        </div>
      </ChartCard>
    </>
  );
}
function Profile({ settings = false }: { settings?: boolean }) {
  const [saved, setSaved] = useState(false);
  if (settings)
    return (
      <>
        <PageTitle eyebrow="PREFERENCES" title="Settings" />
        <div className="settings-list">
          {[
            ["Account", "Manage account details and language preferences"],
            ["Notifications", "Choose which operational alerts you receive"],
            ["Appearance", "Interface density and display preferences"],
            ["Security", "Password, sessions and sign-in safeguards"],
          ].map(([title, sub], i) => (
            <article key={title}>
              <div>
                <h2>{title}</h2>
                <p>{sub}</p>
              </div>
              {i === 3 ? (
                <Button>Manage</Button>
              ) : (
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span />
                </label>
              )}
            </article>
          ))}
        </div>
      </>
    );
  return (
    <>
      <PageTitle eyebrow="YOUR ACCOUNT" title="Profile">
        <Button>Edit profile</Button>
      </PageTitle>
      <div className="profile-card">
        <Avatar />
        <div>
          <h2>{currentUser.name}</h2>
          <p>{currentUser.role} · CivicClean Municipal Services</p>
        </div>
        <button className="edit-link">Change avatar</button>
      </div>
      <form
        className="account-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
      >
        <h2>Account information</h2>
        <div className="form-grid">
          <label>
            Full name
            <input defaultValue={currentUser.name} />
          </label>
          <label>
            Email address
            <input type="email" defaultValue={currentUser.email} />
          </label>
          <label>
            Role
            <input disabled defaultValue={currentUser.role} />
          </label>
          <label>
            Department
            <input defaultValue="Solid Waste Operations" />
          </label>
        </div>
        <Button variant="primary">Save changes</Button>
        {saved && <span className="saved">Changes saved</span>}
      </form>
      <article className="security-card">
        <ShieldCheck />
        <div>
          <h2>Password & security</h2>
          <p>Keep your account secure with a strong password.</p>
        </div>
        <Button>Change password</Button>
      </article>
    </>
  );
}
function Login() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSubmitted(true);

    try {
      const result = await login({
        email: email.trim(),
        password,
      });

      if (result.success && result.data?.token) {
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.message || "Login failed");
        setSubmitted(false);
      }
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to connect to the server",
      );
      setSubmitted(false);
    }
  };

  return (
    <div className="login">
      <section>
        <div className="brand">
          <span className="brand-mark">C</span>
          Civic<span>Clean</span>
        </div>

        <div className="login-copy">
          <p className="eyebrow">MUNICIPAL OPERATIONS</p>

          <h1>A cleaner city starts with better coordination.</h1>

          <p>
            Monitor reports, support field teams, and keep every neighbourhood
            moving.
          </p>
        </div>

        <div className="login-footer">
          © 2026 CivicClean · Secure operations portal
        </div>
      </section>

      <main>
        <form onSubmit={handleLogin}>
          <p className="eyebrow">WELCOME BACK</p>

          <h1>Sign in to CivicClean</h1>

          <p>Use your authorised work account to continue.</p>

          <label>
            Work email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@municipality.gov"
            />
          </label>

          <label>
            Password
            <div className="password">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                placeholder="Enter your password"
              />

              <button type="button" onClick={() => setShow(!show)}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && <div className="login-error">{error}</div>}

          <div className="login-row">
            <label className="remember">
              <input type="checkbox" />
              Remember me
            </label>

            <a href="#help">Need help?</a>
          </div>

          <Button variant="amber" type="submit" disabled={submitted}>
            {submitted ? "Signing in…" : "Sign in"}
          </Button>

          <p className="login-note">
            This portal is for authorised municipal staff only.
          </p>
        </form>
      </main>
    </div>
  );
}
function App() {
  return (
    <Routes>
      {/* Default route */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public login page */}
      <Route path="/login" element={<Login />} />

      {/* Protected portal */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Shell>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/complaints" element={<Complaints />} />

                <Route path="/complaints/:id" element={<Details />} />

                <Route path="/nearby" element={<Nearby />} />

                <Route path="/staff" element={<StaffPage />} />

                <Route path="/analytics" element={<Analytics />} />

                <Route path="/profile" element={<Profile />} />

                <Route path="/settings" element={<Profile settings />} />

                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </Shell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}


export default App;