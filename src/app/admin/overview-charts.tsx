interface TrendPoint {
  date: string
  label: string
  bookings: number
  gmv: number
}

interface BookingStatusCounts {
  pending: number
  confirmed: number
  in_progress: number
  completed: number
  cancelled: number
  expired: number
}

interface Props {
  trends: TrendPoint[]
  bookingStatusCounts: BookingStatusCounts
  totalGMV: number
  totalPlatformRevenue: number
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(value)
}

function buildPolyline(values: number[], width: number, height: number) {
  const maxValue = Math.max(...values, 1)
  const step = values.length > 1 ? width / (values.length - 1) : width

  return values
    .map((value, index) => {
      const x = index * step
      const y = height - (value / maxValue) * height
      return `${x},${y}`
    })
    .join(" ")
}

export function AdminOverviewCharts({ trends, bookingStatusCounts, totalGMV, totalPlatformRevenue }: Props) {
  const bookingValues = trends.map((trend) => trend.bookings)
  const gmvValues = trends.map((trend) => trend.gmv)
  const bookingPolyline = buildPolyline(bookingValues, 320, 120)
  const gmvPolyline = buildPolyline(gmvValues, 320, 120)
  const maxGmv = Math.max(...gmvValues, 1)
  const totalBookings = Object.values(bookingStatusCounts).reduce((sum, value) => sum + value, 0)

  const statusCards = [
    { label: "Pendientes", value: bookingStatusCounts.pending, tone: "bg-blue-50 text-[#1d4ed8]" },
    { label: "Confirmadas", value: bookingStatusCounts.confirmed, tone: "bg-cyan-50 text-cyan-700" },
    { label: "En curso", value: bookingStatusCounts.in_progress, tone: "bg-amber-50 text-amber-700" },
    { label: "Completadas", value: bookingStatusCounts.completed, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Canceladas", value: bookingStatusCounts.cancelled, tone: "bg-rose-50 text-rose-700" },
    { label: "Vencidas", value: bookingStatusCounts.expired, tone: "bg-slate-100 text-slate-600" },
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)]">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#111827]">Reservas en los últimos 30 días</h2>
              <p className="text-sm text-[#6b7280]">Actividad diaria creada en la plataforma.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
              {bookingValues.reduce((sum, value) => sum + value, 0)} reservas
            </span>
          </div>
          <svg viewBox="0 0 320 140" className="h-40 w-full overflow-visible">
            <path d="M0 120H320" stroke="#e5e7eb" strokeWidth="1" />
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={bookingPolyline}
            />
          </svg>
          <div className="mt-3 grid grid-cols-6 gap-2 text-[11px] text-[#6b7280]">
            {trends.filter((_, index) => index % 5 === 0 || index === trends.length - 1).map((trend) => (
              <span key={trend.date}>{trend.label}</span>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#111827]">GMV en los últimos 30 días</h2>
              <p className="text-sm text-[#6b7280]">Valor bruto de las reservas creadas por fecha.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {formatPrice(totalGMV)} total
            </span>
          </div>
          <svg viewBox="0 0 320 140" className="h-40 w-full overflow-visible">
            <path d="M0 120H320" stroke="#e5e7eb" strokeWidth="1" />
            <polyline
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={gmvPolyline}
            />
            {gmvValues.map((value, index) => {
              const x = gmvValues.length > 1 ? (320 / (gmvValues.length - 1)) * index : 160
              const y = 120 - (value / maxGmv) * 120
              return <circle key={`${index}-${value}`} cx={x} cy={y} r="2.5" fill="#059669" />
            })}
          </svg>
          <div className="mt-3 flex items-center justify-between text-sm text-[#6b7280]">
            <span>Comisión retenida</span>
            <span className="font-semibold text-[#111827]">{formatPrice(totalPlatformRevenue)}</span>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#111827]">Estado actual de las reservas</h2>
          <p className="text-sm text-[#6b7280]">Distribución operativa para triage rápido.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {statusCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-[#f1f5f9] bg-[#fafafa] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#475569]">{card.label}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${card.tone}`}>{card.value}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
                <div
                  className="h-full rounded-full bg-[#111827]"
                  style={{
                    width: `${Math.max((card.value / Math.max(totalBookings, 1)) * 100, card.value > 0 ? 8 : 0)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}
