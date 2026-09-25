const EARTH_R = 6_371_000;

/** Great-circle distance between two [lat, lng] points, in meters. */
export function haversineM(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function pathLengthM(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1], points[i]);
  return total;
}

/**
 * Approximate geodesic polygon area in m² via a local-equirectangular
 * projection around the ring centroid. Good for phone-GPS sized polygons;
 * authoritative area comes from PostGIS on save.
 */
export function polygonAreaM2(ring: [number, number][]): number {
  if (ring.length < 3) return 0;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const latC = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const kx = EARTH_R * toRad(1) * Math.cos(toRad(latC));
  const ky = EARTH_R * toRad(1);
  let twice = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = [ring[i][1] * kx, ring[i][0] * ky];
    const j = (i + 1) % ring.length;
    const [x2, y2] = [ring[j][1] * kx, ring[j][0] * ky];
    twice += x1 * y2 - x2 * y1;
  }
  return Math.abs(twice) / 2;
}

export function accuracyLabel(m: number | null): { label: string; tone: "good" | "fair" | "poor" } {
  if (m == null) return { label: "Waiting for GPS…", tone: "poor" };
  if (m <= 10) return { label: "Good", tone: "good" };
  if (m <= 30) return { label: "Fair", tone: "fair" };
  return { label: "Poor — move to open sky", tone: "poor" };
}
