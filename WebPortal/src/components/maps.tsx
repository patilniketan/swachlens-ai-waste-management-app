import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { ComplaintPriority, HotspotLevel } from "../types";

export const PRIORITY_COLOR: Record<ComplaintPriority, string> = {
  CRITICAL: "#B3412F",
  STANDARD: "#D97D34",
  TRIVIAL: "#5F8B7A",
};

export const HOTSPOT_COLOR: Record<HotspotLevel, string> = {
  CRITICAL: "#B3412F",
  HIGH: "#D97D34",
  MEDIUM: "#B8862B",
  LOW: "#5F8B7A",
};

export const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Fits the view to the given bounds once they are known.
export function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
  }, [map, bounds]);

  return null;
}

export function MiniMap({
  latitude,
  longitude,
  priority = "STANDARD",
}: {
  latitude: number;
  longitude: number;
  priority?: ComplaintPriority;
}) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      scrollWheelZoom={false}
      className="mini-map"
    >
      <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
      <CircleMarker
        center={[latitude, longitude]}
        radius={9}
        pathOptions={{ color: "#fff", weight: 2, fillColor: PRIORITY_COLOR[priority], fillOpacity: 1 }}
      />
    </MapContainer>
  );
}
