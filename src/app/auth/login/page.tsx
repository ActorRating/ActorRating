"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { validateEmail, validatePassword } from "@/lib/validation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const eCheck = validateEmail(email)
    const pCheck = validatePassword(password)
    if (!eCheck.isValid) {
      setError(eCheck.error || "Invalid email")
      return
    }
    if (!pCheck.isValid) {
      setError(pCheck.error || "Invalid password")
      return
    }
    setLoading(true)
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })
      if (res?.error) {
        setError("Invalid email or password")
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
        <h1 className="text-2xl font-semibold text-center">Log in</h1>
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
              autoComplete="current-password"
              className="w-full rounded-md border border-white/20 bg-black px-3 py-2"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-400">
          No account?{" "}
          <Link href="/auth/register" className="text-[#FFD700] underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
