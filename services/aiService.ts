/**
 * AI agricultural assistant (§34, §35, §36, §37, §66).
 * Every answer is grounded in (a) the organization's own farm records and
 * (b) the curated knowledge base, and every response records its citations.
 * The assistant must never invent diagnoses, dosages or application rates;
 * when evidence is insufficient it says so (§37).
 */

import { withUser, type SqlExecutor } from "@/lib/db";
import { getAiProvider } from "@/lib/ai/providers";
import { listFarmGeo } from "@/services/farmService";
import { listPlots } from "@/services/plotService";
import { listCropSeasons } from "@/services/cropService";
import { listLivestockBatches } from "@/services/livestockService";
import { getFinancialSummary } from "@/services/financeService";

export type AiCitation = {
  kind: "knowledge" | "farm_data";
  title: string;
  publisher: string | null;
  url: string | null;
  quote: string | null;
};

export type AiAnswer = {
  queryId: string;
  answer: string;
  provider: string;
  model: string;
  confidence: "low" | "medium" | "high";
  uncertaintyNote: string | null;
  citations: AiCitation[];
};

export type AiHistoryItem = {
  queryId: string;
  question: string;
  answer: string;
  provider: string;
  confidence: string;
  createdAt: string;
  citations: AiCitation[];
};

const MAX_QUESTION_LENGTH = 2000;

function summarizeRow(label: string, fields: Record<string, unknown>): string | null {
  const parts = Object.entries(fields)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${String(v)}`);
  return parts.length ? `- ${label}: ${parts.join("; ")}` : null;
}

async function buildFarmContext(
  userId: string,
  organizationId: string,
  farmId: string | null,
): Promise<{ text: string; farmsReferenced: string[] }> {
  const farms = await listFarmGeo(userId, organizationId);
  const scoped = farmId ? farms.filter((f) => f.farmId === farmId) : farms;
  const farmIds = scoped.map((f) => f.farmId);
  if (farmIds.length === 0) {
    return { text: "(no farms match this request)", farmsReferenced: [] };
  }

  const sections: string[] = [];

  sections.push(
    "FARMS\n" +
      scoped
        .map((f) =>
          summarizeRow(f.name, {
            area_m2: f.areaM2,
            centroid: f.centroidLat !== null && f.centroidLng !== null
              ? `${f.centroidLat.toFixed(4)}, ${f.centroidLng.toFixed(4)}`
              : null,
          }) ?? `- ${f.name}: (no details)`,
        )
        .join("\n"),
  );

  const plots = await listPlots(userId, organizationId, farmId ?? undefined);
  if (plots.length) {
    sections.push(
      "PLOTS\n" +
        plots
          .slice(0, 40)
          .map((p) =>
            summarizeRow(`${p.name} (${p.code})`, {
              type: p.plotType,
              land_use: p.landUse,
              area_m2: p.areaM2,
              soil_texture: p.soilTexture,
              irrigation: p.irrigationType,
              status: p.status,
            }),
          )
          .filter(Boolean)
          .join("\n"),
    );
  }

  const cropSeasons = await listCropSeasons(userId, organizationId, farmId ?? undefined);
  if (cropSeasons.length) {
    sections.push(
      "CROP SEASONS\n" +
        cropSeasons
          .slice(0, 30)
          .map((s) =>
            summarizeRow(`${s.cropName ?? "Crop"}${s.varietyName ? ` / ${s.varietyName}` : ""}`, {
              season: s.seasonName,
              plot: s.plotId ? (plots.find((p) => p.id === s.plotId)?.code ?? s.plotId.slice(0, 8)) : null,
              planting_date: s.plantingDate,
              expected_harvest: s.expectedHarvestDate,
              actual_harvest: s.actualHarvestDate,
              target_yield_kg: s.targetYieldKg,
              actual_yield_kg: s.actualYieldKg,
              status: s.status,
            }),
          )
          .filter(Boolean)
          .join("\n"),
    );
  }

  const batches = await listLivestockBatches(userId, organizationId, farmId ?? undefined);
  if (batches.length) {
    sections.push(
      "LIVESTOCK BATCHES\n" +
        batches
          .slice(0, 30)
          .map((b) =>
            summarizeRow(b.batchCode, {
              status: b.status,
              start_date: b.startDate,
              unit: b.unit,
              initial: b.initialQuantity,
              current: b.currentQuantity,
              mortality: b.mortalityCount,
              breed: b.breed,
            }),
          )
          .filter(Boolean)
          .join("\n"),
    );
  }

  const finance = await getFinancialSummary(userId, organizationId);
  sections.push(
    "FINANCE (all-time)\n" +
      (summarizeRow("Summary", {
        total_revenue: finance.totalRevenue,
        total_expenses: finance.totalExpenses,
        net_profit: finance.netProfit,
        cash_balance: finance.cashBalance,
      }) ?? "(no financial records)"),
  );

  return {
    text: sections.join("\n\n"),
    farmsReferenced: scoped.map((f) => f.name),
  };
}

type KnowledgeHit = {
  chunkId: string;
  documentTitle: string;
  content: string;
  sourceTitle: string;
  publisher: string;
  url: string | null;
};

async function retrieveKnowledge(db: SqlExecutor, question: string): Promise<KnowledgeHit[]> {
  const hits = await db`
    select c.id as chunk_id,
           d.title as document_title,
           c.content,
           s.title as source_title,
           s.publisher,
           s.url
    from public.knowledge_chunks c
    join public.knowledge_documents d on d.id = c.document_id
    join public.knowledge_sources s on s.id = c.source_id
    where to_tsvector('english', c.content) @@ websearch_to_tsquery('english', ${question})
    order by ts_rank(to_tsvector('english', c.content), websearch_to_tsquery('english', ${question})) desc
    limit 6
  `;
  return hits.map((r) => ({
    chunkId: r.chunk_id as string,
    documentTitle: r.document_title as string,
    content: r.content as string,
    sourceTitle: r.source_title as string,
    publisher: r.publisher as string,
    url: (r.url as string | null) ?? null,
  }));
}

const SYSTEM_PROMPT = `You are the GOSHEN OS agricultural assistant. You answer questions about the user's farm operation using ONLY the evidence provided in the prompt (farm data records and knowledge base excerpts).

Strict rules:
1. Use farm data before general knowledge. Always show the concrete numbers you relied on.
2. Never invent farm records, prices, measurements, or outcomes that are not in the evidence.
3. Never provide specific medical diagnoses, medication dosages, veterinary treatment plans, pesticide application rates, or fertilizer application rates. Instead, describe the situation, suggest what to investigate, and recommend consulting a qualified veterinarian or agricultural extension officer. This includes livestock disease, crop disease, and chemical safety questions.
4. If the evidence is insufficient to answer, say exactly what data is missing and how to record it in GOSHEN OS.
5. Cite the knowledge sources you used by title and publisher.
6. Structure answers as: direct answer first, then supporting evidence (bullet points with numbers), then uncertainty or missing data if any.
7. Communicate uncertainty plainly. Never claim certainty the data does not support.`;

export async function askAssistant(
  userId: string,
  input: { organizationId: string; farmId?: string | null; question: string },
): Promise<AiAnswer> {
  const question = input.question.trim();
  if (!question) throw new Error("Question is required");
  if (question.length > MAX_QUESTION_LENGTH) {
    throw new Error(`Question must be at most ${MAX_QUESTION_LENGTH} characters`);
  }

  const [farmContext, provider] = [await buildFarmContext(userId, input.organizationId, input.farmId ?? null), getAiProvider()];

  const knowledge = await withUser(userId, (db) => retrieveKnowledge(db, question));

  const knowledgeBlock = knowledge.length
    ? knowledge
        .map((k, i) => `[${i + 1}] ${k.documentTitle} — ${k.publisher}\n${k.content}`)
        .join("\n\n")
    : "(no knowledge documents matched this question)";

  const completion = await provider.complete([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `<farm_data>\n${farmContext.text}\n</farm_data>`,
        `<knowledge_evidence>\n${knowledgeBlock}\n</knowledge_evidence>`,
        `<question>${question}</question>`,
      ].join("\n\n"),
    },
  ]);

  const text = completion.text;
  const lowEvidence =
    farmContext.text.includes("(no farms match this request)") && knowledge.length === 0;
  const confidence: AiAnswer["confidence"] = lowEvidence ? "low" : knowledge.length ? "high" : "medium";
  const uncertaintyNote = lowEvidence
    ? "No farm records or knowledge-base documents matched this question. The answer may not reflect your actual operation."
    : knowledge.length === 0
      ? "Answer is based on farm records only; no curated agricultural sources matched this question."
      : null;

  // Persist the full audit trail: query, response, citations.
  const result = await withUser(userId, async (db) => {
    const [query] = await db`
      insert into public.ai_queries (organization_id, farm_id, user_id, question)
      values (${input.organizationId}, ${input.farmId ?? null}, ${userId}, ${question})
      returning id
    `;
    const [response] = await db`
      insert into public.ai_responses (query_id, provider, model, answer, confidence, uncertainty_note, tokens_used)
      values (${query.id}, ${provider.name}, ${completion.model}, ${text}, ${confidence}, ${uncertaintyNote}, ${completion.tokensUsed ?? null})
      returning id
    `;

    const citationRows: AiCitation[] = [];
    for (const k of knowledge) {
      await db`
        insert into public.ai_citations (response_id, chunk_id, kind, title, publisher, url, quote)
        values (${response.id}, ${k.chunkId}, 'knowledge', ${k.documentTitle}, ${k.publisher}, ${k.url}, ${k.content.slice(0, 300)})
      `;
      citationRows.push({
        kind: "knowledge",
        title: k.documentTitle,
        publisher: k.publisher,
        url: k.url,
        quote: k.content.slice(0, 300),
      });
    }
    await db`
      insert into public.ai_citations (response_id, kind, title, quote)
      values (${response.id}, 'farm_data', ${"Your farm records in GOSHEN OS"}, ${farmContext.text.slice(0, 300)})
    `;
    citationRows.push({
      kind: "farm_data",
      title: "Your farm records in GOSHEN OS",
      publisher: null,
      url: null,
      quote: farmContext.text.slice(0, 300),
    });

    return {
      queryId: query.id as string,
      answer: text,
      provider: provider.name,
      model: completion.model,
      confidence,
      uncertaintyNote,
      citations: citationRows,
    } satisfies AiAnswer;
  });

  return result;
}

export async function listAiHistory(
  userId: string,
  organizationId: string,
  limit = 20,
): Promise<AiHistoryItem[]> {
  return withUser(userId, async (db) => {
    const rows = await db`
      select q.id as query_id, q.question, q.created_at,
             r.provider, r.answer, r.confidence
      from public.ai_queries q
      join public.ai_responses r on r.query_id = q.id
      where q.organization_id = ${organizationId}
      order by q.created_at desc
      limit ${limit}
    `;
    const items: AiHistoryItem[] = [];
    for (const row of rows) {
      const citations = await db`
        select kind, title, publisher, url, quote
        from public.ai_citations
        where response_id = (select id from public.ai_responses where query_id = ${row.query_id} order by created_at desc limit 1)
      `;
      items.push({
        queryId: row.query_id as string,
        question: row.question as string,
        answer: row.answer as string,
        provider: row.provider as string,
        confidence: row.confidence as string,
        createdAt: (row.created_at as Date).toISOString(),
        citations: citations.map((c) => ({
          kind: c.kind as AiCitation["kind"],
          title: c.title as string,
          publisher: (c.publisher as string | null) ?? null,
          url: (c.url as string | null) ?? null,
          quote: (c.quote as string | null) ?? null,
        })),
      });
    }
    return items;
  });
}
