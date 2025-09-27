"use client"

export const dynamic = "force-dynamic"

import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { HomeLayout } from "@/components/layout"

export default function NotFound() {
  return (
    <HomeLayout>
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-muted-foreground mb-6">
            Page Not Found
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/">
            <Button size="lg">
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </HomeLayout>
  )
}
