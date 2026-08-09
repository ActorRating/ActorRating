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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status === 437 || status >= 500
}

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
  const maxAttempts = 3
  const perAttemptMs = Number(process.env.ARIE_GROQ_TIMEOUT_MS ?? 25_000)
  let lastStatus = 0
  let lastBody = ""

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response
    try {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(perAttemptMs),
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
    } catch (err) {
      const timedOut =
        (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) ||
        (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "TimeoutError")
      await arieLog("error", "groq", timedOut ? "request_timeout" : "request_network_error", {
        attempt,
        error: err instanceof Error ? err.message : String(err),
      })
      if (attempt < maxAttempts) {
        await sleep(400 * attempt * attempt)
        continue
      }
      return { ok: false, reason: timedOut ? "groq_timeout" : "groq_network_error" }
    }

    if (!res.ok) {
      lastStatus = res.status
      lastBody = await res.text().catch(() => "")
      await arieLog("error", "groq", "request_failed", {
        status: res.status,
        body: lastBody.slice(0, 500),
        attempt,
      })
      if (attempt < maxAttempts && shouldRetryStatus(res.status)) {
        const retryAfter = Number(res.headers.get("retry-after") || "0")
        // Cap wait so admin eval UI cannot freeze for minutes on 429
        const waitMs = Math.min(8_000, Math.max(retryAfter * 1000, 400 * attempt * attempt))
        await sleep(waitMs)
        continue
      }
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
      metadata: { model, promptTokens, completionTokens, generationMs, attempt },
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

  await arieLog("error", "groq", "retries_exhausted", {
    status: lastStatus,
    body: lastBody.slice(0, 300),
  })
  return { ok: false, reason: `groq_http_${lastStatus || "unknown"}` }
}
