export type LatLng = [number, number];

/** Return an open ring, removing duplicate closing and consecutive points. */
export function openRing(ring: LatLng[]): LatLng[] {
  const points = ring.filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  const compact = points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || point[0] !== previous[0] || point[1] !== previous[1];
  });
  if (compact.length > 1) {
    const first = compact[0];
    const last = compact[compact.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) compact.pop();
  }
  return compact;
}

/** Convert a GeoJSON [longitude, latitude] ring to an open [latitude, longitude] ring. */
export function geoJsonRingToLatLng(ring: [number, number][]): LatLng[] {
  return openRing(ring.map(([lng, lat]) => [lat, lng] as LatLng));
}

function orientation(a: LatLng, b: LatLng, c: LatLng): number {
  return (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
}

function liesOnSegment(a: LatLng, b: LatLng, point: LatLng): boolean {
  const epsilon = 1e-10;
  return Math.abs(orientation(a, b, point)) <= epsilon &&
    point[0] >= Math.min(a[0], b[0]) - epsilon && point[0] <= Math.max(a[0], b[0]) + epsilon &&
    point[1] >= Math.min(a[1], b[1]) - epsilon && point[1] <= Math.max(a[1], b[1]) + epsilon;
}

function segmentsIntersect(a: LatLng, b: LatLng, c: LatLng, d: LatLng): boolean {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) &&
      ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return true;
  return liesOnSegment(a, b, c) || liesOnSegment(a, b, d) ||
    liesOnSegment(c, d, a) || liesOnSegment(c, d, b);
}

/**
 * Check just the two edges affected by moving one vertex. This stays O(n),
 * even for GPS walks with thousands of points, and prevents drag edits from
 * introducing a self-crossing fence in the first place.
 */
export function vertexMoveKeepsRingValid(ring: LatLng[], vertexIndex: number, next: LatLng): boolean {
  const points = openRing(ring);
  const count = points.length;
  if (count < 3 || !Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= count) return false;
  if (!Number.isFinite(next[0]) || !Number.isFinite(next[1])) return false;

  const previous = (vertexIndex - 1 + count) % count;
  const after = (vertexIndex + 1) % count;
  const adjacentEdges = new Set([previous, vertexIndex]);
  const candidateEdges: [LatLng, LatLng][] = [
    [points[previous], next],
    [next, points[after]],
  ];

  for (const [a, b] of candidateEdges) {
    for (let edge = 0; edge < count; edge++) {
      const nextEdge = (edge + 1) % count;
      if (adjacentEdges.has(edge) || adjacentEdges.has(nextEdge)) continue;
      if (segmentsIntersect(a, b, points[edge], points[nextEdge])) return false;
    }
  }
  return true;
}
