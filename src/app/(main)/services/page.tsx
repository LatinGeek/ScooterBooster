import { Gauge, Cpu, Navigation, Wrench } from "lucide-react";

const services = [
  {
    icon: Gauge,
    name: "Eliminación de Límite de Velocidad",
    description:
      "Eliminamos el límite de velocidad de fábrica de tu scooter eléctrico mediante modificación de firmware.",
    category: "speed-limit",
    priceRange: "Desde $1.500 UYU",
    duration: "30-60 min",
    disclaimer: true,
  },
  {
    icon: Cpu,
    name: "Actualización de Firmware",
    description:
      "Actualizamos el firmware de tu scooter a la última versión o instalamos firmware personalizado.",
    category: "firmware",
    priceRange: "Desde $1.000 UYU",
    duration: "30-45 min",
    disclaimer: false,
  },
  {
    icon: Navigation,
    name: "Control Crucero",
    description:
      "Activamos o configuramos el control crucero para una conducción más cómoda y eficiente.",
    category: "cruise-control",
    priceRange: "Desde $1.200 UYU",
    duration: "30-90 min",
    disclaimer: false,
  },
  {
    icon: Wrench,
    name: "Mantenimiento General",
    description:
      "Servicio completo de mantenimiento: diagnóstico, ajustes, cambio de piezas y revisión de seguridad.",
    category: "maintenance",
    priceRange: "Desde $800 UYU",
    duration: "60-120 min",
    disclaimer: false,
  },
];

export default function ServicesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Servicios</h1>
      <p className="mt-2 text-gray-500">
        Todos los servicios disponibles para tu scooter eléctrico.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {services.map((service) => (
          <div
            key={service.category}
            id={service.category}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <service.icon className="h-10 w-10 shrink-0 text-emerald-500" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  {service.name}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  {service.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <span className="font-semibold text-emerald-600">
                    {service.priceRange}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-500">{service.duration}</span>
                </div>
                {service.disclaimer && (
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    ⚠ Solo para uso en propiedad privada. Se requiere aceptar
                    aviso legal.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
