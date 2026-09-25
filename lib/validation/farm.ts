import { z } from "zod";

/** GPS-walked boundary: [[lat, lng], ...] — at least 4 points to close a ring. */
export const boundarySchema = z
  .array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]))
  .min(4)
  .max(5000);

export const createFarmSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  farmType: z.enum(["crop", "livestock", "mixed", "aquaculture", "agroforestry"]).default("mixed"),
  ownershipType: z.enum(["owned", "leased", "customary", "shared", "managed"]).optional(),
  country: z.string().length(2).default("TZ"),
  region: z.string().trim().max(120).optional().or(z.literal("")),
  district: z.string().trim().max(120).optional().or(z.literal("")),
  ward: z.string().trim().max(120).optional().or(z.literal("")),
  village: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  boundary: boundarySchema.optional(),
});
export type CreateFarmInput = z.infer<typeof createFarmSchema>;
