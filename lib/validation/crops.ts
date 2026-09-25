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
  targetYieldKg: z.number().positive().optional(),
  seedQuantity: z.number().positive().optional(),
  seedUnit: z.string().optional(),
  seedCost: z.number().nonnegative().optional(),
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
  batchCode: z.string().trim().min(1).max(60),
  startDate: z.string().date(),
  initialQuantity: z.number().int().positive(),
  unit: z.string().min(1).default("head"),
  avgStartWeightKg: z.number().positive().optional(),
  targetWeightKg: z.number().positive().optional(),
  notes: z.string().trim().max(2000).optional(),
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
  quantityKg: z.number().positive(),
  unitCost: z.number().nonnegative().optional(),
  feedDate: z.string().date(),
  notes: z.string().trim().max(2000).optional(),
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