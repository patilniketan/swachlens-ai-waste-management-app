import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import { latLngBounds } from "leaflet";
import { useNavigate } from "react-router-dom";
import { getHotspots, getMapComplaints } from "../api/complaints";
import { FitBounds, HOTSPOT_COLOR, OSM_ATTRIBUTION, OSM_TILES, PRIORITY_COLOR } from "../components/maps";
import { Async, PageTitle, PriorityBadge, SimulatedTag, StatusBadge } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { PRIORITIES, type ComplaintPriority } from "../types";
import { shortId } from "../utils/format";

// Fallback view (New Delhi) until data loads.
const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];

export function MapPage() {
  const navigate = useNavigate();
  const complaints = useAsync(getMapComplaints, [], { pollMs: 10_000 });
  const hotspots = useAsync(getHotspots, [], { pollMs: 30_000 });
  const [priority, setPriority] = useState<ComplaintPriority | "">("");
  const [showHotspots, setShowHotspots] = useState(true);

  const visible = useMemo(
    () => (complaints.data ?? []).filter((c) => !priority || c.priority === priority),
    [complaints.data, priority],
  );

  // Fit once to all complaints (not on every poll or filter change).
  const bounds = useMemo(() => {
    const all = complaints.data ?? [];
    return all.length ? latLngBounds(all.map((c) => [c.latitude, c.longitude])) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaints.data === null]);

  return (
    <>
      <PageTitle eyebrow="LOCATION INTELLIGENCE" title="Map">
        <div className="segmented">
          <button className={priority === "" ? "selected" : ""} onClick={() => setPriority("")}>
            All
          </button>
          {PRIORITIES.map((p) => (
            <button key={p} className={priority === p ? "selected" : ""} onClick={() => setPriority(p)}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
          <button className={showHotspots ? "selected" : ""} onClick={() => setShowHotspots(!showHotspots)}>
            Hotspots
          </button>
        </div>
      </PageTitle>
      <Async state={complaints} loadingLabel="Loading map data…">
        {() => (
          <div className="map-layout">
            <aside className="map-list">
              <div className="map-filter">
                <strong>
                  {visible.length} open complaint{visible.length === 1 ? "" : "s"}
                </strong>
                <span className="muted-line">most urgent first</span>
              </div>
              {visible.length === 0 && <p className="muted-line pad">Nothing to show for this filter.</p>}
              {visible.map((c) => (
                <button key={c.id} onClick={() => navigate(`/complaints/${c.id}`)}>
                  <span className="cell-tags">
                    <PriorityBadge priority={c.priority} urgency={c.urgencyScore} />
                    <StatusBadge status={c.status} />
                    {c.isSimulated && <SimulatedTag />}
                  </span>
                  <strong>{c.wasteType ?? "Unclassified"}</strong>
                  <span>
                    <MapPin size={14} />
                    {c.address ?? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`}
                  </span>
                  {c.voteCount > 1 && <small>{c.voteCount} reports</small>}
                </button>
              ))}
            </aside>
            <section className="large-map leaflet-host">
              <MapContainer center={DEFAULT_CENTER} zoom={12} className="leaflet-fill">
                <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
                <FitBounds bounds={bounds} />
                {showHotspots &&
                  hotspots.data?.map((h) => (
                    <Circle
                      key={`${h.latitude},${h.longitude}`}
                      center={[h.latitude, h.longitude]}
                      radius={h.radiusMeters}
                      pathOptions={{
                        color: HOTSPOT_COLOR[h.level],
                        weight: 1.5,
                        fillColor: HOTSPOT_COLOR[h.level],
                        fillOpacity: 0.12,
                      }}
                    >
                      <Tooltip>
                        {h.level} hotspot · {h.complaintCount} complaints · {h.totalVotes} reports
                        {h.simulatedCount > 0 ? ` (${h.simulatedCount} simulated)` : ""}
                      </Tooltip>
                    </Circle>
                  ))}
                {visible.map((c) => (
                  <CircleMarker
                    key={c.id}
                    center={[c.latitude, c.longitude]}
                    radius={c.priority === "CRITICAL" ? 9 : 7}
                    pathOptions={{ color: "#fff", weight: 2, fillColor: PRIORITY_COLOR[c.priority], fillOpacity: 0.95 }}
                    eventHandlers={{ click: () => navigate(`/complaints/${c.id}`) }}
                  >
                    <Popup>
                      <strong>{c.wasteType ?? "Unclassified"}</strong> · {shortId(c.id)}
                      {c.isSimulated ? " · simulated" : ""}
                      <br />
                      {c.aiSummary ?? c.address}
                    </Popup>
                    <Tooltip>
                      {c.priority} · {c.wasteType ?? "Unclassified"}
                    </Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
              <div className="map-legend">
                {PRIORITIES.map((p) => (
                  <span key={p}>
                    <i style={{ background: PRIORITY_COLOR[p] }} />
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}
      </Async>
    </>
  );
}
