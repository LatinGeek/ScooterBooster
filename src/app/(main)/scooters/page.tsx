export default function ScootersPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Catálogo de Scooters
      </h1>
      <p className="mt-2 text-gray-500">
        Seleccioná tu marca y modelo para ver los servicios disponibles.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* ScooterBrand cards will be populated from Firestore */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-gray-400">Cargando marcas...</p>
        </div>
      </div>
    </main>
  );
}
