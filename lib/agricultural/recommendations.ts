/**
 * Agricultural Recommendation Engine
 * Provides intelligent farming recommendations based on weather, crops, and best practices
 */

import { AGRICULTURAL_CONSTANTS } from "./constants";

export interface WeatherContext {
  temperature: number; // Celsius
  humidity: number; // Percentage
  rainfall: number; // mm in last 24h
  windSpeed: number; // km/h
  forecast: {
    temperature: number;
    rainfall: number;
    conditions: string;
  };
  soilMoisture?: number; // Percentage (optional for general weather context)
}

export interface CropContext {
  cropType: string;
  growthStage: "planting" | "vegetative" | "flowering" | "fruiting" | "harvest";
  daysSincePlanting: number;
  soilMoisture: number; // Percentage
  soilPH: number;
}

export interface Recommendation {
  type: "action" | "warning" | "info" | "alert";
  priority: "high" | "medium" | "low";
  category: "irrigation" | "pest_control" | "fertilization" | "harvest" | "planting" | "general";
  title: string;
  description: string;
  actionableSteps: string[];
  estimatedImpact: string;
}

export class AgriculturalRecommendationEngine {
  /**
   * Generate recommendations based on weather and crop context
   */
  generateRecommendations(
    weather: WeatherContext,
    crops: CropContext[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Weather-based recommendations
    recommendations.push(...this.getWeatherRecommendations(weather));

    // Crop-specific recommendations
    crops.forEach(crop => {
      recommendations.push(...this.getCropRecommendations(weather, crop));
    });

    // Priority sorting
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Weather-based recommendations
   */
  private getWeatherRecommendations(weather: WeatherContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Heavy rain warning
    if (weather.rainfall > 50) {
      recommendations.push({
        type: "alert",
        priority: "high",
        category: "general",
        title: "Heavy Rain Alert",
        description: "Heavy rainfall detected (50mm+). Take precautions for potential flooding and soil erosion.",
        actionableSteps: [
          "Check drainage systems and clear any blockages",
          "Protect young plants with additional covering",
          "Delay fertilizer application until soil drains",
          "Monitor for fungal disease outbreaks in high humidity",
          "Consider soil erosion protection measures on sloped areas"
        ],
        estimatedImpact: "Prevents crop loss and soil damage"
      });
    }

    // High temperature warning
    if (weather.temperature > 35) {
      recommendations.push({
        type: "warning",
        priority: "high",
        category: "irrigation",
        title: "High Temperature Stress",
        description: "Temperatures exceed 35°C. Crops may experience heat stress.",
        actionableSteps: [
          "Increase irrigation frequency during cooler hours",
          "Apply mulch to retain soil moisture",
          "Provide shade for sensitive crops if possible",
          "Monitor for heat stress symptoms (wilting, leaf scorch)",
          "Avoid fertilizer application during peak heat"
        ],
        estimatedImpact: "Reduces heat stress and yield loss"
      });
    }

    // Low temperature warning
    if (weather.temperature < 10) {
      recommendations.push({
        type: "warning",
        priority: "medium",
        category: "general",
        title: "Low Temperature Alert",
        description: "Temperatures below 10°C. Some crops may be at risk of cold damage.",
        actionableSteps: [
          "Protect frost-sensitive crops with covers",
          "Delay planting cold-sensitive crops",
          "Monitor soil temperature before planting",
          "Consider cold-hardy varieties for current conditions"
        ],
        estimatedImpact: "Prevents cold damage to sensitive crops"
      });
    }

    // High humidity warning
    if (weather.humidity > 85) {
      recommendations.push({
        type: "warning",
        priority: "medium",
        category: "pest_control",
        title: "High Humidity Alert",
        description: "High humidity (85%+) increases risk of fungal diseases.",
        actionableSteps: [
          "Improve air circulation around plants",
          "Avoid overhead irrigation during evening",
          "Apply preventive fungicides if disease history exists",
          "Monitor closely for fungal disease symptoms",
          "Reduce plant density if overcrowding is observed"
        ],
        estimatedImpact: "Prevents fungal disease outbreaks"
      });
    }

    // Strong wind warning
    if (weather.windSpeed > 30) {
      recommendations.push({
        type: "warning",
        priority: "medium",
        category: "general",
        title: "Strong Wind Alert",
        description: "Strong winds (30km/h+) may damage crops and reduce spraying effectiveness.",
        actionableSteps: [
          "Delay pesticide spraying until wind speeds decrease",
          "Secure trellises and support structures",
          "Harvest ripe crops if possible to prevent damage",
          "Monitor for physical damage to crops",
          "Avoid planting in exposed areas during windy conditions"
        ],
        estimatedImpact: "Prevents crop damage and ensures effective spraying"
      });
    }

    // Irrigation recommendation based on soil moisture
    if (weather.soilMoisture && weather.soilMoisture < 30) {
      recommendations.push({
        type: "action",
        priority: "high",
        category: "irrigation",
        title: "Irrigation Needed",
        description: "Soil moisture is low (below 30%). Immediate irrigation recommended.",
        actionableSteps: [
          "Irrigate deeply to encourage root growth",
          "Water early morning or late evening to reduce evaporation",
          "Monitor soil moisture levels regularly",
          "Consider drip irrigation for water efficiency",
          "Apply mulch to retain moisture"
        ],
        estimatedImpact: "Prevents water stress and maintains yield potential"
      });
    }

    return recommendations;
  }

  /**
   * Crop-specific recommendations
   */
  private getCropRecommendations(weather: WeatherContext, crop: CropContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const cropData = AGRICULTURAL_CONSTANTS.CROP_YIELDS[crop.cropType as keyof typeof AGRICULTURAL_CONSTANTS.CROP_YIELDS];
    const growthData = AGRICULTURAL_CONSTANTS.GROWTH_CYCLES[crop.cropType as keyof typeof AGRICULTURAL_CONSTANTS.GROWTH_CYCLES];
    const tempData = AGRICULTURAL_CONSTANTS.TEMPERATURE_RANGES[crop.cropType as keyof typeof AGRICULTURAL_CONSTANTS.TEMPERATURE_RANGES];

    if (!cropData || !growthData || !tempData) {
      return recommendations;
    }

    // Temperature stress for specific crop
    if (weather.temperature < tempData.min || weather.temperature > tempData.max) {
      recommendations.push({
        type: "warning",
        priority: "high",
        category: "general",
        title: `${crop.cropType} Temperature Stress`,
        description: `Current temperature (${weather.temperature}°C) is outside optimal range for ${crop.cropType} (${tempData.min}-${tempData.max}°C).`,
        actionableSteps: [
          `Provide protection if temperature exceeds ${tempData.max}°C`,
          `Monitor for temperature stress symptoms`,
          `Consider planting heat/cold-resistant varieties`,
          `Adjust planting schedule for optimal temperature window`
        ],
        estimatedImpact: "Prevents temperature-related yield loss"
      });
    }

    // Growth stage-specific recommendations
    switch (crop.growthStage) {
      case "planting":
        recommendations.push(...this.getPlantingRecommendations(crop, weather));
        break;
      case "vegetative":
        recommendations.push(...this.getVegetativeRecommendations(crop, weather));
        break;
      case "flowering":
        recommendations.push(...this.getFloweringRecommendations(crop, weather));
        break;
      case "fruiting":
        recommendations.push(...this.getFruitingRecommendations(crop, weather));
        break;
      case "harvest":
        recommendations.push(...this.getHarvestRecommendations(crop, weather));
        break;
    }

    // Soil pH recommendations
    const phData = AGRICULTURAL_CONSTANTS.SOIL_PH_RANGES[crop.cropType as keyof typeof AGRICULTURAL_CONSTANTS.SOIL_PH_RANGES];
    if (phData && (crop.soilPH < phData.min || crop.soilPH > phData.max)) {
      recommendations.push({
        type: "action",
        priority: "medium",
        category: "fertilization",
        title: `${crop.cropType} Soil pH Adjustment`,
        description: `Current soil pH (${crop.soilPH}) is outside optimal range for ${crop.cropType} (${phData.min}-${phData.max}).`,
        actionableSteps: [
          crop.soilPH < phData.min ? "Apply lime to raise pH" : "Apply sulfur to lower pH",
          "Retest soil pH after 2-3 months",
          "Monitor plant response to pH adjustment",
          "Consider pH-tolerant varieties if adjustment is difficult"
        ],
        estimatedImpact: "Optimizes nutrient availability and crop performance"
      });
    }

    return recommendations;
  }

  private getPlantingRecommendations(crop: CropContext, weather: WeatherContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (weather.rainfall > 10) {
      recommendations.push({
        type: "warning",
        priority: "medium",
        category: "planting",
        title: "Delay Planting Due to Rain",
        description: "Heavy rainfall may cause seed washing and poor germination.",
        actionableSteps: [
          "Wait for soil to drain before planting",
          "Ensure soil is not waterlogged",
          "Consider raised beds if drainage is poor",
          "Delay planting until forecast improves"
        ],
        estimatedImpact: "Ensures proper germination and stand establishment"
      });
    }

    return recommendations;
  }

  private getVegetativeRecommendations(crop: CropContext, weather: WeatherContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (crop.soilMoisture < 40) {
      recommendations.push({
        type: "action",
        priority: "high",
        category: "irrigation",
        title: "Critical Irrigation Needed",
        description: "Vegetative stage requires adequate moisture for optimal growth.",
        actionableSteps: [
          "Increase irrigation frequency",
          "Monitor soil moisture daily",
          "Apply nitrogen fertilizer with irrigation",
          "Consider foliar feeding if stress is severe"
        ],
        estimatedImpact: "Prevents growth stunting and maintains yield potential"
      });
    }

    return recommendations;
  }

  private getFloweringRecommendations(crop: CropContext, weather: WeatherContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (weather.rainfall > 20) {
      recommendations.push({
        type: "warning",
        priority: "high",
        category: "general",
        title: "Flower Damage Risk",
        description: "Heavy rain during flowering can cause flower drop and poor pollination.",
        actionableSteps: [
          "Provide physical protection if possible",
          "Improve drainage around flowering plants",
          "Monitor for flower drop and pollination issues",
          "Consider support structures for heavy flower clusters"
        ],
        estimatedImpact: "Prevents yield loss due to poor pollination"
      });
    }

    return recommendations;
  }

  private getFruitingRecommendations(crop: CropContext, weather: WeatherContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (weather.humidity > 80) {
      recommendations.push({
        type: "warning",
        priority: "medium",
        category: "pest_control",
        title: "Fruit Disease Risk",
        description: "High humidity during fruiting increases disease risk.",
        actionableSteps: [
          "Improve air circulation around fruit",
          "Apply preventive fungicides if disease history exists",
          "Avoid overhead irrigation",
          "Harvest ripe fruit promptly"
        ],
        estimatedImpact: "Prevents fruit loss to disease"
      });
    }

    return recommendations;
  }

  private getHarvestRecommendations(crop: CropContext, weather: WeatherContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (weather.rainfall > 5) {
      recommendations.push({
        type: "warning",
        priority: "medium",
        category: "harvest",
        title: "Delay Harvest Due to Rain",
        description: "Harvesting during rain can cause quality issues and storage problems.",
        actionableSteps: [
          "Wait for crops to dry before harvest",
          "Ensure proper drying facilities are available",
          "Monitor for mold development in stored crops",
          "Prioritize harvest of most mature crops first"
        ],
        estimatedImpact: "Maintains harvest quality and prevents storage losses"
      });
    }

    return recommendations;
  }

  /**
   * Get irrigation schedule recommendations
   */
  getIrrigationSchedule(cropType: string, growthStage: string, weather: WeatherContext): {
    frequency: string;
    timing: string;
    amount: string;
    notes: string[];
  } {
    const irrigationData = AGRICULTURAL_CONSTANTS.IRRIGATION_REQUIREMENTS[cropType as keyof typeof AGRICULTURAL_CONSTANTS.IRRIGATION_REQUIREMENTS];

    if (!irrigationData) {
      return {
        frequency: "Daily monitoring required",
        timing: "Early morning or late evening",
        amount: "Based on soil moisture assessment",
        notes: ["Specific irrigation data not available for this crop type"]
      };
    }

    let frequency = "Every 2-3 days";
    let amount = "25-30mm per application";

    // Adjust based on growth stage
    if (growthStage === "flowering" || growthStage === "fruiting") {
      frequency = "Daily to every 2 days";
      amount = "30-35mm per application";
    }

    // Adjust based on weather
    if (weather.temperature > 30 || weather.humidity < 40) {
      frequency = "Daily";
      amount = "35-40mm per application";
    }

    return {
      frequency,
      timing: "Early morning (6-8 AM) or late evening (5-7 PM)",
      amount,
      notes: [
        `Total seasonal requirement: ${irrigationData.typical}mm`,
        "Monitor soil moisture at 15cm depth",
        "Adjust based on rainfall and crop response",
        "Use drip irrigation for water efficiency if available"
      ]
    };
  }

  /**
   * Get fertilization recommendations
   */
  getFertilizationRecommendations(cropType: string, growthStage: string, soilPH: number): {
    nutrients: { name: string; rate: string; timing: string }[];
    applications: string[];
    precautions: string[];
  } {
    const nutrientData = AGRICULTURAL_CONSTANTS.FERTILIZER_RATES;

    const recommendations = {
      nutrients: [
        {
          name: "Nitrogen (N)",
          rate: `${nutrientData.nitrogen.typical} kg/ha`,
          timing: growthStage === "planting" ? "At planting" : "Split applications"
        },
        {
          name: "Phosphorus (P)",
          rate: `${nutrientData.phosphorus.typical} kg/ha`,
          timing: "At planting for root development"
        },
        {
          name: "Potassium (K)",
          rate: `${nutrientData.potassium.typical} kg/ha`,
          timing: growthStage === "fruiting" ? "During fruit development" : "Split applications"
        }
      ],
      applications: [
        "Apply fertilizer when soil moisture is adequate",
        "Incorporate fertilizer into soil for better efficiency",
        "Consider slow-release formulations for extended availability",
        "Apply micronutrients if deficiency symptoms appear"
      ],
      precautions: [
        soilPH < 5.5 ? "Consider lime application before phosphorus fertilizer" : "",
        "Avoid fertilizer application before heavy rain",
        "Follow recommended rates to prevent nutrient burn",
        "Monitor plant response to fertilizer applications"
      ].filter(Boolean)
    };

    return recommendations;
  }
}

export const recommendationEngine = new AgriculturalRecommendationEngine();