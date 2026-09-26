/**
 * Pest and Disease Detection Guidelines
 * Agricultural pest and disease identification and management recommendations
 */

export interface PestDiseaseSymptom {
  symptom: string;
  affectedPart: string;
  severity: "mild" | "moderate" | "severe";
  timing: string;
}

export interface PestDiseaseIdentification {
  name: string;
  type: "pest" | "disease" | "nutrient_deficiency";
  affectedCrops: string[];
  symptoms: PestDiseaseSymptom[];
  causes: string[];
  prevention: string[];
  treatment: {
    chemical: string[];
    biological: string[];
    cultural: string[];
  };
  economicImpact: string;
}

export class PestDiseaseDetector {
  /**
   * Common agricultural pests and diseases database
   */
  private pestDiseaseDatabase: Record<string, PestDiseaseIdentification> = {
    // Fungal Diseases
    late_blight: {
      name: "Late Blight (Phytophthora infestans)",
      type: "disease",
      affectedCrops: ["tomatoes", "potatoes"],
      symptoms: [
        { symptom: "Water-soaked lesions on leaves", affectedPart: "leaves", severity: "severe", timing: "cool, wet conditions" },
        { symptom: "White fungal growth on leaf undersides", affectedPart: "leaves", severity: "moderate", timing: "high humidity" },
        { symptom: "Brown/black lesions on stems", affectedPart: "stems", severity: "severe", timing: "advanced infection" },
        { symptom: "Firm, brown rot on tubers/fruit", affectedPart: "tubers/fruit", severity: "severe", timing: "harvest" }
      ],
      causes: ["Phytophthora infestans fungus", "Cool, wet weather (15-20°C)", "High humidity (>90%)", "Poor air circulation"],
      prevention: [
        "Use resistant varieties",
        "Ensure good air circulation",
        "Avoid overhead irrigation",
        "Crop rotation (3-4 years)",
        "Remove infected plant debris"
      ],
      treatment: {
        chemical: ["Copper fungicides", "Chlorothalonil", "Mancozeb"],
        biological: ["Bacillus subtilis", "Trichoderma species"],
        cultural: ["Remove infected plants", "Improve drainage", "Reduce plant density"]
      },
      economicImpact: "Can cause 50-100% crop loss if untreated"
    },

    powdery_mildew: {
      name: "Powdery Mildew",
      type: "disease",
      affectedCrops: ["tomatoes", "cucurbits", "wheat", "grapes"],
      symptoms: [
        { symptom: "White powdery coating on leaves", affectedPart: "leaves", severity: "moderate", timing: "mid-season" },
        { symptom: "Yellowing and curling of leaves", affectedPart: "leaves", severity: "moderate", timing: "advanced infection" },
        { symptom: "Stunted growth", affectedPart: "whole plant", severity: "mild", timing: "early infection" }
      ],
      causes: ["Fungal pathogens (Erysiphales)", "High humidity", "Poor air circulation", "Overcrowding"],
      prevention: [
        "Plant resistant varieties",
        "Ensure proper spacing",
        "Improve air circulation",
        "Avoid overhead irrigation",
        "Remove infected leaves"
      ],
      treatment: {
        chemical: ["Sulfur fungicides", "Neem oil", "Potassium bicarbonate"],
        biological: ["Bacillus subtilis", "Ampelomyces quisqualis"],
        cultural: ["Remove infected plant parts", "Reduce humidity", "Improve ventilation"]
      },
      economicImpact: "Reduces yield by 20-50%, affects quality"
    },

    // Insect Pests
    fall_armyworm: {
      name: "Fall Armyworm (Spodoptera frugiperda)",
      type: "pest",
      affectedCrops: ["maize", "sorghum", "rice", "cotton"],
      symptoms: [
        { symptom: "Irregular holes in leaves", affectedPart: "leaves", severity: "moderate", timing: "early larval stage" },
        { symptom: "Window-pane damage on leaves", affectedPart: "leaves", severity: "mild", timing: "young larvae" },
        { symptom: "Frass (insect waste) on plants", affectedPart: "leaves/stems", severity: "moderate", timing: "active feeding" },
        { symptom: "Damage to whorl and tassels", affectedPart: "reproductive parts", severity: "severe", timing: "late infestation" }
      ],
      causes: ["Fall armyworm moth migration", "Favorable warm conditions", "Lack of natural enemies", "Continuous maize planting"],
      prevention: [
        "Early planting to avoid peak infestation",
        "Crop rotation",
        "Push-pull technology",
        "Intercropping with repellent plants",
        "Maintain field hygiene"
      ],
      treatment: {
        chemical: ["Emamectin benzoate", "Chlorantraniliprole", "Spinetoram"],
        biological: ["Bacillus thuringiensis (Bt)", "Nucleopolyhedrovirus", "Parasitoid wasps"],
        cultural: ["Hand-picking larvae", "Destroy infested plants", "Push-pull with desmodium and napier grass"]
      },
      economicImpact: "Can cause 20-50% yield loss in maize"
    },

    aphids: {
      name: "Aphids",
      type: "pest",
      affectedCrops: ["tomatoes", "potatoes", "cotton", "vegetables"],
      symptoms: [
        { symptom: "Small, soft-bodied insects on undersides of leaves", affectedPart: "leaves", severity: "mild", timing: "early infestation" },
        { symptom: "Sticky honeydew on leaves", affectedPart: "leaves", severity: "moderate", timing: "established colonies" },
        { symptom: "Sooty mold growth on honeydew", affectedPart: "leaves", severity: "moderate", timing: "secondary infection" },
        { symptom: "Curling and yellowing of leaves", affectedPart: "leaves", severity: "severe", timing: "heavy infestation" }
      ],
      causes: ["Aphid reproduction in favorable conditions", "Excessive nitrogen fertilization", "Lack of natural predators", "Ant farming of aphids"],
      prevention: [
        "Encourage natural predators (ladybugs, lacewings)",
        "Avoid excessive nitrogen",
        "Remove infested plants early",
        "Use reflective mulches",
        "Maintain plant diversity"
      ],
      treatment: {
        chemical: ["Imidacloprid", "Pyrethroids", "Neonicotinoids"],
        biological: ["Ladybird beetles", "Lacewings", "Parasitic wasps"],
        cultural: ["Wash plants with water", "Prune heavily infested areas", "Remove ant colonies"]
      },
      economicImpact: "Reduces yield by 10-40%, can transmit viral diseases"
    },

    // Nutrient Deficiencies
    nitrogen_deficiency: {
      name: "Nitrogen Deficiency",
      type: "nutrient_deficiency",
      affectedCrops: ["maize", "wheat", "vegetables"],
      symptoms: [
        { symptom: "Yellowing of older leaves (chlorosis)", affectedPart: "older leaves", severity: "moderate", timing: "early growth" },
        { symptom: "Stunted growth", affectedPart: "whole plant", severity: "moderate", timing: "early stages" },
        { symptom: "Thin, spindly stems", affectedPart: "stems", severity: "mild", timing: "vegetative stage" },
        { symptom: "Reduced yield and quality", affectedPart: "whole plant", severity: "severe", timing: "harvest" }
      ],
      causes: ["Insufficient nitrogen in soil", "Leaching from heavy rainfall", "High carbon organic matter", "Imbalanced fertilization"],
      prevention: [
        "Regular soil testing",
        "Apply nitrogen fertilizer based on crop needs",
        "Use slow-release nitrogen sources",
        "Incorporate organic matter",
        "Practice crop rotation with legumes"
      ],
      treatment: {
        chemical: ["Urea", "Ammonium nitrate", "Calcium ammonium nitrate"],
        biological: ["Legume cover crops", "Compost", "Manure"],
        cultural: ["Apply nitrogen in split applications", "Time applications before rapid growth", "Use nitrification inhibitors"]
      },
      economicImpact: "Can reduce yield by 30-50% if severe"
    },

    phosphorus_deficiency: {
      name: "Phosphorus Deficiency",
      type: "nutrient_deficiency",
      affectedCrops: ["maize", "vegetables", "legumes"],
      symptoms: [
        { symptom: "Purple/red discoloration of leaves", affectedPart: "older leaves", severity: "moderate", timing: "early growth" },
        { symptom: "Stunted root development", affectedPart: "roots", severity: "severe", timing: "early stages" },
        { symptom: "Delayed maturity", affectedPart: "whole plant", severity: "moderate", timing: "later stages" },
        { symptom: "Poor seed/fruit development", affectedPart: "reproductive parts", severity: "severe", timing: "flowering" }
      ],
      causes: ["Low soil phosphorus", "High soil pH (alkaline)", "Cold soil conditions", "Phosphorus fixation in soil"],
      prevention: [
        "Soil testing before planting",
        "Apply phosphorus fertilizer at planting",
        "Use phosphorus-solubilizing microorganisms",
        "Maintain optimal soil pH (6.0-7.0)",
        "Incorporate organic phosphorus sources"
      ],
      treatment: {
        chemical: ["DAP (18-46-0)", "TSP (Triple Super Phosphate)", "MAP (Monoammonium Phosphate)"],
        biological: ["Phosphate-solubilizing bacteria", "Mycorrhizal fungi"],
        cultural: ["Apply phosphorus before planting", "Use band application for efficiency", "Maintain soil pH for availability"]
      },
      economicImpact: "Reduces yield by 20-40%, affects root development"
    }
  };

  /**
   * Identify pest/disease based on symptoms
   */
  identifyFromSymptoms(cropType: string, symptoms: string[]): PestDiseaseIdentification[] {
    const identifications: PestDiseaseIdentification[] = [];

    Object.values(this.pestDiseaseDatabase).forEach(pest => {
      if (pest.affectedCrops.includes(cropType)) {
        const matchingSymptoms = pest.symptoms.filter(s =>
          symptoms.some(sym => sym.toLowerCase().includes(s.symptom.toLowerCase()))
        );

        if (matchingSymptoms.length > 0) {
          identifications.push(pest);
        }
      }
    });

    return identifications;
  }

  /**
   * Get pest/disease information by name
   */
  getPestDiseaseInfo(name: string): PestDiseaseIdentification | null {
    return this.pestDiseaseDatabase[name] || null;
  }

  /**
   * Get pest/disease prevention checklist for a crop
   */
  getPreventionChecklist(cropType: string): {
    pestPrevention: string[];
    diseasePrevention: string[];
    generalSanitation: string[];
  } {
    const cropPests = Object.values(this.pestDiseaseDatabase).filter(p =>
      p.affectedCrops.includes(cropType)
    );

    const pestPrevention = new Set<string>();
    const diseasePrevention = new Set<string>();
    const generalSanitation = new Set<string>();

    cropPests.forEach(pest => {
      if (pest.type === "pest") {
        pest.prevention.forEach(p => pestPrevention.add(p));
      } else if (pest.type === "disease") {
        pest.prevention.forEach(p => diseasePrevention.add(p));
      }

      // General sanitation applies to all
      pest.prevention.forEach(p => {
        if (p.toLowerCase().includes("remove") || p.toLowerCase().includes("clean") || p.toLowerCase().includes("debris")) {
          generalSanitation.add(p);
        }
      });
    });

    return {
      pestPrevention: Array.from(pestPrevention),
      diseasePrevention: Array.from(diseasePrevention),
      generalSanitation: Array.from(generalSanitation)
    };
  }

  /**
   * Get integrated pest management (IPM) strategy
   */
  getIPMStrategy(cropType: string): {
    monitoring: string[];
    prevention: string[];
    interventionThresholds: { pest: string; threshold: string; action: string }[];
    treatmentHierarchy: string[];
  } {
    return {
      monitoring: [
        "Weekly field scouting for pest and disease symptoms",
        "Use yellow sticky traps for flying insects",
        "Monitor weather conditions favorable to outbreaks",
        "Keep detailed records of pest pressure",
        "Use pheromone traps for specific pests"
      ],
      prevention: [
        "Use resistant crop varieties",
        "Practice crop rotation",
        "Maintain proper plant spacing",
        "Ensure optimal soil fertility",
        "Encourage beneficial insects"
      ],
      interventionThresholds: [
        { pest: "Fall Armyworm", threshold: "5% plants with larvae", action: "Initiate biological control" },
        { pest: "Aphids", threshold: "10% plants infested", action: "Apply biological controls" },
        { pest: "Late Blight", threshold: "First symptoms detected", action: "Apply fungicide immediately" }
      ],
      treatmentHierarchy: [
        "1. Cultural controls (removal, sanitation)",
        "2. Biological controls (beneficial insects, biopesticides)",
        "3. Botanical pesticides (neem, pyrethrum)",
        "4. Synthetic pesticides (as last resort)"
      ]
    };
  }

  /**
   * Get seasonal pest pressure forecast
   */
  getSeasonalPestForecast(season: "wet" | "dry", cropType: string): {
    highRiskPests: string[];
    mediumRiskPests: string[];
    lowRiskPests: string[];
    monitoringFocus: string[];
  } {
    const wetSeasonPests = ["late_blight", "powdery_mildew", "aphids"];
    const drySeasonPests = ["fall_armyworm", "aphids"];

    const cropPests = Object.keys(this.pestDiseaseDatabase).filter(key =>
      this.pestDiseaseDatabase[key].affectedCrops.includes(cropType)
    );

    const seasonPests = season === "wet" ? wetSeasonPests : drySeasonPests;

    const highRiskPests = cropPests.filter(p => seasonPests.includes(p));
    const mediumRiskPests = cropPests.filter(p => !seasonPests.includes(p));
    const lowRiskPests: string[] = [];

    return {
      highRiskPests: highRiskPests.map(p => this.pestDiseaseDatabase[p].name),
      mediumRiskPests: mediumRiskPests.map(p => this.pestDiseaseDatabase[p].name),
      lowRiskPests,
      monitoringFocus: season === "wet"
        ? ["Fungal disease monitoring", "Humidity management", "Drainage inspection"]
        : ["Insect pest monitoring", "Irrigation management", "Heat stress monitoring"]
    };
  }
}

export const pestDiseaseDetector = new PestDiseaseDetector();