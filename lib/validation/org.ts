import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  country: z.string().length(2).default("TZ"),
  currency: z.string().length(3).default("TZS"),
  timezone: z.string().default("Africa/Dar_es_Salaam"),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
