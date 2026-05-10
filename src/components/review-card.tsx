import { Star } from "lucide-react"
import type { Review, User } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

interface ReviewCardProps {
  review: Review
  reviewer?: Pick<User, "displayName" | "photoURL"> | null
}

function getFirstName(displayName?: string | null): string {
  const trimmed = displayName?.trim()
  if (!trimmed) return "Usuario"
  return trimmed.split(/\s+/)[0] ?? "Usuario"
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function ReviewCard({ review, reviewer }: ReviewCardProps) {
  const firstName = getFirstName(reviewer?.displayName)
  const initials = getInitials(firstName)

  const date = new Date(review.createdAt).toLocaleDateString("es-UY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 flex-shrink-0">
            {reviewer?.photoURL ? <AvatarImage src={reviewer.photoURL} alt={firstName} /> : null}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#111827]">{firstName}</span>
              <span className="text-xs text-[#9ca3af]">{date}</span>
            </div>

            <div className="mt-1 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < review.rating
                      ? "fill-[#f59e0b] text-[#f59e0b]"
                      : "fill-[#e5e7eb] text-[#e5e7eb]"
                  }`}
                />
              ))}
            </div>

            <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">{review.comment}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
