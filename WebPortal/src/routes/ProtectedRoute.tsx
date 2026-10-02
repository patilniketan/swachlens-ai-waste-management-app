import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken, getUser, homeFor } from "../auth/session";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  // Roles allowed here; others are sent to their own home page.
  roles: UserRole[];
  children?: React.ReactNode;
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const location = useLocation();
  const user = getUser();

  if (!getToken() || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
