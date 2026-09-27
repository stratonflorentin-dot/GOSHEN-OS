"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { addIncubationCost, createHatcheryOrder, createIncubator, createIncubationBatch, recordIncubationEvent, recordIncubationOutcome } from "@/services/chickProductionService";

async function tenant() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  if (!memberships.length) redirect("/onboarding");
  return { userId: user.id, organizationId: memberships[0].organization.id };
}
function value(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function number(form: FormData, key: string, optional = false) {
  const raw = value(form, key);
  return raw === "" && optional ? undefined : Number(raw);
}
const documentUrlSchema = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "https:" || protocol === "http:";
}, "Document links must use HTTPS or HTTP");
function fail(message: string): never { redirect(`/livestock/chicks?error=${encodeURIComponent(message)}`); }
function done() { revalidatePath("/livestock/chicks"); revalidatePath("/livestock"); redirect("/livestock/chicks?saved=1"); }

export async function createIncubatorAction(form: FormData) {
  const t = await tenant();
  const parsed = z.object({ farmId: z.string().uuid(), name: z.string().trim().min(1).max(120), capacity: z.number().int().positive().max(1000000), location: z.string().max(200).optional(), manufacturer: z.string().max(160).optional(), model: z.string().max(120).optional(), monitorsTemperature: z.boolean(), monitorsHumidity: z.boolean(), notes: z.string().max(2000).optional() }).safeParse({
    farmId: value(form,"farmId"), name: value(form,"name"), capacity: number(form,"capacity"), location: value(form,"location") || undefined, manufacturer: value(form,"manufacturer") || undefined, model: value(form,"model") || undefined, monitorsTemperature: form.get("monitorsTemperature") === "on", monitorsHumidity: form.get("monitorsHumidity") === "on", notes: value(form,"notes") || undefined,
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Check incubator details.");
  try { await createIncubator(t.userId, { ...t, ...parsed.data }); } catch (e) { fail(e instanceof Error ? e.message : "Could not create incubator."); }
  done();
}

export async function createHatcheryOrderAction(form: FormData) {
  const t = await tenant();
  const parsed = z.object({ farmId: z.string().uuid(), supplier: z.string().trim().min(1).max(160), orderNumber: z.string().max(120).optional(), reference: z.string().max(120).optional(), orderDate: z.string().date(), deliveryDate: z.string().date().optional(), breed: z.string().max(120).optional(), strain: z.string().max(120).optional(), ordered: z.number().int().positive(), delivered: z.number().int().nonnegative(), doa: z.number().int().nonnegative(), pricePerChick: z.number().nonnegative(), transportCost: z.number().nonnegative(), otherCost: z.number().nonnegative(), vaccinationInfo: z.string().max(1000).optional(), documentUrl: documentUrlSchema.optional(), notes: z.string().max(2000).optional() }).safeParse({
    farmId:value(form,"farmId"), supplier:value(form,"supplier"), orderNumber:value(form,"orderNumber")||undefined, reference:value(form,"reference")||undefined, orderDate:value(form,"orderDate"), deliveryDate:value(form,"deliveryDate")||undefined, breed:value(form,"breed")||undefined, strain:value(form,"strain")||undefined,
    ordered:number(form,"ordered"), delivered:number(form,"delivered"), doa:number(form,"doa"), pricePerChick:number(form,"pricePerChick"), transportCost:number(form,"transportCost") ?? 0, otherCost:number(form,"otherCost") ?? 0, vaccinationInfo:value(form,"vaccinationInfo")||undefined, documentUrl:value(form,"documentUrl")||undefined, notes:value(form,"notes")||undefined,
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Check hatchery delivery details.");
  if (parsed.data.delivered > parsed.data.ordered) fail("Delivered chicks cannot exceed the ordered quantity.");
  if (parsed.data.doa > parsed.data.delivered) fail("Dead-on-arrival count cannot exceed delivered chicks.");
  try { await createHatcheryOrder(t.userId, { ...t, ...parsed.data }); } catch (e) { fail(e instanceof Error ? e.message : "Could not save hatchery delivery."); }
  done();
}

export async function createIncubationBatchAction(form: FormData) {
  const t = await tenant();
  const parsed = z.object({ farmId:z.string().uuid(), incubatorId:z.string().uuid(), code:z.string().trim().min(1).max(60), startDate:z.string().date(), expectedDate:z.string().date().optional(), eggSource:z.enum(["farm_breeders","purchased_fertile_eggs","another_farm","other"]), eggSourceDetails:z.string().max(300).optional(), documentUrl:documentUrlSchema.optional(), breed:z.string().max(120).optional(), strain:z.string().max(120).optional(), eggsLoaded:z.number().int().positive(), eggCost:z.number().nonnegative(), notes:z.string().max(2000).optional() }).safeParse({
    farmId:value(form,"farmId"), incubatorId:value(form,"incubatorId"), code:value(form,"code"), startDate:value(form,"startDate"), expectedDate:value(form,"expectedDate")||undefined, eggSource:value(form,"eggSource"), eggSourceDetails:value(form,"eggSourceDetails")||undefined, documentUrl:value(form,"documentUrl")||undefined, breed:value(form,"breed")||undefined, strain:value(form,"strain")||undefined, eggsLoaded:number(form,"eggsLoaded"), eggCost:number(form,"eggCost") ?? 0, notes:value(form,"notes")||undefined,
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Check incubation batch details.");
  if (["purchased_fertile_eggs","another_farm","other"].includes(parsed.data.eggSource) && !parsed.data.eggSourceDetails?.trim()) fail("Add supplier or source details for these eggs.");
  try { await createIncubationBatch(t.userId, { ...t, ...parsed.data }); } catch (e) { fail(e instanceof Error ? e.message : "Could not start incubation batch."); }
  done();
}

export async function recordIncubationOutcomeAction(form: FormData) {
  const t = await tenant();
  const parsed = z.object({ batchId:z.string().uuid(), hatchDate:z.string().date(), fertile:z.number().int().nonnegative(), infertile:z.number().int().nonnegative(), cracked:z.number().int().nonnegative(), embryonicLosses:z.number().int().nonnegative(), hatched:z.number().int().nonnegative(), weak:z.number().int().nonnegative(), dead:z.number().int().nonnegative(), healthy:z.number().int().nonnegative(), notes:z.string().max(1000).optional() }).safeParse({
    batchId:value(form,"batchId"), hatchDate:value(form,"hatchDate"), fertile:number(form,"fertile"), infertile:number(form,"infertile"), cracked:number(form,"cracked"), embryonicLosses:number(form,"embryonicLosses"), hatched:number(form,"hatched"), weak:number(form,"weak"), dead:number(form,"dead"), healthy:number(form,"healthy"), notes:value(form,"notes")||undefined,
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Check the hatch outcome.");
  try { await recordIncubationOutcome(t.userId, { ...t, ...parsed.data }); } catch (e) { fail(e instanceof Error ? e.message : "Could not save hatch outcome."); }
  done();
}

export async function addIncubationCostAction(form: FormData) {
  const t = await tenant();
  const parsed = z.object({ batchId:z.string().uuid(), category:z.enum(["electricity","fuel","labor","incubator_operation","cleaning","transport","other"]), amount:z.number().nonnegative(), date:z.string().date(), notes:z.string().max(500).optional() }).safeParse({
    batchId:value(form,"batchId"), category:value(form,"category"), amount:number(form,"amount"), date:value(form,"date"), notes:value(form,"notes")||undefined,
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Check the incubation cost.");
  try { await addIncubationCost(t.userId, { ...t, ...parsed.data }); } catch (e) { fail(e instanceof Error ? e.message : "Could not save incubation cost."); }
  done();
}

export async function recordIncubationEventAction(form: FormData) {
  const t = await tenant();
  const rawAt = value(form,"eventAt");
  const parsed = z.object({ batchId:z.string().uuid(), eventType:z.enum(["candling","turning","temperature_check","humidity_check","losses_recorded","other"]), temperature:z.number().min(-20).max(100).optional(), humidity:z.number().min(0).max(100).optional(), quantity:z.number().int().nonnegative().optional(), notes:z.string().max(1000).optional() }).safeParse({
    batchId:value(form,"batchId"), eventType:value(form,"eventType"), temperature:number(form,"temperature",true), humidity:number(form,"humidity",true), quantity:number(form,"quantity",true), notes:value(form,"notes")||undefined,
  });
  if (!parsed.success || !rawAt) fail(parsed.success ? "Enter the observation date and time." : parsed.error.issues[0]?.message ?? "Check the incubation observation.");
  const eventAt = new Date(rawAt);
  if (Number.isNaN(eventAt.getTime())) fail("Enter a valid observation date and time.");
  try { await recordIncubationEvent(t.userId, { ...t, ...parsed.data, eventAt: eventAt.toISOString() }); } catch (e) { fail(e instanceof Error ? e.message : "Could not save incubation observation."); }
  done();
}
