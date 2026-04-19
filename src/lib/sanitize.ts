import DOMPurify from "isomorphic-dompurify"

export function sanitizePlainText(value: string): string {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim()
}

export function sanitizeOptionalPlainText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  return sanitizePlainText(value)
}
