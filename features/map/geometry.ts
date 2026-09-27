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

/** Detect an already self-crossing ring, ignoring edges that share an endpoint. */
export function ringHasSelfIntersections(ring: LatLng[]): boolean {
  const points = openRing(ring);
  const count = points.length;
  if (count < 3) return true;
  for (let first = 0; first < count; first++) {
    const firstNext = (first + 1) % count;
    for (let second = first + 1; second < count; second++) {
      const secondNext = (second + 1) % count;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) return true;
    }
  }
  return false;
}

/** Remove bow-tie crossings by reversing the point run between crossing edges. */
export function untangleRing(ring: LatLng[]): LatLng[] {
  let points = openRing(ring);
  if (points.length < 4) return points;
  const maxPasses = points.length * 4;

  for (let pass = 0; pass < maxPasses; pass++) {
    let untangled = false;
    const count = points.length;
    for (let first = 0; first < count && !untangled; first++) {
      const firstNext = (first + 1) % count;
      for (let second = first + 2; second < count; second++) {
        const secondNext = (second + 1) % count;
        if (secondNext === first) continue;
        if (!segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) continue;
        points = [
          ...points.slice(0, first + 1),
          ...points.slice(first + 1, second + 1).reverse(),
          ...points.slice(second + 1),
        ];
        untangled = true;
        break;
      }
    }
    if (!untangled) break;
  }
  return points;
}

/**
 * Check just the two edges affected by moving one vertex. This stays O(n),
 * even for GPS walks with thousands of points, and prevents drag edits from
 * introducing a self-crossing fence in the first place.
 */
export function vertexMoveKeepsRingValid(
  ring: LatLng[],
  vertexIndex: number,
  next: LatLng,
  allowRepairOfInvalidRing = false,
): boolean {
  const points = openRing(ring);
  const count = points.length;
  if (count < 3 || !Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= count) return false;
  if (!Number.isFinite(next[0]) || !Number.isFinite(next[1])) return false;

  // Some existing farm boundaries were saved with crossings. Do not trap the
  // user in an uneditable ring: let them reposition handles, then validate the
  // full outline when saving. For a valid ring, keep preventing new crossings.
  if (allowRepairOfInvalidRing) return true;

  const previous = (vertexIndex - 1 + count) % count;
  const after = (vertexIndex + 1) % count;
  const beforePrevious = (vertexIndex - 2 + count) % count;
  const candidateEdges: { a: LatLng; b: LatLng; ignoredEdges: Set<number> }[] = [
    {
      a: points[previous],
      b: next,
      // Ignore the previous edge, the other edge being replaced, and the
      // edge that naturally meets this segment at its unchanged endpoint.
      ignoredEdges: new Set([beforePrevious, previous, vertexIndex]),
    },
    {
      a: next,
      b: points[after],
      // Ignore the next edge, the other edge being replaced, and the edge
      // that naturally meets this segment at its unchanged endpoint.
      ignoredEdges: new Set([previous, vertexIndex, after]),
    },
  ];

  for (const { a, b, ignoredEdges } of candidateEdges) {
    for (let edge = 0; edge < count; edge++) {
      if (ignoredEdges.has(edge)) continue;
      if (segmentsIntersect(a, b, points[edge], points[(edge + 1) % count])) return false;
    }
  }
  return true;
}
