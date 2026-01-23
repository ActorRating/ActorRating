"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <div style={{ paddingTop: '16px', paddingBottom: '16px' }}>
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      style={{
        touchAction: 'pan-x', // Prevent scroll capture - only allow horizontal panning
        WebkitTouchCallout: 'none', // Prevent iOS callout menu
        WebkitUserSelect: 'none', // Prevent text selection
        userSelect: 'none',
      }}
      {...props}
    >
      <SliderPrimitive.Track 
        className="relative h-3 w-full grow overflow-hidden rounded-full bg-muted cursor-pointer"
        style={{
          touchAction: 'pan-x', // Ensure track also has touch-action
        }}
      >
        <SliderPrimitive.Range 
          className="absolute h-full bg-primary transition-colors pointer-events-none"
          style={{
            pointerEvents: 'none', // Prevent decorative element from stealing touches
          }}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb 
        className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:opacity-90 touch-action-none cursor-grab active:cursor-grabbing"
        style={{
          touchAction: 'pan-x', // Thumb should also allow horizontal panning
        }}
      />
    </SliderPrimitive.Root>
  </div>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider } 