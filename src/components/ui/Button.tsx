import { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"
import { Slot } from "@radix-ui/react-slot"
import { motion } from "framer-motion"
import { scaleIn } from "@/lib/animations"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "premium"
  size?: "sm" | "md" | "lg"
  asChild?: boolean
  noMotion?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild = false, noMotion = false, ...props }, ref) => {
    if (asChild) {
      // Do NOT pass motion props when using Slot; they would leak to DOM children
      return (
        <Slot
          className={cn(
            "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:scale-105 active:scale-95",
            {
              "bg-primary text-primary-foreground hover:bg-accent shadow-lg hover:shadow-xl": variant === "default",
              "border border-border bg-secondary text-secondary-foreground hover:bg-muted hover:border-primary": variant === "outline",
              "text-secondary-foreground hover:bg-secondary hover:text-foreground": variant === "ghost",
              "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary shadow-lg hover:shadow-xl": variant === "premium",
              "h-8 px-3 text-sm": size === "sm",
              "h-10 px-4 py-2": size === "md",
              "h-12 px-6 text-lg": size === "lg",
            },
            className
          )}
          ref={ref as any}
          {...props}
        />
      )
    }

    if (noMotion) {
      return (
        <button
          className={cn(
            "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:scale-105 active:scale-95",
            {
              "bg-primary text-primary-foreground hover:bg-accent shadow-lg hover:shadow-xl": variant === "default",
              "border border-border bg-secondary text-secondary-foreground hover:bg-muted hover:border-primary": variant === "outline",
              "text-secondary-foreground hover:bg-secondary hover:text-foreground": variant === "ghost",
              "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary shadow-lg hover:shadow-xl": variant === "premium",
              "h-8 px-3 text-sm": size === "sm",
              "h-10 px-4 py-2": size === "md",
              "h-12 px-6 text-lg": size === "lg",
            },
            className
          )}
          ref={ref}
          {...props}
        />
      )
    }

    return (
      <motion.button
        // Always render visible; only add a light hover scale. Removing initial hidden/whileInView avoids delayed appearance.
        whileHover={{ scale: 1.04, transition: { duration: 0.2, ease: "easeOut" } }}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:scale-105 active:scale-95",
          {
            "bg-primary text-primary-foreground hover:bg-accent shadow-lg hover:shadow-xl": variant === "default",
            "border border-border bg-secondary text-secondary-foreground hover:bg-muted hover:border-primary": variant === "outline",
            "text-secondary-foreground hover:bg-secondary hover:text-foreground": variant === "ghost",
            "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary shadow-lg hover:shadow-xl": variant === "premium",
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 py-2": size === "md",
            "h-12 px-6 text-lg": size === "lg",
          },
          className
        )}
        ref={ref}
        {...(props as any)}
      />
    )
  }
)

Button.displayName = "Button" 