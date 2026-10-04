import { LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "../api/auth";
import { getUser } from "../auth/session";
import { Avatar, Button, PageTitle } from "../components/ui";
import { emailName } from "../utils/format";

const ROLE_LABEL = { ADMIN: "Administrator", STAFF: "Field staff", CITIZEN: "Citizen" } as const;

export function Profile() {
  const user = getUser();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <PageTitle eyebrow="YOUR ACCOUNT" title="Profile" />
      <div className="profile-card">
        <Avatar name={emailName(user?.email)} />
        <div>
          <h2>{user?.email}</h2>
          <p>{user ? ROLE_LABEL[user.role] : ""} · SwachhLens AI</p>
        </div>
      </div>
      <article className="security-card">
        <ShieldCheck />
        <div>
          <h2>Session</h2>
          <p>You are signed in on this device. Signing out removes your session token from this browser.</p>
        </div>
        <Button onClick={signOut}>
          <LogOut size={16} />
          Sign out
        </Button>
      </article>
    </>
  );
}
