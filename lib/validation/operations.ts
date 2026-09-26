import { z } from "zod";

const optionalText = (max = 2000) => z.string().trim().max(max).optional();
const optionalNumber = z.number().finite().optional();

// ---------------------------------------------------------------------------
// §22 Labor
// ---------------------------------------------------------------------------
export const WORKER_TYPES = ["employee", "casual", "contractor", "family", "volunteer"] as const;
export const RATE_TYPES = ["hourly", "daily", "piece", "monthly"] as const;

export const createWorkerSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid().optional(),
  fullName: z.string().trim().min(1).max(160),
  code: z.string().trim().max(40).regex(/^[A-Za-z0-9_-]*$/).optional(),
  workerType: z.enum(WORKER_TYPES).default("casual"),
  phone: optionalText(40),
  email: optionalText(160),
  nationalId: optionalText(60),
  gender: z.enum(["male", "female", "other", "undisclosed"]).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  address: optionalText(300),
  village: optionalText(120),
  roleTitle: optionalText(120),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  defaultRateType: z.enum(RATE_TYPES).default("daily"),
  defaultRate: optionalNumber,
  paymentMethod: z.enum(["cash", "mobile_money", "bank_transfer", "cheque", "other"]).optional(),
  mobileMoneyNumber: optionalText(40),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: optionalText(),
});
export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;

export const createLaborRecordSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  plotId: z.string().uuid().optional(),
  cropSeasonId: z.string().uuid().optional(),
  livestockBatchId: z.string().uuid().optional(),
  cropActivityId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  workerId: z.string().uuid(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  taskDescription: z.string().trim().min(1).max(400),
  rateType: z.enum(RATE_TYPES).default("daily"),
  hoursWorked: optionalNumber,
  daysWorked: optionalNumber,
  quantity: optionalNumber,
  unit: optionalText(20),
  rate: z.number().nonnegative(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).default("unpaid"),
  amountPaid: z.number().nonnegative().default(0),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
  notes: optionalText(),
});
export type CreateLaborRecordInput = z.infer<typeof createLaborRecordSchema>;

// ---------------------------------------------------------------------------
// §23 Equipment
// ---------------------------------------------------------------------------
export const EQUIPMENT_CATEGORIES = [
  "tractor", "vehicle", "truck", "pump", "generator", "sprayer", "plough", "harrow",
  "planter", "harvester", "thresher", "trailer", "irrigation_kit", "implement",
  "processing_machine", "tool", "other",
] as const;

export const createEquipmentSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  category: z.enum(EQUIPMENT_CATEGORIES).default("other"),
  make: optionalText(80),
  model: optionalText(80),
  serialNumber: optionalText(80),
  yearManufactured: z.number().int().min(1900).max(2200).optional(),
  ownershipType: z.enum(["owned", "leased", "rented", "shared"]).default("owned"),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  purchaseCost: optionalNumber,
  currentValue: optionalNumber,
  fuelType: z.enum(["diesel", "petrol", "electric", "solar", "manual", "none"]).optional(),
  fuelCapacity: optionalNumber,
  meterType: z.enum(["hours", "kilometers", "none"]).default("hours"),
  currentMeter: z.number().nonnegative().default(0),
  capacityNote: optionalText(160),
  status: z.enum(["operational", "maintenance", "breakdown", "idle", "retired", "sold"]).default("operational"),
  notes: optionalText(),
});
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;

export const createEquipmentUsageSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  equipmentId: z.string().uuid(),
  plotId: z.string().uuid().optional(),
  cropSeasonId: z.string().uuid().optional(),
  livestockBatchId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  operatorWorkerId: z.string().uuid().optional(),
  usageDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMeter: optionalNumber,
  endMeter: optionalNumber,
  hoursUsed: optionalNumber,
  distanceKm: optionalNumber,
  fuelConsumed: optionalNumber,
  fuelUnit: optionalText(20),
  fuelCost: z.number().nonnegative().default(0),
  operatorCost: z.number().nonnegative().default(0),
  otherCost: z.number().nonnegative().default(0),
  notes: optionalText(),
});
export type CreateEquipmentUsageInput = z.infer<typeof createEquipmentUsageSchema>;

export const createMaintenanceSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid().optional(),
  equipmentId: z.string().uuid(),
  maintenanceType: z.enum([
    "scheduled", "repair", "inspection", "tyre", "oil_change", "overhaul", "calibration", "other",
  ]).default("scheduled"),
  maintenanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(1).max(600),
  performedBy: optionalText(160),
  vendorName: optionalText(160),
  meterReading: optionalNumber,
  partsCost: z.number().nonnegative().default(0),
  laborCost: z.number().nonnegative().default(0),
  otherCost: z.number().nonnegative().default(0),
  downtimeHours: optionalNumber,
  nextServiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nextServiceMeter: optionalNumber,
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("completed"),
  notes: optionalText(),
});
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;

// ---------------------------------------------------------------------------
// §24 Irrigation
// ---------------------------------------------------------------------------
export const WATER_SOURCE_TYPES = [
  "borehole", "well", "spring", "river", "stream", "dam", "reservoir", "lake", "pond",
  "canal", "municipal", "rainwater_harvest", "tank", "other",
] as const;

export const createWaterSourceSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  sourceType: z.enum(WATER_SOURCE_TYPES),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
  depthM: optionalNumber,
  capacityM3: optionalNumber,
  yieldLpm: optionalNumber,
  pumpEquipmentId: z.string().uuid().optional(),
  waterQuality: z.enum(["good", "acceptable", "saline", "brackish", "unknown"]).optional(),
  reliability: z.enum(["reliable", "seasonal", "intermittent", "unknown"]).optional(),
  permitNumber: optionalText(80),
  notes: optionalText(),
});
export type CreateWaterSourceInput = z.infer<typeof createWaterSourceSchema>;

export const createIrrigationZoneSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  waterSourceId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  irrigationType: z.enum([
    "drip", "sprinkler", "furrow", "flood", "pivot", "manual", "hose", "other",
  ]).default("drip"),
  emitterRateLph: optionalNumber,
  designFlowM3h: optionalNumber,
  status: z.enum(["active", "inactive", "maintenance"]).default("active"),
  notes: optionalText(),
});
export type CreateIrrigationZoneInput = z.infer<typeof createIrrigationZoneSchema>;

export const createIrrigationRecordSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  plotId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  waterSourceId: z.string().uuid().optional(),
  cropSeasonId: z.string().uuid().optional(),
  equipmentId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  irrigationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMinutes: z.number().int().nonnegative().optional(),
  waterVolumeM3: optionalNumber,
  method: z.enum([
    "drip", "sprinkler", "furrow", "flood", "pivot", "manual", "hose", "other",
  ]).default("drip"),
  energySource: z.enum(["gravity", "diesel", "petrol", "electric", "solar", "manual", "none"]).optional(),
  fuelConsumed: optionalNumber,
  energyCost: z.number().nonnegative().default(0),
  laborCost: z.number().nonnegative().default(0),
  otherCost: z.number().nonnegative().default(0),
  soilMoistureBeforePct: optionalNumber,
  soilMoistureAfterPct: optionalNumber,
  notes: optionalText(),
});
export type CreateIrrigationRecordInput = z.infer<typeof createIrrigationRecordSchema>;

// ---------------------------------------------------------------------------
// §25 Soil — every measurement optional; absence means "not measured"
// ---------------------------------------------------------------------------
export const createSoilRecordSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  plotId: z.string().uuid().optional(),
  sampleCode: optionalText(60),
  sampleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sampleDepthCm: optionalNumber,
  samplingMethod: optionalText(200),
  labName: optionalText(160),
  labReference: optionalText(80),
  ph: z.number().min(0).max(14).optional(),
  organicMatterPct: optionalNumber,
  organicCarbonPct: optionalNumber,
  totalNitrogenPct: optionalNumber,
  availablePhosphorusPpm: optionalNumber,
  exchangeablePotassiumPpm: optionalNumber,
  calciumPpm: optionalNumber,
  magnesiumPpm: optionalNumber,
  sulfurPpm: optionalNumber,
  cecMeq100g: optionalNumber,
  electricalConductivityDsM: optionalNumber,
  moisturePct: z.number().min(0).max(100).optional(),
  texture: z.enum([
    "sand", "loamy_sand", "sandy_loam", "loam", "silt_loam", "silt", "silt_clay",
    "clay_loam", "sandy_clay_loam", "silty_clay_loam", "sandy_clay", "silty_clay", "clay", "rock",
  ]).optional(),
  bulkDensityGCm3: optionalNumber,
  waterHoldingCapacityPct: optionalNumber,
  micronutrientsJson: optionalText(4000),
  interpretation: optionalText(4000),
  recommendations: optionalText(4000),
  notes: optionalText(),
});
export type CreateSoilRecordInput = z.infer<typeof createSoilRecordSchema>;

// ---------------------------------------------------------------------------
// §32 Tasks
// ---------------------------------------------------------------------------
export const TASK_TYPES = [
  "land_preparation", "planting", "fertilization", "weeding", "spraying", "irrigation",
  "pest_control", "pruning", "harvest", "post_harvest", "livestock_feeding",
  "livestock_health", "livestock_handling", "maintenance", "inspection",
  "construction", "admin", "purchase", "other",
] as const;

export const createTaskSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  plotId: z.string().uuid().optional(),
  cropSeasonId: z.string().uuid().optional(),
  livestockBatchId: z.string().uuid().optional(),
  equipmentId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  description: optionalText(4000),
  taskType: z.enum(TASK_TYPES).default("other"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignedWorkerId: z.string().uuid().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduledStart: optionalText(40),
  estimatedHours: optionalNumber,
  estimatedCost: optionalNumber,
  recurrenceRule: optionalText(120),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(["pending", "assigned", "in_progress", "blocked", "completed", "cancelled"]),
  completionNotes: optionalText(4000),
  actualHours: optionalNumber,
  actualCost: optionalNumber,
});
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

// ---------------------------------------------------------------------------
// §33 Documents
// ---------------------------------------------------------------------------
export const DOCUMENT_TYPES = [
  "invoice", "receipt", "soil_report", "veterinary_report", "purchase_document",
  "contract", "land_document", "certificate", "permit", "insurance",
  "photo", "map", "report", "other",
] as const;

export const createDocumentSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid().optional(),
  plotId: z.string().uuid().optional(),
  cropSeasonId: z.string().uuid().optional(),
  livestockBatchId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  documentType: z.enum(DOCUMENT_TYPES).default("other"),
  storageBucket: z.string().trim().min(1).max(60).default("documents"),
  storagePath: z.string().trim().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  mimeType: optionalText(120),
  fileSizeBytes: z.number().int().nonnegative().optional(),
  documentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  issuingAuthority: optionalText(160),
  referenceNumber: optionalText(80),
  visibility: z.enum(["organization", "farm", "private"]).default("organization"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  description: optionalText(2000),
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// ---------------------------------------------------------------------------
// §19 Production records
// ---------------------------------------------------------------------------
export const createProductionRecordSchema = z.object({
  organizationId: z.string().uuid(),
  farmId: z.string().uuid(),
  plotId: z.string().uuid().optional(),
  cropSeasonId: z.string().uuid().optional(),
  livestockBatchId: z.string().uuid().optional(),
  productionType: z.enum([
    "crop_harvest", "milk", "eggs", "wool", "honey", "fish", "manure", "hides", "other",
  ]).default("other"),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  productName: z.string().trim().min(1).max(160),
  quantity: z.number().nonnegative(),
  unit: z.string().trim().min(1).max(20).default("kg"),
  qualityGrade: optionalText(40),
  unitPrice: optionalNumber,
  destination: z.enum([
    "storage", "sale", "home_consumption", "seed", "animal_feed", "processing", "loss", "other",
  ]).default("storage"),
  storageLocationId: z.string().uuid().optional(),
  inventoryItemId: z.string().uuid().optional(),
  notes: optionalText(),
});
export type CreateProductionRecordInput = z.infer<typeof createProductionRecordSchema>;
