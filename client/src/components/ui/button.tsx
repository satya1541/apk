import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm",
  {
    variants: {
      variant: {
        default: "glass-button bg-primary/80 text-primary-foreground hover:bg-primary/90 border-primary/30",
        destructive:
          "glass-button bg-destructive/80 text-destructive-foreground hover:bg-destructive/90 border-destructive/30",
        outline:
          "glass-button border-input hover:bg-accent/50 hover:text-accent-foreground",
        secondary:
          "glass-button bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:glass-button hover:bg-accent/50 hover:text-accent-foreground border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
  solid: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-700/30",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }