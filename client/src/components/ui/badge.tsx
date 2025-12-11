import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm border",
  {
    variants: {
      variant: {
        default:
          "bg-primary/80 text-primary-foreground hover:bg-primary/90 border-primary/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-secondary/30",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 border-red-700/30",
        success:
          "bg-green-600 text-white hover:bg-green-700 border-green-700/30",
        warning:
          "bg-amber-500 text-black hover:bg-amber-600 border-amber-700/30",
        outline: "text-foreground bg-transparent border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.memo(function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
})

export { Badge, badgeVariants }
