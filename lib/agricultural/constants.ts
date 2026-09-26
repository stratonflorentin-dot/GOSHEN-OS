/**
 * Agricultural Constants and Benchmarks
 * Real-world agricultural data for validation and analytics
 */

export const AGRICULTURAL_CONSTANTS = {
  // Crop yield ranges (kg per hectare) by crop type
  CROP_YIELDS: {
    maize: { min: 1500, max: 12000, typical: 4500 },
    wheat: { min: 2000, max: 8000, typical: 3500 },
    rice: { min: 3000, max: 10000, typical: 5500 },
    potatoes: { min: 10000, max: 45000, typical: 25000 },
    tomatoes: { min: 20000, max: 80000, typical: 45000 },
    soybeans: { min: 1000, max: 4000, typical: 2500 },
    cotton: { min: 500, max: 2000, typical: 1200 },
    coffee: { min: 300, max: 1500, typical: 800 },
  },

  // Growth cycles (days)
  GROWTH_CYCLES: {
    maize: { min: 90, max: 150, typical: 120 },
    wheat: { min: 100, max: 140, typical: 120 },
    rice: { min: 110, max: 160, typical: 130 },
    potatoes: { min: 90, max: 120, typical: 100 },
    tomatoes: { min: 60, max: 120, typical: 90 },
    soybeans: { min: 90, max: 130, typical: 110 },
  },

  // Seed rates (kg per hectare)
  SEED_RATES: {
    maize: { min: 15, max: 30, typical: 20 },
    wheat: { min: 100, max: 200, typical: 150 },
    rice: { min: 40, max: 80, typical: 60 },
    potatoes: { min: 1500, max: 2500, typical: 2000 },
    tomatoes: { min: 200, max: 400, typical: 300 },
    soybeans: { min: 40, max: 80, typical: 60 },
  },

  // Fertilizer rates (kg per hectare) by nutrient
  FERTILIZER_RATES: {
    nitrogen: { min: 50, max: 200, typical: 100 },
    phosphorus: { min: 20, max: 80, typical: 40 },
    potassium: { min: 30, max: 120, typical: 60 },
  },

  // Livestock FCR (Feed Conversion Ratio) - kg feed per kg weight gain
  LIVESTOCK_FCR: {
    broilers: { good: 1.6, average: 1.8, poor: 2.2 },
    layers: { good: 2.0, average: 2.2, poor: 2.5 },
    pigs: { good: 2.5, average: 2.8, poor: 3.2 },
    cattle: { good: 6.0, average: 7.0, poor: 8.5 },
    sheep: { good: 4.0, average: 5.0, poor: 6.0 },
  },

  // Livestock weight ranges (kg)
  LIVESTOCK_WEIGHTS: {
    broilers: { start: 0.04, target: 2.0, typical: 1.8 },
    layers: { start: 0.035, target: 1.8, typical: 1.6 },
    pigs: { start: 10, target: 120, typical: 100 },
    cattle: { start: 200, target: 600, typical: 500 },
    sheep: { start: 15, target: 80, typical: 60 },
  },

  // Livestock mortality rates (percentage)
  MORTALITY_RATES: {
    broilers: { excellent: 2, good: 3, average: 5, poor: 8 },
    layers: { excellent: 3, good: 5, average: 8, poor: 12 },
    pigs: { excellent: 2, good: 4, average: 6, poor: 10 },
    cattle: { excellent: 1, good: 2, average: 4, poor: 8 },
    sheep: { excellent: 2, good: 4, average: 6, poor: 10 },
  },

  // Irrigation requirements (mm per growing season)
  IRRIGATION_REQUIREMENTS: {
    maize: { min: 400, max: 800, typical: 600 },
    wheat: { min: 300, max: 600, typical: 450 },
    rice: { min: 800, max: 1500, typical: 1200 },
    potatoes: { min: 300, max: 600, typical: 450 },
    tomatoes: { min: 400, max: 800, typical: 600 },
    soybeans: { min: 300, max: 600, typical: 450 },
  },

  // Soil pH ranges by crop
  SOIL_PH_RANGES: {
    maize: { min: 5.5, max: 7.5, optimal: 6.5 },
    wheat: { min: 6.0, max: 7.5, optimal: 6.8 },
    rice: { min: 5.0, max: 6.5, optimal: 5.8 },
    potatoes: { min: 5.0, max: 6.5, optimal: 5.8 },
    tomatoes: { min: 6.0, max: 7.0, optimal: 6.5 },
    soybeans: { min: 6.0, max: 7.5, optimal: 6.8 },
  },

  // Temperature ranges (°C) for optimal growth
  TEMPERATURE_RANGES: {
    maize: { min: 15, max: 35, optimal: 25 },
    wheat: { min: 10, max: 25, optimal: 18 },
    rice: { min: 20, max: 35, optimal: 28 },
    potatoes: { min: 10, max: 25, optimal: 18 },
    tomatoes: { min: 18, max: 30, optimal: 24 },
    soybeans: { min: 15, max: 30, optimal: 22 },
  },
};

export function getCropYieldBenchmark(cropType: string, yieldPerHa: number): {
  performance: "excellent" | "good" | "average" | "poor";
  percentage: number;
  benchmark: number;
} {
  const cropData = AGRICULTURAL_CONSTANTS.CROP_YIELDS[cropType as keyof typeof AGRICULTURAL_CONSTANTS.CROP_YIELDS];

  if (!cropData) {
    return { performance: "average", percentage: 100, benchmark: yieldPerHa };
  }

  const benchmark = cropData.typical;
  const percentage = (yieldPerHa / benchmark) * 100;

  let performance: "excellent" | "good" | "average" | "poor";
  if (percentage >= 120) performance = "excellent";
  else if (percentage >= 100) performance = "good";
  else if (percentage >= 80) performance = "average";
  else performance = "poor";

  return { performance, percentage, benchmark };
}

export function getFCRPerformance(livestockType: string, fcr: number): {
  performance: "excellent" | "good" | "average" | "poor";
  percentage: number;
  benchmark: number;
} {
  const fcrData = AGRICULTURAL_CONSTANTS.LIVESTOCK_FCR[livestockType as keyof typeof AGRICULTURAL_CONSTANTS.LIVESTOCK_FCR];

  if (!fcrData) {
    return { performance: "average", percentage: 100, benchmark: fcr };
  }

  const benchmark = fcrData.average;
  const percentage = (benchmark / fcr) * 100; // Lower FCR is better

  let performance: "excellent" | "good" | "average" | "poor";
  if (fcr <= fcrData.good) performance = "excellent";
  else if (fcr <= fcrData.average) performance = "good";
  else if (fcr <= fcrData.poor) performance = "average";
  else performance = "poor";

  return { performance, percentage, benchmark };
}

export function getMortalityPerformance(livestockType: string, mortalityRate: number): {
  performance: "excellent" | "good" | "average" | "poor";
  percentage: number;
  benchmark: number;
} {
  const mortalityData = AGRICULTURAL_CONSTANTS.MORTALITY_RATES[livestockType as keyof typeof AGRICULTURAL_CONSTANTS.MORTALITY_RATES];

  if (!mortalityData) {
    return { performance: "average", percentage: 100, benchmark: mortalityRate };
  }

  const benchmark = mortalityData.average;
  const percentage = (benchmark / mortalityRate) * 100; // Lower mortality is better

  let performance: "excellent" | "good" | "average" | "poor";
  if (mortalityRate <= mortalityData.excellent) performance = "excellent";
  else if (mortalityRate <= mortalityData.good) performance = "good";
  else if (mortalityRate <= mortalityData.average) performance = "average";
  else performance = "poor";

  return { performance, percentage, benchmark };
}