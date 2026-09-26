/**
 * Irrigation Scheduling and Management System
 * Optimizes water usage based on crop needs, weather, and soil conditions
 */

import { AGRICULTURAL_CONSTANTS } from "./constants";

export interface IrrigationSchedule {
  cropType: string;
  growthStage: string;
  frequency: string;
  timing: string;
  amount: string;
  method: string;
  notes: string[];
}

export interface WaterRequirement {
  daily: number; // mm per day
  weekly: number; // mm per week
  seasonal: number; // mm per season
  criticalPeriods: string[];
}

export interface IrrigationRecommendation {
  action: "irrigate" | "wait" | "reduce" | "increase";
  priority: "urgent" | "recommended" | "optional";
  amount: string;
  timing: string;
  reason: string;
  nextCheck: string;
}

export class IrrigationScheduler {
  /**
   * Get irrigation schedule for specific crop and conditions
   */
  getIrrigationSchedule(
    cropType: string,
    growthStage: string,
    soilType: string,
    weatherConditions: {
      temperature: number;
      humidity: number;
      rainfall: number;
      forecast: string;
    }
  ): IrrigationSchedule {
    const irrigationData = AGRICULTURAL_CONSTANTS.IRRIGATION_REQUIREMENTS[cropType as keyof typeof AGRICULTURAL_CONSTANTS.IRRIGATION_REQUIREMENTS];

    if (!irrigationData) {
      return this.getDefaultSchedule(cropType);
    }

    let frequency = "Every 2-3 days";
    let amount = "25-30mm per application";
    let method = "Flood or sprinkler irrigation";

    // Adjust based on growth stage
    if (growthStage === "flowering" || growthStage === "fruiting") {
      frequency = "Daily to every 2 days";
      amount = "30-35mm per application";
    } else if (growthStage === "planting") {
      frequency = "Immediately after planting, then every 2-3 days";
      amount = "15-20mm for establishment, then 25-30mm";
    }

    // Adjust based on soil type
    if (soilType === "sandy") {
      frequency = "Daily to every 2 days";
      amount = "20-25mm per application";
      method = "Drip irrigation recommended";
    } else if (soilType === "clay") {
      frequency = "Every 3-4 days";
      amount = "30-35mm per application";
      method = "Flood irrigation acceptable";
    }

    // Adjust based on weather
    if (weatherConditions.temperature > 30 || weatherConditions.humidity < 40) {
      frequency = "Daily";
      amount = "35-40mm per application";
    }

    if (weatherConditions.rainfall > 20) {
      frequency = "Skip next scheduled irrigation";
      amount = "Monitor soil moisture before next application";
    }

    return {
      cropType,
      growthStage,
      frequency,
      timing: "Early morning (6-8 AM) or late evening (5-7 PM)",
      amount,
      method,
      notes: [
        `Total seasonal requirement: ${irrigationData.typical}mm`,
        "Monitor soil moisture at 15cm depth",
        "Adjust based on rainfall and crop response",
        "Use drip irrigation for water efficiency if available",
        "Avoid irrigation during peak heat to reduce evaporation"
      ]
    };
  }

  /**
   * Calculate water requirements
   */
  calculateWaterRequirements(cropType: string, areaHa: number, growthDays: number): WaterRequirement {
    const irrigationData = AGRICULTURAL_CONSTANTS.IRRIGATION_REQUIREMENTS[cropType as keyof typeof AGRICULTURAL_CONSTANTS.IRRIGATION_REQUIREMENTS];

    if (!irrigationData) {
      return {
        daily: 5,
        weekly: 35,
        seasonal: 500,
        criticalPeriods: ["Flowering", "Fruiting"]
      };
    }

    const dailyRequirement = irrigationData.typical / growthDays;
    const weeklyRequirement = dailyRequirement * 7;

    return {
      daily: Math.round(dailyRequirement),
      weekly: Math.round(weeklyRequirement),
      seasonal: irrigationData.typical,
      criticalPeriods: ["Flowering", "Fruiting", "Yield formation"]
    };
  }

  /**
   * Get irrigation recommendation based on current conditions
   */
  getIrrigationRecommendation(
    soilMoisture: number,
    cropType: string,
    growthStage: string,
    weatherConditions: {
      temperature: number;
      humidity: number;
      rainfall: number;
      forecast: string;
    }
  ): IrrigationRecommendation {
    const irrigationData = AGRICULTURAL_CONSTANTS.IRRIGATION_REQUIREMENTS[cropType as keyof typeof AGRICULTURAL_CONSTANTS.IRRIGATION_REQUIREMENTS];

    // Critical thresholds
    const criticalMoisture = 30; // Below this, urgent irrigation needed
    const adequateMoisture = 60; // Above this, irrigation optional

    // Urgent irrigation needed
    if (soilMoisture < criticalMoisture) {
      return {
        action: "irrigate",
        priority: "urgent",
        amount: "35-40mm deep irrigation",
        timing: "Immediately (preferably early morning or late evening)",
        reason: `Soil moisture critically low (${soilMoisture}%). Crop at risk of water stress.`,
        nextCheck: "24 hours"
      };
    }

    // Recommended irrigation
    if (soilMoisture < adequateMoisture) {
      // Check if rain is forecast
      if (weatherConditions.forecast.toLowerCase().includes("rain") && weatherConditions.rainfall > 10) {
        return {
          action: "wait",
          priority: "recommended",
          amount: "Monitor rainfall accumulation",
          timing: "After rainfall event",
          reason: "Rain forecast. Delay irrigation to assess actual rainfall impact.",
          nextCheck: "After rainfall"
        };
      }

      return {
        action: "irrigate",
        priority: "recommended",
        amount: "25-30mm standard application",
        timing: "Early morning or late evening",
        reason: `Soil moisture below optimal (${soilMoisture}%). Irrigation recommended.`,
        nextCheck: "48 hours"
      };
    }

    // High temperature or low humidity - consider irrigation
    if (weatherConditions.temperature > 30 || weatherConditions.humidity < 40) {
      return {
        action: "increase",
        priority: "recommended",
        amount: "Increase to 30-35mm per application",
        timing: "Early morning",
        reason: "High temperature/low humidity increases evapotranspiration. Adjust irrigation accordingly.",
        nextCheck: "24 hours"
      };
    }

    // Adequate moisture - no irrigation needed
    if (weatherConditions.rainfall > 20) {
      return {
        action: "reduce",
        priority: "optional",
        amount: "Skip next scheduled irrigation",
        timing: "Monitor soil moisture",
        reason: "Recent rainfall provides adequate moisture. Reduce irrigation frequency.",
        nextCheck: "3-4 days"
      };
    }

    return {
      action: "wait",
      priority: "optional",
      amount: "Monitor soil moisture",
      timing: "Regular monitoring schedule",
      reason: "Soil moisture adequate. Continue monitoring.",
      nextCheck: "2-3 days"
    };
  }

  /**
   * Get irrigation method recommendations
   */
  getIrrigationMethodRecommendation(
    cropType: string,
    areaHa: number,
    waterAvailability: "high" | "medium" | "low",
    budget: "high" | "medium" | "low"
  ): {
    recommendedMethod: string;
    alternatives: string[];
    efficiency: string;
    cost: string;
    pros: string[];
    cons: string[];
  } {
    const methods = {
      drip: {
        name: "Drip Irrigation",
        efficiency: "90-95%",
        cost: "High initial cost, low operating cost",
        pros: [
          "Highest water efficiency",
          "Precise water application",
          "Reduced weed growth",
          "Can be automated",
          "Fertilizer injection capability"
        ],
        cons: [
          "High initial investment",
          "Clogging risk if not maintained",
          "Requires regular maintenance",
          "Limited to row crops"
        ]
      },
      sprinkler: {
        name: "Sprinkler Irrigation",
        efficiency: "70-80%",
        cost: "Medium initial cost, medium operating cost",
        pros: [
          "Good water distribution",
          "Can cover large areas",
          "Less maintenance than drip",
          "Suitable for many crop types",
          "Can provide frost protection"
        ],
        cons: [
          "Higher evaporation losses",
          "Wind affects distribution",
          "Can promote fungal diseases",
          "Requires adequate water pressure"
        ]
      },
      flood: {
        name: "Flood Irrigation",
        efficiency: "50-60%",
        cost: "Low initial cost, medium operating cost",
        pros: [
          "Low initial investment",
          "Simple to implement",
          "Good for leaching salts",
          "Can recharge groundwater",
          "Requires minimal technology"
        ],
        cons: [
          "Low water efficiency",
          "High water losses",
          "Waterlogging risk",
          "Uneven distribution",
          "High labor requirement"
        ]
      }
    };

    // Recommend based on constraints
    if (waterAvailability === "low" && budget === "high") {
      return {
        recommendedMethod: methods.drip.name,
        alternatives: [methods.sprinkler.name],
        efficiency: methods.drip.efficiency,
        cost: methods.drip.cost,
        pros: methods.drip.pros,
        cons: methods.drip.cons
      };
    }

    if (waterAvailability === "medium" && budget === "medium") {
      return {
        recommendedMethod: methods.sprinkler.name,
        alternatives: [methods.drip.name, methods.flood.name],
        efficiency: methods.sprinkler.efficiency,
        cost: methods.sprinkler.cost,
        pros: methods.sprinkler.pros,
        cons: methods.sprinkler.cons
      };
    }

    if (budget === "low") {
      return {
        recommendedMethod: methods.flood.name,
        alternatives: [methods.sprinkler.name],
        efficiency: methods.flood.efficiency,
        cost: methods.flood.cost,
        pros: methods.flood.pros,
        cons: methods.flood.cons
      };
    }

    // Default recommendation
    return {
      recommendedMethod: methods.sprinkler.name,
      alternatives: [methods.drip.name, methods.flood.name],
      efficiency: methods.sprinkler.efficiency,
      cost: methods.sprinkler.cost,
      pros: methods.sprinkler.pros,
      cons: methods.sprinkler.cons
    };
  }

  /**
   * Get water conservation tips
   */
  getWaterConservationTips(): string[] {
    return [
      "Use mulch to reduce evaporation (30-50% water savings)",
      "Irrigate early morning or late evening to reduce evaporation",
      "Maintain irrigation equipment to prevent leaks",
      "Use soil moisture sensors for precise irrigation timing",
      "Implement deficit irrigation during non-critical growth stages",
      "Choose drought-tolerant crop varieties when possible",
      "Practice proper land leveling for uniform water distribution",
      "Use cover crops to improve soil water retention",
      "Implement rainwater harvesting systems",
      "Schedule irrigation based on crop growth stage requirements"
    ];
  }

  /**
   * Get drought response strategies
   */
  getDroughtResponseStrategies(cropType: string): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    return {
      immediate: [
        "Reduce irrigation frequency but maintain critical periods",
        "Apply mulch to conserve soil moisture",
        "Remove weeds competing for water",
        "Apply anti-transpirants if available and economical",
        "Prioritize water for high-value crops"
      ],
      shortTerm: [
        "Switch to drought-tolerant varieties for next planting",
        "Adjust planting dates to match rainfall patterns",
        "Implement partial root zone drying techniques",
        "Use water-saving irrigation methods (drip, micro-sprinklers)",
        "Reduce plant density to lower water demand"
      ],
      longTerm: [
        "Invest in water-efficient irrigation infrastructure",
        "Develop water storage facilities (ponds, tanks)",
        "Implement soil improvement practices (organic matter, cover crops)",
        "Diversify crops with different water requirements",
        "Consider drought insurance or financial risk management"
      ]
    };
  }

  /**
   * Default schedule for unknown crops
   */
  private getDefaultSchedule(cropType: string): IrrigationSchedule {
    return {
      cropType,
      growthStage: "general",
      frequency: "Every 2-3 days",
      timing: "Early morning or late evening",
      amount: "25-30mm per application",
      method: "Flood or sprinkler irrigation",
      notes: [
        "Monitor soil moisture regularly",
        "Adjust based on crop response",
        "Specific requirements may vary by variety",
        "Consult local agricultural extension for crop-specific needs"
      ]
    };
  }
}

export const irrigationScheduler = new IrrigationScheduler();