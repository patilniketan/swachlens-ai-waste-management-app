import { Eye, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { assetUrl } from "../api/client";
import type { Complaint } from "../types";
import { emailName, formatDate, shortId } from "../utils/format";
import { AiChips, PriorityBadge, SimulatedTag, StatusBadge } from "./ui";

const assignee = (complaint: Complaint) => {
  const open = complaint.assignments?.find((a) => a.status !== "COMPLETED");
  const any = open ?? complaint.assignments?.[0];

  return any?.staff ? emailName(any.staff.email) : "Unassigned";
};

export function ComplaintTable({
  items,
  compact = false,
}: {
  items: Complaint[];
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const open = (id: string) => navigate(`/complaints/${id}`);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Complaint</th>
            <th>Waste type</th>
            {!compact && <th>Summary</th>}
            <th>Location</th>
            <th>Reported</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assigned</th>
            <th>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const image = assetUrl(c.imageUrl);

            return (
              <tr key={c.id} className="clickable-row" onClick={() => open(c.id)}>
                <td>
                  <strong>{shortId(c.id)}</strong>
                  <div className="cell-tags">
                    <AiChips source={c.aiSource} needsManualReview={c.needsManualReview} />
                    {c.isSimulated && <SimulatedTag />}
                  </div>
                </td>
                <td className="wrap">
                  <div className="type-cell">
                    {image ? <img src={image} alt="" /> : <span className="image-fallback" />}
                    {c.wasteType ?? "Unclassified"}
                  </div>
                </td>
                {!compact && (
                  <td className="description">{c.aiSummary ?? c.description}</td>
                )}
                <td className="wrap">{c.address ?? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`}</td>
                <td>{formatDate(c.createdAt)}</td>
                <td>
                  <PriorityBadge priority={c.priority} urgency={c.urgencyScore} />
                  {c.voteCount > 1 && <small className="votes">{c.voteCount} reports</small>}
                </td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td>{assignee(c)}</td>
                <td>
                  <button
                    className="row-action"
                    aria-label={`View ${shortId(c.id)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      open(c.id);
                    }}
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {items.map((c) => (
        <article className="mobile-complaint" key={c.id}>
          <div>
            <strong>{shortId(c.id)}</strong>
            <StatusBadge status={c.status} />
          </div>
          <h3>{c.wasteType ?? "Unclassified"}</h3>
          <div className="cell-tags">
            <PriorityBadge priority={c.priority} urgency={c.urgencyScore} />
            <AiChips source={c.aiSource} needsManualReview={c.needsManualReview} />
            {c.isSimulated && <SimulatedTag />}
          </div>
          <p>
            <MapPin size={14} />
            {c.address ?? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`}
          </p>
          <button onClick={() => open(c.id)}>View details</button>
        </article>
      ))}
    </div>
  );
}
