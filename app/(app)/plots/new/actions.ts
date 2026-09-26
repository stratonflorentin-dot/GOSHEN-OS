"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { createPlot, updatePlotBoundary } from "@/services/plotService";
import { createPlotSchema, updatePlotBoundarySchema } from "@/lib/validation/plots";

/** [[lat, lng], ...] -> closed [lng, lat] GeoJSON ring for ST_GeomFromGeoJSON. */
function ringToGeoJson(ring: [number, number][]): string {
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

export type CreatePlotResult = { error: string } | { ok: true; plotId: string };

export async function createPlotAction(input: {
  farmId: string;
  name: string;
  code: string;
  plotType: string;
  landUse: string;
  irrigationType?: string;
  soilTexture?: string;
  notes?: string;
  boundary?: [number, number][];
  boundarySource?: string;
}): Promise<CreatePlotResult> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  const hasBoundary = (input.boundary?.length ?? 0) >= 4;
  const parsed = createPlotSchema.safeParse({
    organizationId: memberships[0].organization.id,
    farmId: input.farmId,
    name: input.name,
    code: input.code,
    plotType: input.plotType,
    boundaryGeoJson: hasBoundary ? ringToGeoJson(input.boundary!) : undefined,
    boundarySource: hasBoundary ? (input.boundarySource ?? "gps_walk") : undefined,
    rawGpsPoints: hasBoundary ? JSON.stringify(input.boundary) : undefined,
    landUse: input.landUse,
    irrigationType: input.irrigationType || undefined,
    soilTexture: input.soilTexture || undefined,
    notes: input.notes || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid plot details" };
  }

  const plot = await createPlot(user.id, parsed.data);
  revalidatePath("/plots");
  revalidatePath("/map");
  return { ok: true, plotId: plot.id };
}

export async function updatePlotBoundaryAction(input: {
  plotId: string;
  boundary: [number, number][];
  boundarySource?: string;
}): Promise<{ error: string } | { ok: true }> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (input.boundary.length < 4) return { error: "A boundary needs at least 4 points." };

  const parsed = updatePlotBoundarySchema.safeParse({
    plotId: input.plotId,
    boundaryGeoJson: ringToGeoJson(input.boundary),
    boundarySource: input.boundarySource ?? "gps_walk",
    rawGpsPoints: JSON.stringify(input.boundary),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid boundary" };

  await updatePlotBoundary(user.id, parsed.data);
  revalidatePath(`/plots/${input.plotId}`);
  revalidatePath("/plots");
  revalidatePath("/map");
  return { ok: true };
}
