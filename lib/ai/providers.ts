/**
 * AI provider adapter pattern (§34, §51).
 * The assistant talks to an LLM through this interface so the provider
 * (Groq today, another OpenAI-compatible host later) can be replaced
 * without touching application logic. A deterministic mock is used when
 * no API key is configured so the feature never silently fabricates.
 */

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiCompletion = {
  text: string;
  model: string;
  tokensUsed?: number;
};

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  complete(messages: AiMessage[], opts?: { maxTokens?: number }): Promise<AiCompletion>;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export function createGroqProvider(apiKey: string, model = "llama-3.3-70b-versatile"): AIProvider {
  return {
    name: "groq",
    model,
    async complete(messages, opts) {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: opts?.maxTokens ?? 1400,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Groq request failed (${res.status}): ${detail.slice(0, 300)}`);
      }
      const data = (await res.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error("Groq returned an empty completion");
      return {
        text,
        model: data.model ?? model,
        tokensUsed: data.usage?.total_tokens,
      };
    },
  };
}

/**
 * Deterministic fallback: summarises the supplied farm evidence into a
 * structured, clearly-scoped answer. It never invents agricultural facts —
 * it only restates what was retrieved and flags what is missing.
 */
export function createMockProvider(): AIProvider {
  return {
    name: "mock",
    model: "goshen-evidence-summary",
    async complete(messages) {
      const user = [...messages].reverse().find((m) => m.role === "user");
      const match = /<question>([\s\S]*?)<\/question>/.exec(user?.content ?? "");
      const question = match?.[1]?.trim() || "your question";
      const evidence = /<farm_data>([\s\S]*?)<\/farm_data>/.exec(user?.content ?? "")?.[1]?.trim();
      const knowledge = /<knowledge_evidence>([\s\S]*?)<\/knowledge_evidence>/.exec(
        user?.content ?? "",
      )?.[1]?.trim();
      const lines: string[] = [
        `Based on the farm records available for ${question.replace(/\?$/, "")}:`,
        "",
      ];
      if (evidence && evidence !== "(no farm data matched this question)") {
        lines.push(evidence, "");
      }
      if (knowledge && knowledge !== "(no knowledge documents matched this question)") {
        lines.push(
          "Reference evidence retrieved from the knowledge base supports reviewing these factors. See the cited sources below.",
          "",
        );
      }
      lines.push(
        "Note: the AI language model is not configured for this environment, so this is a direct summary of your farm data rather than a full agronomic analysis. Add a GROQ_API_KEY to enable the complete assistant.",
      );
      return { text: lines.join("\n"), model: "goshen-evidence-summary" };
    },
  };
}

let providerCache: AIProvider | null = null;

export function getAiProvider(): AIProvider {
  if (providerCache) return providerCache;
  const apiKey = process.env.GROQ_API_KEY;
  providerCache = apiKey ? createGroqProvider(apiKey) : createMockProvider();
  return providerCache;
}
