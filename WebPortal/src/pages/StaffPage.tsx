import { CheckCircle2, ClipboardList, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { getStaff } from "../api/staff";
import { Async, Avatar, EmptyState, PageTitle, Stat } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { emailName, shortId } from "../utils/format";

export function StaffPage() {
  const staff = useAsync(getStaff, [], { pollMs: 10_000 });

  return (
    <>
      <PageTitle eyebrow="WORKFORCE MANAGEMENT" title="Staff & tasks" />
      <Async state={staff} loadingLabel="Loading staff…">
        {(list) => {
          const open = list.reduce((total, s) => total + s.assigned + s.inProgress, 0);
          const completed = list.reduce((total, s) => total + s.completed, 0);

          return (
            <>
              <section className="staff-summary">
                <Stat label="Field staff" value={list.length} detail="Accounts with the STAFF role" icon={Users} />
                <Stat
                  label="Open assignments"
                  value={open}
                  detail={`${list.reduce((t, s) => t + s.inProgress, 0)} in progress`}
                  tone="amber-tone"
                  icon={ClipboardList}
                />
                <Stat
                  label="Completed assignments"
                  value={completed}
                  detail="All time"
                  tone="green-tone"
                  icon={CheckCircle2}
                />
              </section>
              <div className="section-head">
                <div>
                  <h2>Field team</h2>
                  <p>Workload and current assignment. Assign work from a complaint's detail page.</p>
                </div>
              </div>
              {list.length === 0 ? (
                <EmptyState title="No staff accounts" text="Create users with the STAFF role to assign work." />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Staff member</th>
                        <th>Assigned</th>
                        <th>In progress</th>
                        <th>Completed</th>
                        <th>Current assignment</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((s) => {
                        const busy = s.assigned + s.inProgress > 0;

                        return (
                          <tr key={s.id}>
                            <td>
                              <p className="person">
                                <Avatar name={emailName(s.email)} />
                                <strong>{s.email}</strong>
                              </p>
                            </td>
                            <td>{s.assigned}</td>
                            <td>{s.inProgress}</td>
                            <td>{s.completed}</td>
                            <td>
                              {s.currentAssignment ? (
                                <NavLink to={`/complaints/${s.currentAssignment.complaintId}`}>
                                  {shortId(s.currentAssignment.complaintId)} · {s.currentAssignment.wasteType ?? "—"}
                                </NavLink>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              <span className={`staff-status ${busy ? "busy" : "available"}`}>
                                {busy ? "Busy" : "Available"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {list.map((s) => (
                    <article className="mobile-complaint" key={s.id}>
                      <div>
                        <strong>{s.email}</strong>
                      </div>
                      <p>
                        {s.assigned} assigned · {s.inProgress} in progress · {s.completed} completed
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </>
          );
        }}
      </Async>
    </>
  );
}
