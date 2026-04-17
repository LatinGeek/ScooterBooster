export default function TechniciansPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Técnicos</h1>
      <p className="mt-2 text-gray-500">Encontrá técnicos verificados cerca de vos.</p>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Technician cards will be populated from Firestore */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-gray-400">Cargando técnicos...</p>
        </div>
      </div>
    </main>
  )
}
