import { arieGroqApiKey } from "@/lib/arie/config"
import { arieLog } from "@/lib/arie/log"
import { getGovernorSnapshot, recordUsage } from "@/lib/arie/cost-governor"

/** Rough Groq chat cost estimate ($ / 1M tokens) — config later. */
const GROQ_USD_PER_MTOKEN = 0.05

export type GroqJsonResult =
  | {
      ok: true
      json: unknown
      model: string
      usage: { promptTokens: number; completionTokens: number }
      generationMs: number
    }
  | { ok: false; reason: string }

/**
 * Sprint 1 Groq client stub — JSON chat completions with cost metering.
 * Disabled cleanly when GROQ_API_KEY / budget band blocks paid calls.
 */
export async function groqJsonCompletion(opts: {
  model?: string
  system: string
  user: string
  operation: string
}): Promise<GroqJsonResult> {
  const key = arieGroqApiKey()
  if (!key) {
    await arieLog("warn", "groq", "missing_api_key", { operation: opts.operation })
    return { ok: false, reason: "missing_api_key" }
  }

  const snap = await getGovernorSnapshot()
  if (!snap.allowPaidCalls) {
    await arieLog("warn", "groq", "blocked_by_governor", { band: snap.band })
    return { ok: false, reason: "budget_exhausted" }
  }

  const model = opts.model ?? process.env.ARIE_GROQ_MODEL ?? "llama-3.3-70b-versatile"
  const started = Date.now()
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    await arieLog("error", "groq", "request_failed", { status: res.status, body: body.slice(0, 500) })
    return { ok: false, reason: `groq_http_${res.status}` }
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const generationMs = Date.now() - started
  const content = data.choices?.[0]?.message?.content ?? "{}"
  const promptTokens = data.usage?.prompt_tokens ?? 0
  const completionTokens = data.usage?.completion_tokens ?? 0
  const total = promptTokens + completionTokens
  const estimatedCostUsd = (total / 1_000_000) * GROQ_USD_PER_MTOKEN

  await recordUsage({
    provider: "GROQ",
    operation: opts.operation,
    units: total,
    estimatedCostUsd,
    metadata: { model, promptTokens, completionTokens, generationMs },
  })

  try {
    return {
      ok: true,
      json: JSON.parse(content) as unknown,
      model,
      usage: { promptTokens, completionTokens },
      generationMs,
    }
  } catch {
    await arieLog("error", "groq", "invalid_json", { content: content.slice(0, 300) })
    return { ok: false, reason: "invalid_json" }
  }
}
