import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af]",
          "transition-colors duration-200",
          "focus:ring-2 focus:ring-offset-0 focus:outline-none",
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-[#e5e7eb] focus:border-[#10b981] focus:ring-[#10b981]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
