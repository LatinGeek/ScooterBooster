export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Detalle de Reserva</h1>
      <p className="mt-2 text-gray-500">
        Estado, detalles del pago y contacto con el técnico. (#{id})
      </p>
    </main>
  )
}
