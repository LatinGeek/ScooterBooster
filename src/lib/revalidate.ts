import { revalidateTag } from "next/cache"

export function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, { expire: 0 })
  } catch (error) {
    if (process.env.NODE_ENV === "test") {
      return
    }
    throw error
  }
}
