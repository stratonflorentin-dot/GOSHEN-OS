import { withUser } from "@/lib/db";
import type { CreateFarmInput } from "@/lib/validation/farm";

export type Farm = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  farmType: string;
  ownershipType: string | null;
  country: string;
  region: string | null;
  district: string | null;
  ward: string | null;
  village: string | null;
  address: string | null;
  boundarySource: string | null;
  areaM2: string | null; // numeric comes back as string
  status: string;
  createdAt: string;
};

function toFarm(row: Record<string, unknown>): Farm {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    farmType: row.farm_type as string,
    ownershipType: (row.ownership_type as string | null) ?? null,
    country: row.country as string,
    region: (row.region as string | null) ?? null,
    district: (row.district as string | null) ?? null,
    ward: (row.ward as string | null) ?? null,
    village: (row.village as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    boundarySource: (row.boundary_source as string | null) ?? null,
    areaM2: (row.area_m2 as string | null) ?? null,
    status: row.status as string,
    createdAt: String(row.created_at),
  };
}

/** [[lat, lng], ...] -> closed [lng, lat] GeoJSON ring accepted by ST_GeomFromGeoJSON. */
function toGeoJsonPolygon(ring: [number, number][]): string {
  const first = ring[0];
  const closed =
    ring.length > 2 && first[0] === ring[ring.length - 1][0] && first[1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, first];
  return JSON.stringify({
    type: "Polygon",
    coordinates: [closed.map(([lat, lng]) => [lng, lat])],
  });
}

export async function createFarm(userId: string, input: CreateFarmInput): Promise<Farm> {
  return withUser(userId, async (db) => {
    let rows: Record<string, unknown>[];
    if (input.boundary) {
      const geojson = toGeoJsonPolygon(input.boundary);
      rows = await db`
        insert into public.farms
          (organization_id, name, description, farm_type, ownership_type,
           country, region, district, ward, village, address,
           boundary, boundary_source)
        values
          (${input.organizationId}, ${input.name}, ${input.description || null},
           ${input.farmType}, ${input.ownershipType || null},
           ${input.country}, ${input.region || null}, ${input.district || null},
           ${input.ward || null}, ${input.village || null}, ${input.address || null},
           ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326), 'gps_walk')
        returning *
      `;
    } else {
      rows = await db`
        insert into public.farms
          (organization_id, name, description, farm_type, ownership_type,
           country, region, district, ward, village, address)
        values
          (${input.organizationId}, ${input.name}, ${input.description || null},
           ${input.farmType}, ${input.ownershipType || null},
           ${input.country}, ${input.region || null}, ${input.district || null},
           ${input.ward || null}, ${input.village || null}, ${input.address || null})
        returning *
      `;
    }
    return toFarm(rows[0]);
  });
}

/** Save a manually adjusted farm fence and append an immutable boundary history record. */
export async function updateFarmBoundary(
  userId: string,
  organizationId: string,
  farmId: string,
  boundaryGeoJson: string,
): Promise<void> {
  return withUser(userId, async (db) => {
    const rows = await db`
      with candidate as (
        select ST_SetSRID(ST_GeomFromGeoJSON(${boundaryGeoJson}), 4326) as geom
      ), updated as (
        update public.farms f
        set boundary = candidate.geom,
            boundary_source = 'manual_draw'
        from candidate
        where f.id = ${farmId}
          and f.organization_id = ${organizationId}
          and ST_IsValid(candidate.geom)
        returning f.id, f.organization_id, f.boundary, f.area_m2
      )
      insert into public.farm_boundary_versions
        (farm_id, organization_id, boundary, source, point_count, area_m2, perimeter_m)
      select id, organization_id, boundary, 'manual_draw',
             greatest(ST_NPoints(ST_ExteriorRing(boundary)) - 1, 0),
             area_m2, ST_Perimeter(boundary::geography)
      from updated
      returning farm_id
    `;
    if (!rows[0]) throw new Error("BOUNDARY_INVALID_OR_NOT_ALLOWED");
  });
}

export async function listFarms(
  userId: string,
  organizationId: string,
): Promise<Farm[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select * from public.farms
      where organization_id = ${organizationId} and status = 'active'
      order by created_at asc
    `;
    return rows.map(toFarm);
  });
}

export async function getFarm(userId: string, farmId: string): Promise<Farm | null> {
  return withUser(userId, async (db) => {
    const rows = await db`select * from public.farms where id = ${farmId}`;
    return rows[0] ? toFarm(rows[0]) : null;
  });
}

export type FarmGeo = {
  farmId: string;
  name: string;
  /** GeoJSON geometry string (Polygon) or null when no boundary captured yet. */
  boundaryGeoJson: string | null;
  areaM2: string | null;
  centroidLat: number | null;
  centroidLng: number | null;
};

export async function listFarmGeo(userId: string, organizationId: string): Promise<FarmGeo[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select f.id, f.name, f.area_m2,
             ST_AsGeoJSON(f.boundary) as boundary_geojson,
             ST_Y(ST_Centroid(f.boundary)::geometry) as lat,
             ST_X(ST_Centroid(f.boundary)::geometry) as lng
      from public.farms f
      where f.organization_id = ${organizationId} and f.status = 'active'
      order by f.created_at asc
    `;
    return rows.map((r) => ({
      farmId: r.id as string,
      name: r.name as string,
      boundaryGeoJson: (r.boundary_geojson as string | null) ?? null,
      areaM2: (r.area_m2 as string | null) ?? null,
      centroidLat: (r.lat as number | null) ?? null,
      centroidLng: (r.lng as number | null) ?? null,
    }));
  });
}

export async function countFarms(userId: string, organizationId: string): Promise<number> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select count(*)::int as n from public.farms
      where organization_id = ${organizationId} and status = 'active'
    `;
    return rows[0].n as number;
  });
}
