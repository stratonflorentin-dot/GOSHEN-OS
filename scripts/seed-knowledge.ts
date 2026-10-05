/**
 * Seeds the AI knowledge base with reference documents from recognized
 * agricultural institutions (§35). Content is deliberately general,
 * well-established agronomy — the assistant is forbidden from giving
 * specific dosages or treatment plans regardless of source (§37).
 *
 * Run: node --experimental-strip-types scripts/seed-knowledge.ts
 */

import { join } from "node:path";
import { readFileSync } from "node:fs";

function loadEnv(file: string): Record<string, string> {
  try {
    const raw = readFileSync(join(process.cwd(), file), "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}
for (const [key, value] of Object.entries({ ...loadEnv(".env.local"), ...process.env })) {
  if (process.env[key] === undefined) process.env[key] = value;
}

type SeedDoc = {
  source: {
    title: string;
    publisher: string;
    url: string;
    crop?: string;
    animalSpecies?: string;
    countryRegion?: string;
    topic: string;
  };
  content: string;
};

const DOCS: SeedDoc[] = [
  {
    source: {
      title: "Maize crop production and agronomy guidance",
      publisher: "FAO (Food and Agriculture Organization of the United Nations)",
      url: "https://www.fao.org/land-water/databases-and-software/crop-information/maize/en/",
      crop: "Maize",
      topic: "crop_production",
    },
    content: `Maize is a warm-season cereal grown widely in East Africa during the main rainy season. It performs best with well-distributed rainfall of roughly 500-800 mm across the growing period and fails under prolonged drought, especially at flowering. Timely land preparation and planting at the onset of rains improves establishment. Nitrogen response is usually highest when application is split between planting and the rapid-growth stage, subject to a soil or tissue test. Rotating maize with legumes such as beans, cowpeas or groundnuts improves soil nitrogen status and helps break pest and disease cycles that build up under continuous maize. Common maize constraints in the region include fall armyworm, stalk borers, maize streak virus, striga, and low soil fertility. Growth duration for common tropical varieties ranges from about 90 to 150 days depending on variety and altitude. Yield is strongly related to plant population, weed control in the first six weeks, and soil fertility. Always follow label instructions and local extension advice for any agrochemical use.`,
  },
  {
    source: {
      title: "Conservation agriculture and soil health principles",
      publisher: "FAO (Food and Agriculture Organization of the United Nations)",
      url: "https://www.fao.org/conservation-agriculture/en/",
      topic: "soil_management",
    },
    content: `Conservation agriculture rests on three interlinked principles: minimum mechanical soil disturbance, permanent organic soil cover, and diversification of crop species through rotations or associations. Together they reduce erosion, improve soil organic matter and water infiltration, and support beneficial soil biology over time. Soil health assessment commonly considers pH, organic matter, nitrogen, phosphorus, potassium, texture and drainage; measurements should come from laboratory analysis rather than visual estimates, because symptoms of acidity, salinity and nutrient deficiency frequently overlap. Liming decisions in the tropics should be based on measured soil pH and exchangeable acidity, not on guesswork. Adding compost, manure or crop residues increases organic matter but quantities and nutrient content vary widely, so nutrient contributions should be estimated conservatively.`,
  },
  {
    source: {
      title: "Poultry production and broiler management overview",
      publisher: "FAO (Food and Agriculture Organization of the United Nations)",
      url: "https://www.fao.org/poultry-production/en/",
      animalSpecies: "Chickens",
      topic: "livestock_production",
    },
    content: `Commercial broiler production tracks birds in batches from chick arrival to sale. Key performance indicators include mortality percentage, feed conversion ratio (feed consumed per kilogram of live weight), and average daily weight gain. Feed is usually supplied in starter, grower and finisher phases matched to the birds' age and nutritional needs. Clean water must be available at all times; water consumption roughly tracks feed consumption and drops sharply when birds are sick, so a sudden change is an early warning sign. Brooding temperature, stocking density, ventilation and litter quality strongly influence uniformity and health. Recording daily mortality with causes, feed deliveries, and water behaviour makes it possible to diagnose management problems later. Any suspected disease outbreak requires prompt consultation with a qualified veterinarian or government veterinary officer; do not begin medication without professional diagnosis, because incorrect treatment wastes money and can worsen outbreaks.`,
  },
  {
    source: {
      title: "Small-scale irrigation and water management guidance",
      publisher: "FAO (Food and Agriculture Organization of the United Nations)",
      url: "https://www.fao.org/land-water/water/water-management/en/",
      topic: "irrigation",
    },
    content: `Irrigation scheduling should be based on crop water requirements, soil water-holding capacity, and rainfall, rather than on a fixed calendar. Over-irrigation wastes water and energy, leaches nutrients, and can waterlog roots; under-irrigation during critical stages such as flowering and grain fill reduces yield disproportionately. Simple water-balance bookkeeping (rainfall plus irrigation minus evaporation and drainage) is adequate for most smallholder planning. Water sources should be tested for salinity and contamination when first used and periodically thereafter. Recording each irrigation event — date, duration, estimated volume, and energy or fuel cost — allows per-plot water economics to be calculated and compared with yield outcomes.`,
  },
  {
    source: {
      title: "Extension guidance for crop pest and disease management",
      publisher: "Tanzania Ministry of Agriculture / agricultural extension services",
      url: "https://www.kilimo.go.tz/",
      countryRegion: "Tanzania",
      topic: "crop_protection",
    },
    content: `Integrated pest management (IPM) prioritizes prevention and monitoring before chemical control: crop rotation, field sanitation, resistant varieties, timely planting, and regular scouting to identify problems early. Scout fields at least weekly and record observations with photos, dates and locations so patterns can be analysed. Correct identification of a pest or disease is essential before any control measure; many symptoms (leaf spots, wilting, stunting) have several unrelated causes with different remedies. When chemical control is justified, always read and follow the product label, use registered products, observe pre-harvest intervals and wear protective equipment. Suspected new or spreading pests and diseases should be reported to local agricultural extension officers, who can confirm identification and recommend registered control options for your area.`,
  },
  {
    source: {
      title: "Farm financial record-keeping for smallholder profitability",
      publisher: "FAO (Food and Agriculture Organization of the United Nations)",
      url: "https://www.fao.org/farm-management/en/",
      topic: "farm_economics",
    },
    content: `Profitability analysis requires matching the costs of a specific production activity — land preparation, inputs, labour, irrigation, harvest, transport — to the revenue it generates. Gross margin is revenue minus variable costs for an enterprise; it ignores fixed costs but is the standard first comparison between enterprises such as maize versus beans, or broiler batches. Cost records should capture date, item, quantity, unit price, and the plot, crop season or livestock batch the cost belongs to; costs that cannot be attributed should be recorded at farm level. Comparing cost per hectare, yield per hectare and price received across seasons reveals whether a change in profit came from production, spending, or market prices. Cash is not profit: record when money actually moves (cash flow) separately from when income and costs are incurred (accrual), and reconcile inventory consumption against purchases so inputs are charged to the activity that used them.`,
  },
];

async function seedKnowledge() {
  // Import after env loading so lib/db reads the real connection URL.
  const { sql } = await import("@/lib/db");
  console.log("Seeding AI knowledge base...");
  for (const doc of DOCS) {
    const s = doc.source;
    const [source] = await sql`
      insert into public.knowledge_sources (title, publisher, url, crop, animal_species, country_region, topic)
      values (${s.title}, ${s.publisher}, ${s.url}, ${s.crop ?? null}, ${s.animalSpecies ?? null}, ${s.countryRegion ?? null}, ${s.topic})
      on conflict (title, publisher) do update set url = excluded.url
      returning id
    `;
    const existing = await sql`
      select id from public.knowledge_documents where source_id = ${source.id} limit 1
    `;
    if (existing.length > 0) {
      console.log(`  skipped (already seeded): ${s.title}`);
      continue;
    }
    await sql`
      insert into public.knowledge_documents (source_id, title, content)
      values (${source.id}, ${s.title}, ${doc.content})
    `;
  }
  console.log(`Knowledge base ready (${DOCS.length} documents).`);
}

seedKnowledge()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
