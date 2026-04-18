export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { validateSignUpData } from "@/lib/validation"
import { checkRateLimit } from "@/lib/rateLimit"

const BCRYPT_ROUNDS = 12

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
    const limited = await checkRateLimit(ip, "signup")
    if (!limited.allowed) {
      return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429 })
    }

    const body = await request.json()
    const emailRaw = typeof body.email === "string" ? body.email.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    const { isValid, errors } = validateSignUpData({ email: emailRaw, password })
    if (!isValid) {
      return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 400 })
    }

    const email = emailRaw.toLowerCase()

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
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
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
