import { useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { login } from "../api/auth";
import { errorMessage } from "../api/client";
import { getToken, getUser, homeFor } from "../auth/session";
import { Button } from "../components/ui";

export function Login() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const existing = getUser();

  // Already signed in: go to this role's home.
  if (getToken() && existing) {
    return <Navigate to={homeFor(existing.role)} replace />;
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const user = await login({ email: email.trim(), password });
      // Back to the page that required sign-in (ProtectedRoute sends a
      // different role to its own home), otherwise this role's home.
      const from = (location.state as { from?: string } | null)?.from;

      navigate(from && from !== "/login" ? from : homeFor(user.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <section>
        <div className="brand">
          <span className="brand-mark">S</span>
          Swachh<span>Lens</span> AI
        </div>

        <div className="login-copy">
          <p className="eyebrow">MUNICIPAL OPERATIONS</p>
          <h1>A cleaner city starts with better coordination.</h1>
          <p>Monitor reports, support field teams, and keep every neighbourhood moving.</p>
        </div>

        <div className="login-footer">© 2026 SwachhLens AI · Secure operations portal</div>
      </section>

      <main>
        <form onSubmit={handleLogin}>
          <p className="eyebrow">WELCOME BACK</p>
          <h1>Sign in to SwachhLens AI</h1>
          <p>Use your authorised work account to continue.</p>

          {params.get("expired") && !error && (
            <div className="login-error">Your session ended. Please sign in again.</div>
          )}

          <label>
            Work email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
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
                required
                autoComplete="current-password"
                placeholder="Enter your password"
              />
              <button type="button" onClick={() => setShow(!show)}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && <div className="login-error">{error}</div>}

          <Button variant="amber" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>

          <p className="login-note">
            Administrators see the operations dashboard; field staff see their assigned tasks.
          </p>
        </form>
      </main>
    </div>
  );
}
