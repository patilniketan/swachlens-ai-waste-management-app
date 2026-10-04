import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map as MapIcon,
  Menu,
  Users,
  X,
} from "lucide-react";
import { NavLink, useLocation, useNavigate, useOutlet } from "react-router-dom";
import { logout } from "../api/auth";
import { getUser } from "../auth/session";
import { emailName } from "../utils/format";
import { Avatar } from "./ui";

const ADMIN_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/complaints", label: "Complaints", icon: ClipboardList },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/plan", label: "Today's plan", icon: CalendarCheck },
  { to: "/staff", label: "Staff & tasks", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const STAFF_NAV = [{ to: "/my-tasks", label: "My tasks", icon: ListChecks }];

const ROLE_LABEL = { ADMIN: "Administrator", STAFF: "Field staff", CITIZEN: "Citizen" } as const;

// Keeps the page it mounted with, so the exit animation shows the old page.
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);

  return frozen;
}

export function Shell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const nav = user?.role === "STAFF" ? STAFF_NAV : ADMIN_NAV;
  const name = emailName(user?.email);

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="shell">
      <aside className={open ? "sidebar mobile-open" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark">S</span>
          <span>
            Swachh<span>Lens</span> AI
          </span>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X size={19} />
          </button>
        </div>
        <p className="workspace">{user?.role === "STAFF" ? "FIELD APP" : "OPERATIONS PORTAL"}</p>
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
          <NavLink to="/profile" onClick={() => setOpen(false)}>
            <Avatar name={name} />
            <span>Profile</span>
          </NavLink>
          <button onClick={signOut}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <main>
        <header>
          <button className="menu" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu />
          </button>
          <div className="crumb">
            {user?.role === "STAFF" ? "Field work" : "Operations"} <span>/</span>{" "}
            {location.pathname.split("/")[1]?.replace("-", " ") || "home"}
          </div>
          <div className="head-actions">
            <div className="profile-mini">
              <Avatar name={name} />
              <div>
                <strong>{name}</strong>
                <small>{user ? ROLE_LABEL[user.role] : ""}</small>
              </div>
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
            <FrozenOutlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
