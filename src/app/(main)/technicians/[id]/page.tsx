export default function TechnicianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Perfil del Técnico</h1>
      <p className="mt-2 text-gray-500">
        Reseñas, servicios, disponibilidad y precios.
      </p>
    </main>
  );
}
