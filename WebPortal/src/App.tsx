import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { setUnauthorizedHandler } from "./api/client";
import { getUser, homeFor } from "./auth/session";
import { Shell } from "./components/Shell";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { Analytics } from "./pages/Analytics";
import { ComplaintDetail } from "./pages/ComplaintDetail";
import { Complaints } from "./pages/Complaints";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { MapPage } from "./pages/MapPage";
import { MyTasks } from "./pages/MyTasks";
import { PlanPage } from "./pages/PlanPage";
import { Profile } from "./pages/Profile";
import { StaffPage } from "./pages/StaffPage";

function HomeRedirect() {
  return <Navigate to={homeFor(getUser()?.role)} replace />;
}

function App() {
  const navigate = useNavigate();

  // Any 401 (expired/invalid token) signs out and returns to login.
  useEffect(() => {
    setUnauthorizedHandler(() => navigate("/login?expired=1", { replace: true }));
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Administrators */}
      <Route
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/complaints/:id" element={<ComplaintDetail />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>

      {/* Field staff */}
      <Route
        element={
          <ProtectedRoute roles={["STAFF"]}>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route path="/my-tasks" element={<MyTasks />} />
      </Route>

      {/* Both */}
      <Route
        element={
          <ProtectedRoute roles={["ADMIN", "STAFF"]}>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default App;
