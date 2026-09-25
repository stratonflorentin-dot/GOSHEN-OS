# 16 — AI / RAG Architecture

## 1. Principles

1. **Retrieve before answering.** Farm questions are answered from the farm's
   own data; specialized agronomy questions from the approved knowledge base.
   No retrieval → no specialized answer.
2. **Never invent.** If evidence is insufficient, the assistant says so and
   states what data would be needed.
3. **Show your work.** Every answer exposes: the data/functions used, evidence
   snippets, citations with source/date/link, and a confidence level.
4. **Safety boundaries** (hard): no disease diagnosis, no medication dosage,
   no chemical application rates, no fertilizer prescriptions presented as
   instruction; veterinary topics → informational guidance + "consult a
   veterinarian."

## 2. Components

```
User question (assistant UI)
   → aiService (server-only Route Handler /api/v1/ai/ask, rate-limited)
      1. Guardrails: classify question; refuse out-of-bounds asks
      2. Farm-data retrieval: WHITELISTED analytics functions only
         (e.g., plotProfitability(), batchEconomics(), inventoryLowStock(),
          expenseSummary(), seasonComparison(), yieldTrends())
         — parameterized, RLS-scoped to caller's org. NO free-text SQL.
      3. Knowledge retrieval (when agronomic knowledge is relevant):
         pgvector similarity search over knowledge_chunks
         (filtered by crop/species/country/topic metadata)
      4. LLM synthesis with strict prompt contract (below)
      5. Persist ai_queries / ai_responses / ai_citations (audit)
   → Answer + Evidence panel (citations, data tables, confidence)
```

### Prompt contract (system-level, enforced)
- Answer only from provided `FARM_DATA` and `KNOWLEDGE` blocks; never from
  prior knowledge for farm-specific numbers.
- Cite as `[K1]`, `[K2]`… for knowledge chunks and `[D1]`… for farm data refs.
- If data is missing → state exactly what is missing (e.g., "no harvest
  records for Season 2025 on Plot A01").
- Health/chemical topics: informational framing, cite approved sources,
  recommend qualified professional; forbidden to output dosages/rates.
- Output JSON: `{answer_markdown, citations[], confidence, uncertainty_notes,
  suggested_next_investigations[]}`.

## 3. Knowledge Base (RAG)

### Ingestion pipeline
```
knowledge_sources (registry: government agencies, FAO, universities,
                   research institutions, vet authorities, peer-reviewed)
  → knowledge_documents (title, publisher, date, url, crops[], species[],
                         country, topics[], content_hash dedupe)
  → chunking (semantic ~500 tokens, overlap)
  → knowledge_chunks (content, embedding vector(1536), topics[])
```
- Ingestion jobs validate source trust level; only `official`/`recognized`
  sources are citable for health/chemical topics.
- Curator UI (platform admin) reviews new documents before activation.
- Stale/duplicate handling via `content_hash`; documents carry publication
  dates shown in citations.

### Retrieval
- Hybrid: pgvector cosine similarity + topic/metadata filters (crop, species,
  country='TZ', language en/sw); top-k with reranking (Phase 10 refinement).
- Chunks returned to the LLM with document metadata for citation display.

## 4. Farm-Data Tool Layer

Whitelisted functions (server-side, `aiService` calls the same services the
UI uses — authorization identical):

| Tool | Answers |
|---|---|
| `plotProfitability(plotId?, seasonId?)` | profit/cost/revenue per plot/season |
| `cropSeasonSummary(seasonId)` | activities, inputs, yield, dates |
| `batchEconomics(batchId)` | mortality, FCR, feed, cost/bird, margin |
| `expenseSummary(filters)` | spend by category/period/farm |
| `inventoryStatus(lowOnly?)` | stock levels, values, shortages |
| `laborSummary(filters)` | labor cost distribution |
| `yieldTrends(scope)` | historical comparisons |
| `weatherContext(farmId, days)` | recent/forecast conditions |

- Tool results are attached as structured `FARM_DATA` (tables), so the model
  reads numbers rather than generating them.
- `ai_queries.context_snapshot` stores which tools ran with which parameters
  — the audit trail for "why did the AI say this?"

## 5. Confidence & Uncertainty

- `confidence: high | moderate | low | insufficient_evidence` — assigned by
  rubric (data completeness, source agreement, question specificity).
- Low confidence renders a visible warning banner; `insufficient_evidence`
  renders the missing-data checklist instead of an answer.
- `suggested_next_investigations` gives the farmer concrete next steps
  (brief question #24) — derived from actual data gaps (e.g., "Plot A03 has
  no soil test on record").

## 6. Safety Enforcement

1. **Input classifier** flags health/chemical/fertilizer categories.
2. Category-specific retrieval restricted to `trust_level='official'` sources.
3. Output filter scans for dosage/rate patterns and refuses to finalize
   offending answers (regenerate with refusal framing).
4. UI labels: "Informational guidance — not a veterinary diagnosis. Consult a
   professional."
5. All AI interactions auditable (`ai_queries`/`ai_responses`); platform admin
   can review flagged conversations.

## 7. Testing

- Unit: citation mapping, refusal patterns, confidence rubric.
- Integration: golden-question suite — for each sample farm fixture, expected
  answers with exact figures + expected citations (e.g., "How much feed did
  Batch 004 consume?" must equal ledger sum).
- Red-team suite: attempts to extract other orgs' data, induce dosage advice,
  or get uncited claims — all must fail.
