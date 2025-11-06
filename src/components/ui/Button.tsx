"use client"

import { ButtonHTMLAttributes, forwardRef, ReactElement, cloneElement } from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "premium"
  size?: "sm" | "md" | "lg"
  asChild?: boolean
  noMotion?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild = false, noMotion = false, children, ...props }, ref) => {
    const buttonClasses = cn(
      "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:scale-105 active:scale-95",
      {
        "bg-primary text-primary-foreground hover:bg-accent premium-shadow": variant === "default",
        "border border-border bg-secondary text-secondary-foreground hover:bg-muted hover:border-primary premium-shadow": variant === "outline",
        "text-secondary-foreground hover:bg-secondary hover:text-foreground": variant === "ghost",
        "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary premium-shadow": variant === "premium",
        "h-8 px-3 text-sm": size === "sm",
        "h-10 px-4 py-2": size === "md",
        "h-12 px-6 text-lg": size === "lg",
      },
      className
    )

    if (asChild && children) {
      const child = children as ReactElement
      const existingClassName = (child.props as any)?.className || ''
      return cloneElement(child, {
        className: cn(buttonClasses, existingClassName),
        ref,
        ...props
      } as any)
    }

    return (
      <button
        className={buttonClasses}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"