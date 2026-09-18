import type { ListingType } from "../types";

export function formatPrice(price: number, type: ListingType): string {
  if (type === "DONATE") return "Free";
  const value = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(price);
  return type === "RENT" ? `Rs ${value}/day` : `Rs ${value}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDistance(km?: number | null): string | null {
  if (km === null || km === undefined || Number.isNaN(km)) return null;
  // Agar distance 50 meter se kam ho
  if (km < 0.05) return "Nearby (< 100m)";
  // Agar distance 1 km se kam ho (e.g. 250 m away, 800 m away)
  if (km < 1.0) {
    const meters = Math.max(50, Math.round(km * 1000));
    return `${meters} m away`;
  }
  // 1 km ya us se zyada (e.g. 1.2 km away, 6.4 km away)
  return `${km.toFixed(1)} km away`;
}

export function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}
