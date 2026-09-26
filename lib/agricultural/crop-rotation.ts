/**
 * Crop Rotation Planning System
 * Optimizes crop rotation based on soil health, pest management, and yield maximization
 */

import { AGRICULTURAL_CONSTANTS } from "./constants";

export interface CropPlan {
  cropType: string;
  variety?: string;
  areaHa: number;
  plantingDate: string;
  expectedHarvestDate: string;
  expectedYield: number;
  soilType: string;
  previousCrop?: string;
}

export interface RotationRecommendation {
  sequence: string[];
  benefits: string[];
  considerations: string[];
  pestBreak: boolean;
  soilHealth: "improves" | "maintains" | "depletes";
  nutrientBalance: string;
}

export class CropRotationPlanner {
  /**
   * Recommended crop rotation sequences by category
   */
  private rotationSequences = {
    cereal: {
      goodFollowers: ["legume", "vegetable"],
      badFollowers: ["cereal"],
      rotationCycle: 3, // years
    },
    legume: {
      goodFollowers: ["cereal", "vegetable"],
      badFollowers: ["legume"],
      rotationCycle: 2, // years
    },
    vegetable: {
      goodFollowers: ["cereal", "legume"],
      badFollowers: ["vegetable"],
      rotationCycle: 1, // years
    },
    cash_crop: {
      goodFollowers: ["legume", "cereal"],
      badFollowers: ["cash_crop"],
      rotationCycle: 4, // years
    },
  };

  /**
   * Get recommended rotation for a specific crop
   */
  getRotationRecommendation(cropType: string, soilType: string, previousCrop?: string): RotationRecommendation {
    const cropCategory = this.getCropCategory(cropType);
    const rotationData = this.rotationSequences[cropCategory as keyof typeof this.rotationSequences];

    if (!rotationData) {
      return this.getDefaultRotation(cropType);
    }

    const sequence = this.buildRotationSequence(cropCategory, previousCrop);
    const benefits = this.getRotationBenefits(cropCategory, previousCrop);
    const considerations = this.getRotationConsiderations(cropCategory, soilType);

    return {
      sequence,
      benefits,
      considerations,
      pestBreak: sequence.length > 1,
      soilHealth: this.assessSoilHealthImpact(cropCategory, previousCrop),
      nutrientBalance: this.getNutrientBalance(cropCategory, previousCrop),
    };
  }

  /**
   * Build optimal rotation sequence
   */
  private buildRotationSequence(currentCategory: string, previousCrop?: string): string[] {
    const sequences: string[][] = [];

    // Cereal-based rotation
    if (currentCategory === "cereal") {
      sequences.push(["maize", "soybeans", "wheat", "beans"]);
      sequences.push(["maize", "groundnuts", "sorghum", "cowpeas"]);
    }

    // Legume-based rotation
    if (currentCategory === "legume") {
      sequences.push(["soybeans", "maize", "beans", "wheat"]);
      sequences.push(["groundnuts", "maize", "cowpeas", "sorghum"]);
    }

    // Vegetable-based rotation
    if (currentCategory === "vegetable") {
      sequences.push(["tomatoes", "maize", "cabbage", "beans"]);
      sequences.push(["potatoes", "maize", "onions", "soybeans"]);
    }

    // Cash crop rotation
    if (currentCategory === "cash_crop") {
      sequences.push(["cotton", "sorghum", "groundnuts", "maize"]);
      sequences.push(["coffee", "beans", "maize", "soybeans"]);
    }

    // Return first sequence or default
    return sequences[0] || [currentCategory];
  }

  /**
   * Get rotation benefits
   */
  private getRotationBenefits(category: string, previousCrop?: string): string[] {
    const benefits: string[] = [];

    if (category === "legume") {
      benefits.push("Nitrogen fixation improves soil fertility");
      benefits.push("Breaks pest and disease cycles from cereals");
      benefits.push("Reduces need for nitrogen fertilizer");
    }

    if (category === "cereal" && previousCrop && this.getCropCategory(previousCrop) === "legume") {
      benefits.push("Utilizes nitrogen fixed by previous legume crop");
      benefits.push("Good for weed control due to dense canopy");
    }

    if (category === "vegetable") {
      benefits.push("High economic value per hectare");
      benefits.push("Diversifies farm income sources");
    }

    benefits.push("Reduces soil-borne pest and disease pressure");
    benefits.push("Improves soil structure through different root systems");
    benefits.push("Optimizes nutrient use efficiency");

    return benefits;
  }

  /**
   * Get rotation considerations
   */
  private getRotationConsiderations(category: string, soilType: string): string[] {
    const considerations: string[] = [];

    if (category === "cereal") {
      considerations.push("High nitrogen demand - may require fertilization");
      considerations.push("Monitor for cereal-specific pests");
    }

    if (category === "legume") {
      considerations.push("Ensure proper inoculation for nitrogen fixation");
      considerations.push("Avoid acidic soils (pH < 5.5)");
    }

    if (category === "vegetable") {
      considerations.push("High input costs (seeds, pesticides, irrigation)");
      considerations.push("Requires more intensive management");
      considerations.push("Market timing is critical for profitability");
    }

    if (soilType === "sandy") {
      considerations.push("Sandy soils require more frequent irrigation");
      considerations.push("Consider organic matter additions");
    }

    if (soilType === "clay") {
      considerations.push("Clay soils may need drainage improvements");
      considerations.push("Avoid compaction during wet conditions");
    }

    return considerations;
  }

  /**
   * Assess soil health impact
   */
  private assessSoilHealthImpact(category: string, previousCrop?: string): "improves" | "maintains" | "depletes" {
    if (category === "legume") return "improves";
    if (category === "cereal" && previousCrop && this.getCropCategory(previousCrop) === "legume") return "maintains";
    if (category === "vegetable") return "maintains";
    return "depletes";
  }

  /**
   * Get nutrient balance assessment
   */
  private getNutrientBalance(category: string, previousCrop?: string): string {
    if (category === "legume") {
      return "Nitrogen fixer - adds 20-40kg N/ha";
    }

    if (category === "cereal") {
      if (previousCrop && this.getCropCategory(previousCrop) === "legume") {
        return "Balanced - utilizes previous legume nitrogen";
      }
      return "Nitrogen depleter - requires 80-120kg N/ha";
    }

    if (category === "vegetable") {
      return "High nutrient demand - requires balanced NPK fertilization";
    }

    return "Moderate nutrient demand";
  }

  /**
   * Get crop category
   */
  private getCropCategory(cropType: string): string {
    const categories: Record<string, string> = {
      maize: "cereal",
      wheat: "cereal",
      rice: "cereal",
      sorghum: "cereal",
      millet: "cereal",
      soybeans: "legume",
      beans: "legume",
      groundnuts: "legume",
      cowpeas: "legume",
      tomatoes: "vegetable",
      potatoes: "vegetable",
      onions: "vegetable",
      carrots: "vegetable",
      cabbage: "vegetable",
      peppers: "vegetable",
      cotton: "cash_crop",
      coffee: "cash_crop",
      tea: "cash_crop",
      sugarcane: "cash_crop",
      tobacco: "cash_crop",
    };

    return categories[cropType] || "vegetable";
  }

  /**
   * Default rotation for unknown crops
   */
  private getDefaultRotation(cropType: string): RotationRecommendation {
    return {
      sequence: [cropType, "legume", "cereal"],
      benefits: ["Diversified rotation reduces pest pressure", "Soil health maintenance"],
      considerations: ["Crop-specific requirements may vary", "Monitor soil health regularly"],
      pestBreak: true,
      soilHealth: "maintains",
      nutrientBalance: "Balanced through rotation",
    };
  }

  /**
   * Generate multi-year rotation plan
   */
  generateRotationPlan(
    startingCrop: string,
    areaHa: number,
    years: number = 4
  ): {
    year: number;
    crop: string;
    expectedYield: number;
    notes: string[];
  }[] {
    const plan: { year: number; crop: string; expectedYield: number; notes: string[] }[] = [];
    const rotation = this.getRotationRecommendation(startingCrop, "loam");

    for (let year = 1; year <= years; year++) {
      const cropIndex = (year - 1) % rotation.sequence.length;
      const crop = rotation.sequence[cropIndex];
      const cropData = AGRICULTURAL_CONSTANTS.CROP_YIELDS[crop as keyof typeof AGRICULTURAL_CONSTANTS.CROP_YIELDS];

      plan.push({
        year,
        crop,
        expectedYield: cropData ? cropData.typical * areaHa : 0,
        notes: year === 1 ? ["Starting crop in rotation"] : ["Following recommended rotation"],
      });
    }

    return plan;
  }

  /**
   * Intercropping recommendations
   */
  getIntercroppingRecommendations(mainCrop: string): {
    compatible: string[];
    benefits: string[];
    spacing: string;
    management: string[];
  } {
    const intercropData: Record<string, { compatible: string[]; benefits: string[]; spacing: string; management: string[] }> = {
      maize: {
        compatible: ["beans", "cowpeas", "groundnuts", "pumpkins"],
        benefits: [
          "Legumes fix nitrogen for maize",
          "Improved soil coverage reduces erosion",
          "Diversified income sources",
          "Reduced pest pressure through diversity"
        ],
        spacing: "Alternate rows or strip intercropping",
        management: [
          "Plant legumes 2-3 weeks after maize",
          "Monitor competition for light and nutrients",
          "Adjust fertilizer rates for mixed cropping"
        ]
      },
      cassava: {
        compatible: ["beans", "groundnuts", "maize", "vegetables"],
        benefits: [
          "Cassava provides shade for young plants",
          "Ground cover reduces soil erosion",
          "Maximizes land use efficiency"
        ],
        spacing: "Relay intercropping after cassava establishment",
        management: [
          "Time planting to avoid excessive competition",
          "Manage canopy development carefully"
        ]
      },
      coffee: {
        compatible: ["bananas", "shade trees", "beans"],
        benefits: [
          "Shade crops improve coffee quality",
          "Additional income from shade crops",
          "Improved microclimate"
        ],
        spacing: "Permanent shade trees with seasonal intercropping",
        management: [
          "Select compatible shade tree species",
          "Manage shade levels for optimal coffee production"
        ]
      }
    };

    return intercropData[mainCrop] || {
      compatible: ["legumes"],
      benefits: ["Nitrogen fixation", "Soil improvement"],
      spacing: "Row intercropping",
      management: ["Monitor competition", "Adjust planting dates"]
    };
  }

  /**
   * Cover crop recommendations
   */
  getCoverCropRecommendations(season: "wet" | "dry", soilType: string): {
    crops: string[];
    benefits: string[];
    planting: string;
    termination: string;
  } {
    const coverCrops: Record<string, { crops: string[]; benefits: string[]; planting: string; termination: string }> = {
      wet: {
        crops: ["cowpeas", "velvet bean", "lablab"],
        benefits: ["Rapid ground cover", "Nitrogen fixation", "Weed suppression"],
        planting: "At onset of rainy season",
        termination: "Before main crop planting"
      },
      dry: {
        crops: ["sorghum", "millet", "oats"],
        benefits: ["Soil moisture conservation", "Wind erosion control", "Organic matter addition"],
        planting: "End of rainy season",
        termination: "Before next rainy season"
      }
    };

    const recommendation = { ...coverCrops[season] };

    if (soilType === "sandy") {
      recommendation.crops.push("pigeon pea");
      recommendation.benefits.push("Deep rooting improves soil structure");
    }

    return recommendation;
  }
}

export const cropRotationPlanner = new CropRotationPlanner();