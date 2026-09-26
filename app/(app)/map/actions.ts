"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { updateFarmBoundary } from "@/services/farmService";
import { openRing } from "@/features/map/geometry";

export async function saveFarmBoundaryAction(input: {
  farmId: string;
  ring: [number, number][];
}) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in to save this boundary." };

  const memberships = await listMemberships(user.id);
  const role = memberships[0]?.role;
  if (!role) return { error: "Join an organization before editing farm boundaries." };
  if (!["owner", "admin", "manager"].includes(role)) {
    return { error: "You need the owner, admin, or manager role to edit farm boundaries." };
  }

  if (!input || typeof input.farmId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.farmId)) {
    return { error: "Invalid farm selected." };
  }
  if (!Array.isArray(input.ring) || input.ring.length < 3 || input.ring.length > 5000) {
    return { error: "A farm boundary must have between 3 and 5,000 points." };
  }
  if (input.ring.some((point) =>
    !Array.isArray(point) || point.length !== 2 ||
    !Number.isFinite(point[0]) || !Number.isFinite(point[1]) ||
    Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180,
  )) {
    return { error: "Boundary coordinates are invalid." };
  }

  const ring = openRing(input.ring);
  if (ring.length < 3) return { error: "A farm boundary needs at least three distinct points." };
  const [firstLat, firstLng] = ring[0];
  const closedRing = [...ring, [firstLat, firstLng] as [number, number]];
  const boundaryGeoJson = JSON.stringify({
    type: "Polygon",
    coordinates: [closedRing.map(([lat, lng]) => [lng, lat])],
  });

  try {
    await updateFarmBoundary(user.id, memberships[0].organization.id, input.farmId, boundaryGeoJson);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BOUNDARY_INVALID:")) {
      return { error: "This fence crosses itself. Undo the last point move, or cancel editing to restore the saved boundary, then try again." };
    }
    if (error instanceof Error && error.message === "BOUNDARY_NOT_ALLOWED") {
      return { error: "You do not have permission to update this farm." };
    }
    return { error: "Could not save the farm boundary. Please try again." };
  }

  revalidatePath("/map");
  revalidatePath("/farms");
  revalidatePath("/dashboard");
  revalidatePath("/weather");
  return { success: true };
}
