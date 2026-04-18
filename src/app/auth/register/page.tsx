"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { validateSignUpData } from "@/lib/validation"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const { isValid, errors } = validateSignUpData({ email: email.trim(), password })
    if (!isValid) {
      setError(errors.email || errors.password || "Invalid input")
      return
    }
    setLoading(true)
    try {
      const normalized = email.trim().toLowerCase()
      const reg = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, password }),
      })
      const data = await reg.json().catch(() => ({}))
      if (!reg.ok) {
        setError(data.fields?.email || data.fields?.password || data.error || "Registration failed")
        return
      }
      const signInRes = await signIn("credentials", {
        email: normalized,
        password,
        redirect: false,
      })
      if (signInRes?.error) {
        setError("Registered — please sign in.")
        return
      }
      window.location.href = "/dashboard"
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md space-y-6 border border-white/10 rounded-xl p-8 bg-white/5">
        <h1 className="text-2xl font-semibold text-center">Create account</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-white/20 bg-black px-3 py-2"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full rounded-md border border-white/20 bg-black px-3 py-2"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Register"}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[#FFD700] underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
