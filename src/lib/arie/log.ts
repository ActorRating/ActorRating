import { prisma } from "@/lib/prisma"

type LogLevel = "debug" | "info" | "warn" | "error"

/**
 * Structured ARIE logging — console + durable ArieLog rows (best-effort).
 */
export async function arieLog(
  level: LogLevel,
  scope: string,
  message: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const line = `[arie:${scope}] ${message}`
  if (level === "error") console.error(line, data ?? "")
  else if (level === "warn") console.warn(line, data ?? "")
  else console.log(line, data ?? "")

  try {
    await prisma.arieLog.create({
      data: {
        level,
        scope,
        message,
        data: data ?? undefined,
      },
    })
  } catch (err) {
    // Never throw from logger (e.g. pre-migrate).
    console.error("[arie:log] persist failed", err)
  }
}
