import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af]",
          "resize-none transition-colors duration-200",
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
Textarea.displayName = "Textarea"

export { Textarea }
