function stripHtml(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function sanitizePlainText(value: string): string {
  return stripHtml(value)
}

export function sanitizeOptionalPlainText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  return sanitizePlainText(value)
}
