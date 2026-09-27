import { z } from "zod";

export const createSeasonSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  startDate: z.string().date(),
  endDate: z.string().date(),
});
export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;

export const createCropSeasonSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  plotId: z.string().uuid().optional(),
  seasonId: z.string().uuid(),
  cropId: z.string().uuid(),
  varietyId: z.string().uuid().optional(),
  name: z.string().trim().max(160).optional(),
  areaM2: z.number().positive().optional(),
  plantingDate: z.string().date().optional(),
  expectedHarvestDate: z.string().date().optional(),
  targetYieldKg: z.number().positive().max(1000000).optional(), // Max 1000 tons per season
  seedQuantity: z.number().positive().max(10000).optional(), // Max 10 tons seed
  seedUnit: z.string().optional(),
  seedCost: z.number().nonnegative().max(1000000).optional(), // Max 1M currency units
}).refine((data) => {
  // Agricultural validation: harvest date must be after planting date
  if (data.plantingDate && data.expectedHarvestDate) {
    const planting = new Date(data.plantingDate);
    const harvest = new Date(data.expectedHarvestDate);
    const daysDiff = (harvest.getTime() - planting.getTime()) / (1000 * 60 * 60 * 24);

    // Most crops need at least 30 days, max 365 days
    if (daysDiff < 30 || daysDiff > 365) {
      return false;
    }
  }
  return true;
}, {
  message: "Harvest date must be 30-365 days after planting date",
}).refine((data) => {
  // Agricultural validation: realistic yield per hectare
  if (data.areaM2 && data.targetYieldKg) {
    const areaHa = data.areaM2 / 10000;
    const yieldPerHa = data.targetYieldKg / areaHa;

    // Typical yield ranges: 1-20 tons/hectare for most crops
    if (yieldPerHa < 1000 || yieldPerHa > 20000) {
      return false;
    }
  }
  return true;
}, {
  message: "Target yield must be 1-20 tons per hectare",
}).refine((data) => {
  // Agricultural validation: realistic seed rate
  if (data.areaM2 && data.seedQuantity) {
    const areaHa = data.areaM2 / 10000;
    const seedRate = data.seedQuantity / areaHa; // kg per hectare

    // Typical seed rates: 1-200 kg per hectare
    if (seedRate < 1 || seedRate > 200) {
      return false;
    }
  }
  return true;
}, {
  message: "Seed quantity must be 1-200 kg per hectare",
});
export type CreateCropSeasonInput = z.infer<typeof createCropSeasonSchema>;

export const createCropActivitySchema = z.object({
  organizationId: z.string().uuid(),
  cropSeasonId: z.string().uuid(),
  activityType: z.enum([
    "land_preparation",
    "ploughing",
    "planting",
    "fertilization",
    "weeding",
    "spraying",
    "irrigation",
    "pest_control",
    "disease_observation",
    "pruning",
    "harvest",
    "other",
  ]),
  activityDate: z.string().date(),
  workerId: z.string().uuid().optional(),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  cost: z.number().nonnegative().optional(),
  notes: z.string().trim().max(2000).optional(),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
});
export type CreateCropActivityInput = z.infer<typeof createCropActivitySchema>;

export const createCropInputSchema = z.object({
  organizationId: z.string().uuid(),
  cropSeasonId: z.string().uuid(),
  activityId: z.string().uuid().optional(),
  inventoryItemId: z.string().uuid().optional(),
  inputName: z.string().trim().min(1).max(160),
  inputCategory: z.enum([
    "seed",
    "fertilizer",
    "pesticide",
    "herbicide",
    "fungicide",
    "fuel",
    "water",
    "other",
  ]),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitCost: z.number().nonnegative().optional(),
  applicationDate: z.string().date().optional(),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateCropInputInput = z.infer<typeof createCropInputSchema>;

export const createHarvestSchema = z.object({
  organizationId: z.string().uuid(),
  cropSeasonId: z.string().uuid(),
  harvestDate: z.string().date(),
  quantity: z.number().positive(),
  unit: z.string().min(1).default("kg"),
  qualityGrade: z.enum(["grade_a", "grade_b", "grade_c", "reject"]).optional(),
  moistureContent: z.number().min(0).max(100).optional(),
  storageLocationId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateHarvestInput = z.infer<typeof createHarvestSchema>;

export const createLivestockGroupSchema = z.object({
  organizationId: z.string().uuid(),
  speciesId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
});
export type CreateLivestockGroupInput = z.infer<typeof createLivestockGroupSchema>;

export const createLivestockBatchSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  groupId: z.string().uuid(),
  seasonId: z.string().uuid().optional(),
  batchCode: z.string().trim().min(1).max(60),
  startDate: z.string().date(),
  initialQuantity: z.number().int().positive().max(100000), // Max 100k animals
  unit: z.string().min(1).default("head"),
  avgStartWeightKg: z.number().positive().max(500).optional(), // Max 500kg per animal
  targetWeightKg: z.number().positive().max(1000).optional(), // Max 1 ton target weight
  sourceType: z.enum(["external_hatchery", "farm_incubator", "purchased_fertile_eggs", "farm_eggs", "farm_transfer", "other"]),
  sourceId: z.string().uuid().optional(),
  sourceDetails: z.string().trim().max(500).optional(),
  sourceCost: z.number().nonnegative().optional(),
  breed: z.string().trim().max(120).optional(),
  strain: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
}).refine((data) => {
  if (["external_hatchery", "farm_incubator"].includes(data.sourceType)) return Boolean(data.sourceId);
  return true;
}, { message: "Select the hatchery order or incubation batch for this origin", path: ["sourceId"] }).refine((data) => {
  if (["purchased_fertile_eggs", "farm_eggs", "farm_transfer", "other"].includes(data.sourceType)) return Boolean(data.sourceDetails?.trim());
  return true;
}, { message: "Describe this chick source", path: ["sourceDetails"] }).refine((data) => {
  if (["purchased_fertile_eggs", "farm_eggs", "farm_transfer", "other"].includes(data.sourceType)) return !data.sourceId;
  return true;
}, { message: "Enter origin details rather than selecting a hatchery or hatch record", path: ["sourceId"] }).refine((data) => {
  // Agricultural validation: realistic weight ranges by species
  if (data.avgStartWeightKg && data.targetWeightKg) {
    // Target weight should be at least 20% higher than start weight
    const growthRatio = data.targetWeightKg / data.avgStartWeightKg;
    if (growthRatio < 1.2 || growthRatio > 5) {
      return false;
    }
  }
  return true;
}, {
  message: "Target weight should be 1.2-5x the starting weight",
}).refine((data) => {
  // Agricultural validation: realistic starting weights
  if (data.avgStartWeightKg) {
    // Typical livestock weight ranges: 0.5kg (chicks) to 500kg (cattle)
    if (data.avgStartWeightKg < 0.5 || data.avgStartWeightKg > 500) {
      return false;
    }
  }
  return true;
}, {
  message: "Starting weight must be 0.5-500 kg",
});
export type CreateLivestockBatchInput = z.infer<typeof createLivestockBatchSchema>;

export const createLivestockEventSchema = z.object({
  organizationId: z.string().uuid(),
  batchId: z.string().uuid(),
  eventType: z.enum([
    "mortality",
    "movement_in",
    "movement_out",
    "vaccination",
    "treatment",
    "weighing",
    "feeding",
    "sale",
    "birth",
    "other",
  ]),
  eventDate: z.string().date(),
  quantity: z.number().int().nonnegative().default(0),
  unit: z.string().optional(),
  weightKg: z.number().positive().optional(),
  cost: z.number().nonnegative().optional(),
  productName: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
});
export type CreateLivestockEventInput = z.infer<typeof createLivestockEventSchema>;

export const createLivestockHealthSchema = z.object({
  organizationId: z.string().uuid(),
  batchId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  recordDate: z.string().date(),
  symptom: z.string().trim().max(500).optional(),
  diagnosis: z.string().trim().max(500).optional(),
  treatment: z.string().trim().max(1000).optional(),
  medication: z.string().trim().max(160).optional(),
  dosage: z.string().trim().max(160).optional(),
  withdrawalDays: z.number().int().nonnegative().optional(),
  vetName: z.string().trim().max(120).optional(),
  vetContact: z.string().trim().max(120).optional(),
  cost: z.number().nonnegative().optional(),
  followUpDate: z.string().date().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateLivestockHealthInput = z.infer<typeof createLivestockHealthSchema>;

export const createLivestockFeedSchema = z.object({
  organizationId: z.string().uuid(),
  batchId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  inventoryItemId: z.string().uuid().optional(),
  feedName: z.string().trim().min(1).max(160),
  feedType: z.enum([
    "starter",
    "grower",
    "finisher",
    "layer",
    "breeder",
    "concentrate",
    "roughage",
    "supplement",
    "other",
  ]).optional(),
  quantityKg: z.number().positive().max(1000000), // Max 1000 tons per feeding
  unitCost: z.number().nonnegative().max(100).optional(), // Max 100 per kg
  feedDate: z.string().date(),
  notes: z.string().trim().max(2000).optional(),
}).refine((data) => {
  // Agricultural validation: realistic daily feed rates and costs
  // Assuming this is daily feed - typical ranges per animal type
  if (data.quantityKg > 20 * 1000) { // Assuming max 20k animals * 20kg
    return false;
  }

  // Agricultural validation: realistic feed cost
  if (data.unitCost && data.quantityKg) {
    const totalCost = data.unitCost * data.quantityKg;
    // Max reasonable feed cost per batch feeding: 50k currency units
    if (totalCost > 50000) {
      return false;
    }
  }

  return true;
}, {
  message: "Feed quantity or cost exceeds realistic limits",
});
export type CreateLivestockFeedInput = z.infer<typeof createLivestockFeedSchema>;

export const createLivestockSaleSchema = z.object({
  organizationId: z.string().uuid(),
  batchId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  saleDate: z.string().date(),
  quantity: z.number().int().positive(),
  unit: z.string().min(1).default("head"),
  weightKg: z.number().positive().optional(),
  unitPrice: z.number().positive(),
  customerName: z.string().trim().max(120).optional(),
  customerContact: z.string().trim().max(120).optional(),
  paymentStatus: z.enum(["pending", "partial", "paid"]).default("pending"),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateLivestockSaleInput = z.infer<typeof createLivestockSaleSchema>;
