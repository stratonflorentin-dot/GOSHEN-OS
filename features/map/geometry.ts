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
