/** "40.1885, 29.0610" formatindaki metni koordinata cevirir. */
export function parseCoords(v: string): { lat: number; lng: number } | null {
  const parts = String(v ?? "")
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 2) return null;
  const [lat, lng] = parts as [number, number];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export const formatCoords = (lat: number, lng: number) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

/** Iki koordinat arasindaki mesafeyi metre cinsinden dondurur (haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
