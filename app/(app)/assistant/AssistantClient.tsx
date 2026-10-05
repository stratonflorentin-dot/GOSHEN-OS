"use client";

import { useState, useTransition } from "react";
import { askAssistantAction } from "./actions";
import type { AiHistoryItem } from "@/services/aiService";

const SUGGESTIONS = [
  "Which enterprise generated the highest margin?",
  "How much money did I spend this season?",
  "What inventory is running low?",
  "What factors should I investigate for poor crop performance?",
  "How can I improve broiler batch profitability?",
];

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  low: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

function CitationList({ citations }: { citations: AiHistoryItem["citations"] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>
      <ul className="mt-2 space-y-2">
        {citations.map((c, i) => (
          <li key={i} className="text-xs leading-relaxed">
            <span className="font-medium text-foreground">
              {i + 1}. {c.title}
            </span>
            {c.publisher && <span className="text-muted-foreground"> — {c.publisher}</span>}
            <span className="ml-1 rounded bg-primary-50 px-1 py-0.5 text-[10px] font-medium uppercase text-primary-700 dark:bg-primary/15 dark:text-primary-200">
              {c.kind === "farm_data" ? "Farm data" : "Knowledge"}
            </span>
            {c.url && (
              <>
                {" "}
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Reference
                </a>
              </>
            )}
            {c.quote && <p className="mt-0.5 text-muted-foreground">“{c.quote}”</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnswerCard({ item }: { item: AiHistoryItem }) {
  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-semibold">{item.question}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${CONFIDENCE_STYLES[item.confidence] ?? CONFIDENCE_STYLES.medium}`}>
          {item.confidence} confidence
        </span>
      </div>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground">
        {item.answer.split("\n").filter((line) => line.trim()).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <CitationList citations={item.citations} />
    </article>
  );
}

export function AssistantClient({
  farms,
  history,
}: {
  farms: Array<{ farmId: string; name: string }>;
  history: AiHistoryItem[];
}) {
  const [question, setQuestion] = useState("");
  const [farmId, setFarmId] = useState(farms[0]?.farmId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await askAssistantAction({ farmId: farmId || undefined, question: trimmed });
      if ("error" in result) {
        setError(result.error);
      } else {
        setQuestion("");
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answers are grounded in your farm records and curated agricultural sources. Every answer shows its
          evidence. The assistant will not diagnose animal or crop disease or recommend dosages — consult a
          veterinarian or extension officer for that.
        </p>
      </header>

      <section className="card p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
          className="space-y-3"
        >
          {farms.length > 1 && (
            <label className="block text-xs font-medium text-muted-foreground">
              Farm context
              <select
                value={farmId}
                onChange={(event) => setFarmId(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary/60 focus:outline-none"
              >
                <option value="">All farms</option>
                {farms.map((farm) => (
                  <option key={farm.farmId} value={farm.farmId}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs font-medium text-muted-foreground">
            Your question
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) ask(question);
              }}
              rows={3}
              maxLength={2000}
              placeholder="e.g. Why did Plot A01 make less profit this season?"
              className="mt-1 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">Ctrl + Enter to submit</p>
            <button
              type="submit"
              disabled={pending || !question.trim()}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Analysing farm records…" : "Ask"}
            </button>
          </div>
        </form>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={pending}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent answers</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No questions yet. Ask your first question above.</p>
        ) : (
          history.map((item) => <AnswerCard key={item.queryId} item={item} />)
        )}
      </section>
    </div>
  );
}
