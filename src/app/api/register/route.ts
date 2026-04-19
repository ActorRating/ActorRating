export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { validateSignUpData } from "@/lib/validation"
import { checkRateLimit } from "@/lib/rateLimit"

const BCRYPT_ROUNDS = 12

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    try {
      const limited = await checkRateLimit(ip, "signup")
      if (!limited.allowed) {
        return NextResponse.json(
          { error: "Too many registration attempts. Try again later." },
          { status: 429 },
        )
      }
    } catch (rateErr) {
      console.error("[register] rate limit check failed (allowing request):", rateErr)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const emailRaw = typeof body === "object" && body !== null && "email" in body && typeof (body as { email: unknown }).email === "string" ? (body as { email: string }).email.trim() : ""
    const password =
      typeof body === "object" && body !== null && "password" in body && typeof (body as { password: unknown }).password === "string"
        ? (body as { password: string }).password
        : ""

    const { isValid, errors } = validateSignUpData({ email: emailRaw, password })
    if (!isValid) {
      return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 400 })
    }

    const email = emailRaw.toLowerCase()

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true },
    })
    if (existing) {
      if (!existing.password) {
        return NextResponse.json(
          {
            error: "This email is already registered with Google. Sign in with Google instead.",
            code: "google_only",
          },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    await prisma.user.create({
      data: {
        email,
        password: passwordHash,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[register]", e)

    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
      }
      if (e.code === "P2021" || e.code === "P1001") {
        return NextResponse.json(
          {
            error: "Database is not ready. Run migrations (e.g. npx prisma migrate deploy) and check DATABASE_URL.",
            code: e.code,
          },
          { status: 503 },
        )
      }
    }

    const isDev = process.env.NODE_ENV !== "production"
    const message = e instanceof Error ? e.message : "Registration failed"

    return NextResponse.json(
      {
        error: "Registration failed",
        ...(isDev ? { debug: message } : {}),
      },
      { status: 500 },
    )
  }
}
