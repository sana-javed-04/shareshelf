/** Haversine distance in kilometres. Mirrors backend app/services/distance_service.py */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Coarsens coordinates (~1km grid) so exact addresses are never revealed. */
export function fuzzCoordinates(lat: number, lng: number) {
  const round = (v: number) => Math.round(v * 100) / 100;
  return { lat: round(lat), lng: round(lng) };
}

export const DEFAULT_CENTER = { lat: 24.8607, lng: 67.0011 }; // Karachi
