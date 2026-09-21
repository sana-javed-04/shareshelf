import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { DEFAULT_CENTER } from "@/lib/utils/geo";
import { cn } from "@/lib/utils";
import type { Item } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatters";

export interface MapPoint {
  id: number;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  href?: string;
}

export function itemsToPoints(items: Item[]): MapPoint[] {
  return items
    .filter((i) => i.latitude !== null && i.longitude !== null)
    .map((i) => ({
      id: i.id,
      lat: i.latitude as number,
      lng: i.longitude as number,
      title: i.title,
      subtitle: `${i.listing_type === "DONATE" ? "Donation" : i.listing_type === "RENT" ? "For rent" : "For sale"} · ${formatPrice(i.price, i.listing_type)}`,
      href: `/items/${i.id}`,
    }));
}

interface MapViewProps {
  points?: MapPoint[];
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  /** Enables click-to-pick and reports the fuzzed coordinates back. */
  selectable?: boolean;
  selected?: { lat: number; lng: number } | null;
  onSelect?: (coords: { lat: number; lng: number }) => void;
  radiusKm?: number;
  ariaLabel?: string;
}

export default function MapView({
  points = [],
  center,
  zoom = 12,
  className,
  selectable = false,
  selected = null,
  onSelect,
  radiusKm,
  ariaLabel = "Map of approximate item locations",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<Marker[]>([]);
  const circleRef = useRef<unknown>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;

    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([center?.lat ?? DEFAULT_CENTER.lat, center?.lng ?? DEFAULT_CENTER.lng], zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      mapRef.current = map;

      if (selectable) {
        map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
          const lat = Math.round(event.latlng.lat * 1000) / 1000;
          const lng = Math.round(event.latlng.lng * 1000) / 1000;
          onSelectRef.current?.({ lat, lng });
        });
      }
      setTimeout(() => map?.invalidateSize(), 120);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      if (cancelled || !map) return;

      layerRef.current.forEach((m) => m.remove());
      layerRef.current = [];

      const icon = L.divIcon({
        className: "",
        html: `<span style="display:grid;place-items:center;width:28px;height:28px;border-radius:999px;background:var(--color-primary);color:var(--color-primary-foreground);box-shadow:0 6px 16px -6px rgba(0,0,0,.5);font-weight:700;font-size:13px">◎</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const all = selected
        ? [...points, { id: -1, lat: selected.lat, lng: selected.lng, title: "Selected location" }]
        : points;

      all.forEach((p) => {
        const marker = L.marker([p.lat, p.lng], { icon, title: p.title }).addTo(map);
        marker.bindPopup(
          `<strong>${p.title}</strong>${p.subtitle ? `<br/><span>${p.subtitle}</span>` : ""}${
            p.href
              ? `<br/><a href="${p.href}" style="color:var(--color-primary);font-weight:600">View details</a>`
              : ""
          }`,
        );
        layerRef.current.push(marker);
      });

      if (circleRef.current) (circleRef.current as { remove: () => void }).remove();
      const focus = selected ?? center;
      if (radiusKm && focus) {
        circleRef.current = L.circle([focus.lat, focus.lng], {
          radius: radiusKm * 1000,
          color: "var(--color-primary)",
          fillColor: "var(--color-primary)",
          fillOpacity: 0.08,
          weight: 1,
        }).addTo(map);
      }
      if (focus)
        map.setView([focus.lat, focus.lng], radiusKm ? Math.max(10, 14 - radiusKm / 4) : zoom);
    })();
    return () => {
      cancelled = true;
    };
  }, [points, selected, radiusKm, center, zoom]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={ariaLabel}
      className={cn("h-72 w-full overflow-hidden rounded-2xl border", className)}
    />
  );
}
