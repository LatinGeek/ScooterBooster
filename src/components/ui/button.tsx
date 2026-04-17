import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#10b981] text-white hover:bg-[#059669] focus-visible:ring-[#10b981]",
        secondary:
          "bg-white text-[#10b981] border border-[#10b981] hover:bg-[#d1fae5] focus-visible:ring-[#10b981]",
        ghost: "text-[#3b82f6] hover:bg-[#f3f4f6] focus-visible:ring-[#3b82f6]",
        destructive: "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500",
        outline: "border border-[#e5e7eb] bg-white hover:bg-[#f3f4f6] focus-visible:ring-[#10b981]",
        link: "text-[#3b82f6] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-12 px-8 py-3 text-base",
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
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
