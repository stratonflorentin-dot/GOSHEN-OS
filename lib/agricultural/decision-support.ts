/**
 * Agricultural Decision Support System
 * Unified interface for all agricultural intelligence systems
 */

import { recommendationEngine, type WeatherContext, type CropContext, type Recommendation } from "./recommendations";
import { cropRotationPlanner, type CropPlan, type RotationRecommendation } from "./crop-rotation";
import { pestDiseaseDetector, type PestDiseaseIdentification } from "./pest-disease";
import { irrigationScheduler, type IrrigationRecommendation } from "./irrigation";

export interface FarmContext {
  location: {
    lat: number;
    lng: number;
    altitude: number;
  };
  soilType: string;
  soilPH: number;
  soilMoisture: number;
  currentCrops: CropContext[];
  historicalData?: {
    previousCrops: string[];
    yieldHistory: number[];
    pestHistory: string[];
  };
}

export interface DecisionSupportOutput {
  timestamp: number;
  weather: WeatherContext;
  farmContext: FarmContext;
  recommendations: Recommendation[];
  irrigation: IrrigationRecommendation;
  rotationAdvice: RotationRecommendation[];
  pestAlerts: PestDiseaseIdentification[];
  actionItems: {
    priority: "urgent" | "high" | "medium" | "low";
    category: string;
    action: string;
    deadline: string;
  }[];
  summary: string;
}

export class AgriculturalDecisionSupport {
  /**
   * Generate comprehensive decision support output
   */
  generateDecisionSupport(
    weather: WeatherContext,
    farmContext: FarmContext
  ): DecisionSupportOutput {
    const timestamp = Date.now();

    // Get recommendations from all systems
    const recommendations = recommendationEngine.generateRecommendations(weather, farmContext.currentCrops);

    // Get irrigation recommendation for first crop (or general if none)
    const primaryCrop = farmContext.currentCrops[0];
    const irrigation = primaryCrop
      ? irrigationScheduler.getIrrigationRecommendation(
          farmContext.soilMoisture,
          primaryCrop.cropType,
          primaryCrop.growthStage,
          {
            temperature: weather.temperature,
            humidity: weather.humidity,
            rainfall: weather.rainfall,
            forecast: weather.forecast.conditions
          }
        )
      : {
          action: "wait" as const,
          priority: "optional" as const,
          amount: "Monitor soil moisture",
          timing: "Regular monitoring",
          reason: "No active crops. General monitoring recommended.",
          nextCheck: "Weekly"
        };

    // Get rotation advice for all current crops
    const rotationAdvice = farmContext.currentCrops.map(crop =>
      cropRotationPlanner.getRotationRecommendation(
        crop.cropType,
        farmContext.soilType,
        farmContext.historicalData?.previousCrops[0]
      )
    );

    // Get pest alerts based on season and crops
    const season = weather.rainfall > 50 ? "wet" : "dry";
    const pestAlerts = farmContext.currentCrops.flatMap(crop =>
      pestDiseaseDetector.getSeasonalPestForecast(season, crop.cropType).highRiskPests.map(name =>
        pestDiseaseDetector.getPestDiseaseInfo(name)
      ).filter(Boolean) as PestDiseaseIdentification[]
    );

    // Generate action items
    const actionItems = this.generateActionItems(recommendations, irrigation, pestAlerts);

    // Generate summary
    const summary = this.generateSummary(weather, farmContext, recommendations, irrigation);

    return {
      timestamp,
      weather,
      farmContext,
      recommendations,
      irrigation,
      rotationAdvice,
      pestAlerts,
      actionItems,
      summary
    };
  }

  /**
   * Generate prioritized action items
   */
  private generateActionItems(
    recommendations: Recommendation[],
    irrigation: IrrigationRecommendation,
    pestAlerts: PestDiseaseIdentification[]
  ): {
    priority: "urgent" | "high" | "medium" | "low";
    category: string;
    action: string;
    deadline: string;
  }[] {
    const actionItems: {
      priority: "urgent" | "high" | "medium" | "low";
      category: string;
      action: string;
      deadline: string;
    }[] = [];

    // Process recommendations
    recommendations.forEach(rec => {
      if (rec.priority === "high" && rec.type === "alert") {
        actionItems.push({
          priority: "urgent",
          category: rec.category,
          action: rec.title,
          deadline: "Immediate"
        });
      } else if (rec.priority === "high") {
        actionItems.push({
          priority: "high",
          category: rec.category,
          action: rec.title,
          deadline: "24 hours"
        });
      } else if (rec.priority === "medium") {
        actionItems.push({
          priority: "medium",
          category: rec.category,
          action: rec.title,
          deadline: "3-5 days"
        });
      }
    });

    // Process irrigation recommendation
    if (irrigation.priority === "urgent") {
      actionItems.push({
        priority: "urgent",
        category: "irrigation",
        action: "Irrigate crops immediately",
        deadline: "Immediate"
      });
    } else if (irrigation.priority === "recommended") {
      actionItems.push({
        priority: "high",
        category: "irrigation",
        action: irrigation.action === "irrigate" ? "Apply irrigation" : "Monitor conditions",
        deadline: irrigation.nextCheck
      });
    }

    // Process pest alerts
    pestAlerts.forEach(pest => {
      actionItems.push({
        priority: "high",
        category: "pest_control",
        action: `Monitor for ${pest.name}`,
        deadline: "Weekly"
      });
    });

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Generate executive summary
   */
  private generateSummary(
    weather: WeatherContext,
    farmContext: FarmContext,
    recommendations: Recommendation[],
    irrigation: IrrigationRecommendation
  ): string {
    const alerts = recommendations.filter(r => r.type === "alert").length;
    const warnings = recommendations.filter(r => r.type === "warning").length;
    const actions = recommendations.filter(r => r.type === "action").length;

    let summary = `Decision Support Summary for ${new Date().toLocaleDateString()}:\n`;
    summary += `- Weather: ${weather.temperature}°C, ${weather.humidity}% humidity, ${weather.rainfall}mm rainfall\n`;
    summary += `- Active crops: ${farmContext.currentCrops.length}\n`;
    summary += `- Soil moisture: ${farmContext.soilMoisture}%\n`;
    summary += `- Alerts: ${alerts}, Warnings: ${warnings}, Actions: ${actions}\n`;
    summary += `- Irrigation status: ${irrigation.action} (${irrigation.priority} priority)\n`;

    if (alerts > 0) {
      summary += `- URGENT: ${alerts} critical alerts require immediate attention\n`;
    }

    if (warnings > 0) {
      summary += `- Monitor: ${warnings} warnings require attention within 24-48 hours\n`;
    }

    return summary;
  }

  /**
   * Get seasonal planning recommendations
   */
  getSeasonalPlanningRecommendations(
    season: "wet" | "dry",
    soilType: string,
    availableArea: number
  ): {
    recommendedCrops: string[];
    plantingSchedule: string[];
    irrigationNeeds: string[];
    pestManagement: string[];
    soilPreparation: string[];
  } {
    const wetSeasonCrops = ["maize", "rice", "vegetables", "legumes"];
    const drySeasonCrops = ["sorghum", "millet", "vegetables", "drought-tolerant varieties"];

    const recommendedCrops = season === "wet" ? wetSeasonCrops : drySeasonCrops;

    return {
      recommendedCrops,
      plantingSchedule: season === "wet"
        ? [
            "Prepare land 2-3 weeks before rains",
            "Plant at onset of rains",
            "Use early-maturing varieties if rains are delayed",
            "Stagger planting for continuous harvest"
          ]
        : [
            "Plant early in dry season to utilize residual moisture",
            "Use drought-tolerant varieties",
            "Ensure irrigation infrastructure is ready",
            "Apply mulch to conserve moisture"
          ],
      irrigationNeeds: season === "wet"
        ? [
            "Monitor rainfall and supplement if needed",
            "Focus on drainage during heavy rains",
            "Maintain soil moisture during dry spells"
          ]
        : [
            "Full irrigation required for most crops",
            "Prioritize high-value crops for water allocation",
            "Use water-efficient irrigation methods"
          ],
      pestManagement: season === "wet"
        ? [
            "High risk of fungal diseases",
            "Implement preventive fungicide program",
            "Monitor for water-borne pests",
            "Ensure good air circulation"
          ]
        : [
            "Monitor for drought-stress related pests",
            "Focus on early pest detection",
            "Use pest-resistant varieties"
          ],
      soilPreparation: season === "wet"
        ? [
            "Ensure proper drainage",
            "Incorporate organic matter",
            "Test soil pH and apply amendments if needed"
          ]
        : [
            "Deep plowing to break hard pans",
            "Apply organic matter to improve water retention",
            "Install moisture conservation measures"
          ]
    };
  }

  /**
   * Get farm health assessment
   */
  getFarmHealthAssessment(farmContext: FarmContext): {
    overallHealth: "excellent" | "good" | "fair" | "poor";
    soilHealth: { score: number; issues: string[]; recommendations: string[] };
    cropHealth: { score: number; issues: string[]; recommendations: string[] };
    waterStatus: { score: number; issues: string[]; recommendations: string[] };
    pestPressure: { score: number; issues: string[]; recommendations: string[] };
  } {
    // Soil health assessment
    const soilIssues: string[] = [];
    const soilRecommendations: string[] = [];
    let soilScore = 100;

    if (farmContext.soilPH < 5.5 || farmContext.soilPH > 7.5) {
      soilIssues.push("Soil pH outside optimal range (5.5-7.5)");
      soilRecommendations.push("Apply lime (if acidic) or sulfur (if alkaline)");
      soilScore -= 20;
    }

    if (farmContext.soilMoisture < 30) {
      soilIssues.push("Low soil moisture");
      soilRecommendations.push("Increase irrigation frequency");
      soilScore -= 15;
    }

    // Crop health assessment
    const cropIssues: string[] = [];
    const cropRecommendations: string[] = [];
    let cropScore = 100;

    if (farmContext.currentCrops.length === 0) {
      cropIssues.push("No active crops");
      cropRecommendations.push("Consider planting seasonal crops");
      cropScore -= 30;
    }

    farmContext.currentCrops.forEach(crop => {
      if (crop.daysSincePlanting > 180 && crop.growthStage === "vegetative") {
        cropIssues.push(`${crop.cropType} may be overdue for maturity`);
        cropRecommendations.push("Review crop variety and growing conditions");
        cropScore -= 10;
      }
    });

    // Water status assessment
    const waterIssues: string[] = [];
    const waterRecommendations: string[] = [];
    let waterScore = 100;

    if (farmContext.soilMoisture < 25) {
      waterIssues.push("Critical soil moisture level");
      waterRecommendations.push("Immediate irrigation required");
      waterScore -= 30;
    } else if (farmContext.soilMoisture < 40) {
      waterIssues.push("Low soil moisture");
      waterRecommendations.push("Increase irrigation frequency");
      waterScore -= 15;
    }

    // Pest pressure assessment (simplified)
    const pestIssues: string[] = [];
    const pestRecommendations: string[] = [];
    let pestScore = 100;

    if (farmContext.historicalData?.pestHistory && farmContext.historicalData.pestHistory.length > 2) {
      pestIssues.push("History of recurring pest problems");
      pestRecommendations.push("Implement integrated pest management");
      pestScore -= 20;
    }

    // Overall health
    const averageScore = (soilScore + cropScore + waterScore + pestScore) / 4;
    let overallHealth: "excellent" | "good" | "fair" | "poor";
    if (averageScore >= 85) overallHealth = "excellent";
    else if (averageScore >= 70) overallHealth = "good";
    else if (averageScore >= 50) overallHealth = "fair";
    else overallHealth = "poor";

    return {
      overallHealth,
      soilHealth: { score: soilScore, issues: soilIssues, recommendations: soilRecommendations },
      cropHealth: { score: cropScore, issues: cropIssues, recommendations: cropRecommendations },
      waterStatus: { score: waterScore, issues: waterIssues, recommendations: waterRecommendations },
      pestPressure: { score: pestScore, issues: pestIssues, recommendations: pestRecommendations }
    };
  }
}

export const agriculturalDecisionSupport = new AgriculturalDecisionSupport();