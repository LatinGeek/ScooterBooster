export const BOOKING_TIME_ZONE = "America/Montevideo"
export const BOOKING_NOTICE_HOURS = 4
export const BOOKING_NOTICE_MESSAGE =
  "Reservá con al menos 4 horas de antelación (hora de Uruguay)."

export function getEarliestBookingTime(now = Date.now()): Date {
  return new Date(now + BOOKING_NOTICE_HOURS * 60 * 60 * 1000)
}

export function getUruguayDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: BOOKING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const part = (type: string) => parts.find((value) => value.type === type)!.value
  return `${part("year")}-${part("month")}-${part("day")}`
}

/** The date/time picker represents Uruguay wall time, regardless of the browser's zone.
 * Uruguay uses UTC-03:00 year-round for current and future booking dates.
 */
export function parseUruguayBookingTime(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return new Date(NaN)
  return new Date(`${value}:00-03:00`)
}

export function hasBookingNotice(scheduledAt: Date, now = Date.now()): boolean {
  return scheduledAt.getTime() >= getEarliestBookingTime(now).getTime()
}

export function filterBookableSlots(date: string, slots: string[], now = Date.now()): string[] {
  return slots.filter((time) => hasBookingNotice(parseUruguayBookingTime(`${date}T${time}`), now))
}
