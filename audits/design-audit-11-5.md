**AUDITORÍA UX/UI**

**ScooterBooster**

_Auditoría mobile-first y plan de mejora de diseño_

scooterbooster.uy

Alcance: home, catálogo, modelo, servicios, detalle de servicio, técnicos, perfil de técnico, booking, login, FAQ y footer

Mayo 2026 · Documento confidencial

# **Índice**

**Parte 1 - Resumen ejecutivo**

**Parte 2 - Fundamentos de marca y design system**

**Parte 3 - Issues transversales (mobile-first)**

**Parte 4 - Análisis ruta por ruta**

**Parte 5 - Matriz de priorización (Impacto × Esfuerzo)**

**Parte 6 - Apéndices**

# **Parte 1 - Resumen ejecutivo**

### **Contexto**

ScooterBooster es un marketplace uruguayo que conecta dueños de scooters eléctricos con técnicos verificados (deslimitación, firmware, control de crucero y mantenimiento). El sitio es responsive, en español, con backend en Next.js y SSR parcial. Esta auditoría se realiza desde la óptica mobile-first porque el público objetivo (dueños de scooters en Montevideo y Punta del Este) consulta y reserva mayoritariamente desde el celular.

### **Puntaje de madurez de diseño**

**6.2 / 10 - Producto funcional con base sólida, brecha clara en pulido visual, jerarquía y conversión móvil.**

La arquitectura de información está bien planteada (Scooters / Servicios / Técnicos) y los flujos críticos existen. La oportunidad mayor está en (1) jerarquía visual en mobile, (2) densidad informativa de las tarjetas, (3) señales de confianza y (4) el flujo de booking, que hoy es la pieza más débil y la que define la conversión.

### **Top 5 problemas críticos para el negocio**

- **Booking client-side sin SSR ni fallback.** La ruta /booking responde con HTML vacío (solo navbar). Sin contenido visible para crawlers ni para usuarios con JS lento, y sin estado de carga discernible. Es el paso de mayor abandono potencial.
- **Tarjetas de scooter saturadas en mobile.** Cada card mezcla foto, marca, modelo, vel. máx, autonomía, batería, número de servicios y potencia sin agrupación visual ni jerarquía. En 375px se convierte en un muro de chips.
- **CTA débil y duplicado en home.** Coexisten dos primary buttons compitiendo ("Ver servicios" / "Encontrar técnicos") sin una acción principal clara que empuje hacia el embudo (elegir scooter).
- **Pruebas sociales escasas y sin contexto.** Un solo técnico con una sola reseña, sin fotos del trabajo, sin antes/después, sin trustmarks (MercadoPago, Ley 18.331, garantía). El sitio le pide al usuario confiar antes de mostrarle por qué.
- **Aviso legal de deslimitación enterrado.** El uso "solo en propiedad privada" aparece en una línea pequeña dentro de la card. Para el servicio más buscado, falta un patrón explícito de consentimiento informado (checkbox + texto legal antes de reservar).

### **Top 5 quick wins (alto impacto, bajo esfuerzo)**

- **Una sola CTA primaria por pantalla.** En home, "Elegí tu scooter" como botón único primario; "Ver servicios" pasa a link/ghost button.
- **Sticky bottom CTA en mobile.** En detalle de scooter, servicio y técnico, un botón fijo inferior "Reservar" con precio orientativo. Reduce el thumb-travel y duplica la conversión típica en marketplaces (Baymard, 2023).
- **Rediseño de la card de scooter con 3 datos máximo.** Foto + marca/modelo + vel. máx · autonomía. Resto se ve al tap.
- **Sello "MercadoPago · Pago seguro" + "Datos protegidos Ley 18.331".** En footer y antes del pago. Costo: 0. Impacto en confianza: significativo.
- **Skeleton screens en /booking y /technicians.** Mientras carga el cliente, mostrar la estructura. Evita la pantalla en blanco de ~1.5s que perciben los usuarios como "se rompió".

### **Roadmap recomendado**

| **Horizonte** | **Objetivo**                                     | **Entregables**                                                                                                                                                           |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0-30 días     | Quick wins de conversión y confianza             | Tokens definitivos, jerarquía tipográfica, CTA principal único, sticky booking, skeletons, trust badges, rediseño de card de scooter.                                     |
| 30-90 días    | Flujo de booking completo y consentimiento legal | Wizard de 3 pasos (scooter → servicio → técnico/horario), consentimiento explícito para deslimitación, summary y confirmación, recordatorios por WhatsApp.                |
| 90+ días      | Pruebas sociales, SEO y design system maduro     | Galería de antes/después, reseñas con fotos, sistema de badges para técnicos, blog/SEO long-tail por modelo, refresh visual completo, design system documentado en Figma. |

# **Parte 2 - Fundamentos de marca y design system**

### **Estado actual**

El sitio transmite una identidad genérica de marketplace SaaS: tipografía sans-serif neutra, paleta verde-azulada poco distintiva, iconografía mixta y nula presencia de elementos que refuercen el universo del scooter eléctrico (motion, ilustración, fotografía de producto cohesiva). El logo y la palabra "Booster" insinúan velocidad y potencia, pero el resto del sistema visual no lo respalda.

### **Tokens propuestos**

#### **Tipografía**

Propuesta: stack "Inter" (UI) + "Space Grotesk" o "Söhne Halbfett" (display) para los hero. Inter resuelve excelente en pantallas móviles a 14-16px. La fuente display agrega carácter sin sacrificar legibilidad.

| **Token**  | **Uso**                         | **Valor mobile**  | **Valor desktop** |
| ---------- | ------------------------------- | ----------------- | ----------------- |
| display-xl | Hero principal                  | 40px / 1.05 / -2% | 64px / 1.0 / -2%  |
| display-lg | Títulos de sección              | 32px / 1.1 / -1%  | 48px / 1.05 / -1% |
| heading-md | Subsecciones, nombres de modelo | 22px / 1.2        | 28px / 1.2        |
| body-lg    | Párrafos descriptivos           | 16px / 1.55       | 18px / 1.6        |
| body-md    | Texto general                   | 15px / 1.5        | 16px / 1.55       |
| caption    | Specs, metadatos, microcopy     | 13px / 1.4        | 13px / 1.4        |

#### **Color**

Propuesta de paleta más distintiva, respetando contraste WCAG AA en todas las combinaciones de texto/fondo.

| **Token**           | **Hex** | **Uso recomendado**                                                      |
| ------------------- | ------- | ------------------------------------------------------------------------ |
| brand/600 (primary) | #0E7C66 | Botones primarios, links activos, foco.                                  |
| brand/700 (hover)   | #0A5E4D | Estado hover/pressed del primary.                                        |
| accent/500 (boost)  | #FFB020 | Highlights de velocidad/potencia, badges "Boosted", micro-celebraciones. |
| ink/900             | #0B0F19 | Títulos.                                                                 |
| ink/700             | #1F2937 | Texto cuerpo.                                                            |
| ink/500             | #6B7280 | Metadatos, captions.                                                     |
| surface/0           | #FFFFFF | Fondo principal.                                                         |
| surface/50          | #F8FAFC | Fondo de cards y secciones alternas.                                     |
| surface/100         | #EEF2F7 | Dividers suaves, chips inactivos.                                        |
| state/success       | #166534 | Confirmaciones de reserva, verificado.                                   |
| state/warning       | #B45309 | Avisos (uso privado, modificación).                                      |
| state/danger        | #B91C1C | Errores, cancelaciones.                                                  |

#### **Espaciado (escala 4px, mobile-first)**

| **Token** | **px** | **Uso típico**                                |
| --------- | ------ | --------------------------------------------- |
| space-1   | 4      | Gaps mínimos dentro de chips.                 |
| space-2   | 8      | Padding interno botones secundarios.          |
| space-3   | 12     | Gap entre items de lista.                     |
| space-4   | 16     | Padding lateral del viewport mobile (mínimo). |
| space-6   | 24     | Padding de cards, gap entre cards.            |
| space-8   | 32     | Separación entre bloques.                     |
| space-12  | 48     | Separación entre secciones.                   |
| space-16  | 64     | Separación de secciones hero (desktop).       |

#### **Radius, elevación y radio táctil**

- **radius/sm = 8px** - chips, inputs.
- **radius/md = 12px** - cards y botones.
- **radius/lg = 20px** - hero cards y modales bottom-sheet.
- **shadow/sm** - 0 1px 2px rgba(11,15,25,0.06) - cards estáticas.
- **shadow/md** - 0 6px 16px rgba(11,15,25,0.08) - cards al hover/focus.
- **shadow/lg** - 0 16px 32px rgba(11,15,25,0.12) - sticky bars y bottom-sheets.
- **Hit target mínimo** - 44×44pt (Apple HIG) / 48×48dp (Material). Hoy los chips de zonas en /technicians están por debajo.

#### **Iconografía y motion**

- **Icon set único:** lucide-react o phosphor (variant duotone). Stroke 1.5px, tamaño base 20px en mobile.
- **Motion principles:** duraciones 150ms (UI) / 250ms (sheets) / 400ms (transición de pasos). Easing standard cubic-bezier(0.2, 0.8, 0.2, 1).
- **Microinteracción de marca:** "boost" - flash sutil naranja al confirmar reserva o aplicar deslimitación. Crea momento memorable.

### **Voz y tono**

Hoy: voz uruguaya correcta pero plana (voseo, "Potenciá tu scooter"). Falta personalidad técnica + cercana. Propuesta:

- **Cercano y directo:** voseo siempre, frases cortas, evitar formalismo legal en UI principal.
- **Específico, no genérico:** "Tu Xiaomi 4 Pro puede llegar a 32 km/h" en vez de "Potenciá tu scooter".
- **Honesto con los límites:** siempre que se mencione deslimitación, mencionar el contexto legal con tono educativo, no defensivo.
- **Glosario técnico breve:** definir "firmware", "deslimitación", "control de crucero" en tooltips o expandibles.

# **Parte 3 - Issues transversales (mobile-first)**

### **3.1 - Navegación**

| **Issue**                                                                                                                        | **Severidad** | **Recomendación**                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No hay menú hamburguesa ni patrón mobile claro: los 3 links (Scooters / Servicios / Técnicos) compiten con el logo en el header. | **Alta**      | Mantener los 3 links visibles (es viable con tipografía 14px y padding 12px), pero implementar bottom navigation fija en mobile con 4 items: Inicio · Scooters · Técnicos · Mi cuenta. Es el patrón dominante en marketplaces (Uber, Mercado Libre, Rappi). |
| El logo no funciona como "home" de forma evidente en mobile (es pequeño).                                                        | **Media**     | Aumentar el lockup del logo a 28px alto en mobile y agregar un icono home en la bottom nav.                                                                                                                                                                 |
| Falta breadcrumb en páginas profundas (/scooters/xiaomi-mi-4-ultra).                                                             | **Media**     | Breadcrumb arriba del título: "Scooters › Xiaomi › Mi 4 Ultra". Reduce el back-button fatigue.                                                                                                                                                              |
| "Tenés dudas? Escribinos!" es un link de WhatsApp en el header - útil, pero compite con la navegación.                           | **Baja**      | Mover a un FAB (floating action button) inferior derecho con icono WhatsApp, persistente en todas las páginas.                                                                                                                                              |

### **3.2 - Accesibilidad (WCAG 2.2 AA)**

- **Contraste de texto gris sobre blanco:** varias etiquetas tipo "Vel. máx", "Autonomía" parecen estar en gris claro. Verificar que cualquier texto bajo 18pt tenga ratio ≥ 4.5:1. Recomendado: ink/500 (#6B7280) sobre blanco = 4.83:1 ✓.
- **Estados de foco invisibles o por defecto del navegador:** definir un focus ring de 2px brand/600 con offset 2px en todos los interactivos. Crítico para usuarios con navegación por teclado y para cumplir WCAG 2.4.7.
- **Iconos sin texto accesible:** el icono de WhatsApp y los iconos de specs (batería, velocímetro) deben tener aria-label o sr-only correspondiente.
- **Idioma del documento:** asegurar \`&lt;html lang="es-UY"&gt;\` en toda la app (no solo og:locale).
- **Touch targets:** auditar que ningún botón/link interactivo sea menor a 44×44pt. Hoy los chips de zonas y los links de paginación incumplen.
- **Texto alternativo de imágenes:** actualmente los alts son "Foto del \[modelo\]". Mejorar a "Xiaomi Mi 4 Ultra, scooter eléctrico color negro, vista lateral" para SEO + screen readers.
- **Reduce motion:** respetar \`prefers-reduced-motion\` deshabilitando microanimaciones.

### **3.3 - Responsive y mobile-first**

- **Breakpoints sugeridos:** sm 360 / md 600 / lg 905 / xl 1240 / 2xl 1440. Diseñar primero el 360px (no 320), que es la mediana de Android en LATAM.
- **Safe area inferior:** considerar \`env(safe-area-inset-bottom)\` para sticky CTA - evita superposición con la barra home de iOS.
- **Pull to refresh:** habilitar en listados (catálogo y técnicos). Patrón esperado en mobile.
- **Densidad de información:** las cards de scooter intentan mostrar 6 datos. En mobile, reducir a 3 visibles + "Ver más" colapsable.

### **3.4 - Performance y perceived performance**

- **Skeleton screens:** obligatorios en /booking, /technicians, y en listados largos. Sustituir la pantalla en blanco actual.
- **Imágenes de scooter:** servir AVIF/WebP responsive con \`srcset\`, dimensiones explícitas (evitar CLS) y lazy-loading después del primer viewport.
- **Tag &lt;title&gt; dinámico inconsistente:** varias rutas muestran títulos duplicados o cortados ("Mi Electric Scooter 4 Ultra - ScooterBooster | ScooterBooster"). Limpiar el template SEO.
- **First Input Delay:** el header carga muchos handlers (Sentry, deploy IDs). Diferir Sentry con \`defer\` y rate-limitar.

### **3.5 - Confianza y credibilidad**

**Es el área de mayor ROI estratégico**

Un marketplace vende confianza antes que servicio. Hoy ScooterBooster muestra 1 técnico con 1 reseña; el usuario no tiene evidencia visible de volumen, garantía, ni proceso de verificación. Es el cuello de botella número uno de la conversión.

- **Sello "Técnico verificado":** explicar qué significa con un tooltip (DNI verificado, prueba técnica, X trabajos completados).
- **Pruebas de trabajo:** fotos antes/después en perfil de técnico. Permitir subir 3-6 imágenes.
- **Garantía explícita:** "Garantía 30 días sobre el servicio" o "Si no quedás conforme, te devolvemos la reserva" como pieza visual destacada.
- **Trust badges:** MercadoPago, Ley 18.331, WhatsApp Business verificado, RUT de la empresa.
- **Contador social:** "+200 scooters mejorados en Uruguay" (cuando sea cierto) en home.

### **3.6 - Microcopy y errores**

- **Empty states débiles:** "1 resultado" en /technicians no comunica próximos pasos. Cambiar a: "Estamos sumando técnicos en tu zona. ¿Querés que te avisemos cuando haya uno cerca?" con campo de email.
- **Labels de botones repetidos:** "Reservar" aparece en 4 contextos distintos. Diferenciar: "Reservar firmware", "Reservar con Jonathan", "Confirmar reserva".
- **Formularios sin instrucciones inline:** agregar helper text bajo cada campo (formato esperado, ejemplos).

# **Parte 4 - Análisis ruta por ruta**

Para cada ruta auditada se documenta: propósito de la página, issues encontrados con severidad (Crítica/Alta/Media/Baja), recomendaciones específicas, rediseño propuesto y métricas para validar la mejora.

## **4.1 - Home (/)**

**Ruta:** _<https://scooterbooster.uy/>_

**Propósito:** Convertir al visitante en lead, llevándolo a elegir su scooter o explorar técnicos. Hoy es la cara del producto.

#### **Issues detectados (mobile)**

- **#1 \[Alta\]** Dos CTAs primarios compitiendo en hero ("Ver servicios" y "Encontrar técnicos"). Ley de Hick: más opciones = más fricción cognitiva.
- **#2 \[Alta\]** El hero tagline "Potenciá tu scooter eléctrico" es genérico. No menciona el diferencial (técnicos verificados, Uruguay, MercadoPago).
- **#3 \[Media\]** El bloque "¿Cómo funciona?" usa 3 pasos pero no tiene íconos ni ilustraciones - pierde poder didáctico en mobile.
- **#4 \[Media\]** "Técnicos verificados / Reseñas reales / Contacto directo" se muestran sin íconos ni contraste visual. Parecen texto suelto.
- **#5 \[Media\]** No hay prueba social arriba del fold (sin contador, sin reseñas, sin marcas).
- **#6 \[Baja\]** Faltan testimonios reales con foto/nombre del cliente.

#### **Recomendaciones específicas**

- CTA primario único: "Elegí tu scooter" → /scooters. CTA secundario ghost: "Ver cómo funciona" (scroll suave).
- Reescribir hero: H1 "Más velocidad, mejor firmware, técnicos de confianza." + sub: "Reservá el servicio que tu scooter necesita en Montevideo y Punta del Este. Pagás 10% online, el resto al técnico."
- Convertir "¿Cómo funciona?" en un carrusel mobile con 3 cards ilustradas + un "Empezar" al final.
- Agregar tira de marcas soportadas (Xiaomi, Joyor, Atom, Navee, MiStyle) con logos en grayscale debajo del hero.
- Sección "Lo que dicen nuestros clientes" con 2-3 reseñas en carrusel y agregado: "⭐ 5.0 promedio en X servicios completados".
- Trust strip arriba del footer: MercadoPago · WhatsApp · Ley 18.331 · Soporte 9-18h.

#### **Rediseño propuesto**

El hero pasa a layout 1 columna en mobile con: badge superior "Marketplace #1 de scooters en Uruguay", H1 a 40px bold tracking -2%, sub a 16px, imagen de scooter a 280px alto debajo, y CTA primary full-width sticky en la parte inferior del fold.

#### **Métricas de éxito**

- CTR del CTA primario > 18% (benchmark marketplaces).
- Bounce rate mobile < 45%.
- Scroll depth a "¿Cómo funciona?" > 60%.

## **4.2 - Catálogo de scooters (/scooters)**

**Ruta:** _<https://scooterbooster.uy/scooters>_

**Propósito:** Que el usuario encuentre su modelo en menos de 15 segundos y entre al detalle. Es la principal entrada al funnel.

#### **Issues detectados (mobile)**

- **#1 \[Crítica\]** No hay buscador. Con 30+ modelos en 5 marcas, falta input "Buscá tu modelo" con autocompletado.
- **#2 \[Alta\]** No hay filtros (marca, potencia, velocidad, autonomía). Los usuarios técnicos quieren filtrar; los neófitos quieren navegar por marca.
- **#3 \[Alta\]** Las cards muestran 6 datos sin agrupar. En mobile se ven como un párrafo de chips: "25 km/h Vel. máx 70 km Autonomía 561 Wh Batería 4 servicios disponibles 500W".
- **#4 \[Alta\]** No hay miniaturas visibles en el grid (solo aparecen al hacer scroll dentro de cada marca). El reconocimiento visual de marca/modelo es el atajo más rápido.
- **#5 \[Media\]** El agrupado por marca es bueno, pero no hay anchor nav ("Saltá a: Atom · Joyor · Xiaomi…") que en mobile sería un sticky chips bar.
- **#6 \[Media\]** El CTA "¿No encontrás tu modelo?" aparece a mitad del listado, en una posición inesperada.
- **#7 \[Baja\]** Faltan badges contextuales: "Más popular", "Recomendado para deslimitar", "Nuevo".

#### **Recomendaciones específicas**

- Buscador sticky arriba con autocompletado (datos ya disponibles), formato: "Buscá tu Xiaomi, Joyor…".
- Filtros tipo bottom-sheet en mobile (chip "Filtros" → abre overlay): Marca, Velocidad máx, Autonomía, Potencia, Servicios disponibles.
- Chips de navegación rápida sticky bajo el buscador: Atom · Joyor · MiStyle · Navee · Xiaomi.
- Rediseño de la card: foto 1:1 a 100% width, nombre del modelo a 18px bold, marca a 13px muted arriba, 3 datos clave en pill (Vel. máx · Autonomía · Potencia), CTA "Ver servicios" como link.
- Mover el CTA "¿No encontrás tu modelo?" al final del listado, no en medio.
- Lazy load progresivo: cargar 6 cards iniciales por marca y "Mostrar más" al final.

#### **Rediseño propuesto**

Layout en grid 2 columnas en mobile (375px) con cards cuadradas, foto arriba 50% de la altura, nombre y marca centrados, 3 chips de specs en línea inferior. Tap en la card abre el detalle. CTA del bottom-sheet de filtros "Mostrar X scooters" con contador dinámico (patrón Airbnb).

#### **Métricas de éxito**

- Tiempo a primer tap en una card < 20s.
- Uso de buscador o filtros > 35%.
- Tasa de progresión Catálogo → Detalle de scooter > 55%.

## **4.3 - Detalle de scooter (/scooters/\[modelo\])**

**Ruta:** _<https://scooterbooster.uy/scooters/xiaomi-mi-4-ultra>_

**Propósito:** Que el usuario entienda qué servicios son compatibles con su modelo y reserve.

#### **Issues detectados (mobile)**

- **#1 \[Crítica\]** No hay precio visible junto al servicio. Solo se ve "~60 min" → fricción y abandono.
- **#2 \[Crítica\]** El botón "Reservar" es secundario visualmente; debería ser el más prominente, idealmente sticky inferior.
- **#3 \[Alta\]** Las 5 specs (vel. máx, autonomía, batería, motor, peso) están en línea sin jerarquía. Faltan iconos.
- **#4 \[Alta\]** El bloque "Técnicos que trabajan con Xiaomi" solo muestra 1 técnico - sin alternativas no hay sensación de marketplace.
- **#5 \[Media\]** El aviso legal de deslimitación ("Solo para uso en propiedad privada. Requiere aceptar aviso legal.") está en texto muy pequeño dentro de una card. Debería ser un disclosure pattern explícito.
- **#6 \[Media\]** No hay sección de FAQ específica del modelo ("¿Mi Xiaomi 4 Ultra soporta deslimitación?").
- **#7 \[Media\]** Imagen única sin galería: no se puede ver el scooter desde otros ángulos ni con resultados de trabajos previos.
- **#8 \[Baja\]** No hay link "Comparar con otro modelo" - útil para usuarios que dudan entre 2 scooters.

#### **Recomendaciones específicas**

- Mostrar precio orientativo de cada servicio ("Desde \$1.200 UYU") en la card.
- Sticky CTA inferior en mobile: "Reservar servicio · desde \$800 UYU".
- Specs en tarjetas individuales con icono + número grande + label pequeño abajo (estilo dashboard de auto).
- Para deslimitación: bloque amarillo destacado con "⚠ Modificación legal solo en propiedad privada - leé los detalles antes de reservar" + checkbox antes del booking.
- FAQ específica por modelo: "¿Cuánto puedo aumentar la velocidad?", "¿Pierdo la garantía?", "¿Cuánto dura el firmware custom?"
- Galería con 3-5 fotos del modelo + sección "Trabajos realizados en este modelo" con thumbnails.

#### **Rediseño propuesto**

Hero del modelo a 1 columna mobile: marca arriba, nombre a 32px bold, galería de 4 fotos swipeable, grid 2×2 de specs con iconos, luego CTA primary "Reservar servicio", luego sección de servicios disponibles con precio y técnicos. Sticky bottom CTA reaparece al hacer scroll fuera del primer fold.

#### **Métricas de éxito**

- Tasa de progresión Modelo → Booking > 40%.
- Tiempo en página > 60s (señal de evaluación seria).
- Tasa de clic en FAQ del modelo > 25%.

## **4.4 - Listado de servicios (/services)**

**Ruta:** _<https://scooterbooster.uy/services>_

**Propósito:** Educar al usuario sobre los 4 servicios y empujarlo a reservar o explorar el detalle.

#### **Issues detectados (mobile)**

- **#1 \[Alta\]** Los 4 servicios están listados en orden aleatorio (Firmware antes que Speed Limit, que es el más buscado). El servicio "estrella" debería ir primero.
- **#2 \[Alta\]** Cada servicio tiene precio y duración pero falta consistencia: "Control Crucero" no tiene CTA de reserva (solo "Ver detalle"), Speed Limit y Firmware sí.
- **#3 \[Media\]** No hay comparador o tabla unificada de los 4 servicios. Tarjetas en cards aisladas dificultan comparar.
- **#4 \[Media\]** El bloque "¿Tenés dudas sobre qué servicio elegir?" aparece arriba pero el CTA lleva a /technicians, no a una asesoría real.
- **#5 \[Baja\]** Sin iconografía: cuesta diferenciar visualmente Firmware vs Speed Limit (son técnicamente similares).

#### **Recomendaciones específicas**

- Reordenar por popularidad y rentabilidad: 1) Eliminación de límite, 2) Control crucero, 3) Firmware, 4) Mantenimiento.
- Estandarizar CTA: todos con "Reservar" como primario + "Ver detalle" como link.
- Agregar comparador colapsable "Comparar los 4 servicios" con tabla mobile-friendly (scroll horizontal).
- Iconos distintivos para cada servicio (lucide: Gauge / Cruise / Cpu / Wrench).
- Bloque "¿Cuál servicio necesito?" con quiz de 3 preguntas → recomienda servicio (alta conversión, bajo costo).

#### **Rediseño propuesto**

Lista vertical de cards en mobile, cada una con: icono a la izquierda, nombre + duración + precio a la derecha, descripción en 2 líneas, badge si aplica ("Más reservado", "Requiere aviso legal"), y CTA full-width "Reservar este servicio" en la base.

#### **Métricas de éxito**

- CTR de "Reservar" > 30% en el servicio destacado.
- Uso del comparador > 15%.
- Tasa de progresión Servicios → Booking > 25%.

## **4.5 - Detalle de servicio (/services/\[id\])**

**Ruta:** _<https://scooterbooster.uy/services/firmware>_

**Propósito:** Convencer al usuario indeciso con detalle técnico, FAQ y prueba social.

#### **Issues detectados (mobile)**

- **#1 \[Crítica\]** Después de "Técnicos recomendados" aparece el catálogo completo de scooters duplicado (todos los modelos). Es ruido masivo que mata el flujo.
- **#2 \[Alta\]** El "Rango orientativo" (\$1.000 - \$3.000 UYU) está debajo del fold y sin destacar. Es la pregunta #1 del usuario.
- **#3 \[Alta\]** Las FAQ son útiles pero están en texto plano. Deberían ser un accordion expandible.
- **#4 \[Media\]** El CTA "Reservar este servicio" lleva a /booking/new?service=firmware (sin modelo). Forzar al usuario a elegir scooter ahí es fricción extra.
- **#5 \[Media\]** Falta sección visual: "Ejemplos de scooters después del firmware" con before/after de pantallas.
- **#6 \[Baja\]** "Scooters compatibles" muestra solo 2 cards visibles y luego el resto en formato distinto, inconsistente.

#### **Recomendaciones específicas**

- Eliminar el catálogo completo duplicado al final - basta con "Compatible con todos los modelos" + link al catálogo.
- Precio orientativo al inicio de la página, junto al título: badge "\$1.000 - \$3.000 UYU · ~40 min".
- FAQ como accordion (semántica \`&lt;details&gt;\` nativa).
- Si el usuario llega sin scooter elegido, mostrar selector de scooter al hacer tap en "Reservar".
- Sección visual con 2-3 ejemplos before/after del servicio (foto de pantalla del scooter / valor en km/h).
- Unificar el listado "Scooters compatibles" en formato grid de 2 columnas con miniatura + nombre + "Ver servicios".

#### **Rediseño propuesto**

Layout mobile: badge + título + precio en el hero, descripción corta, accordion FAQ, sección "Qué incluye" como checklist verde, "Cuándo te conviene" como checklist azul, antes/después con carrusel, técnicos recomendados (máx 3), CTA sticky inferior con precio.

#### **Métricas de éxito**

- Tiempo de scroll de cima a CTA inferior < 35s.
- Tasa de expansión de FAQ > 40%.
- Tasa de progresión Detalle de servicio → Booking > 30%.

## **4.6 - Listado de técnicos (/technicians)**

**Ruta:** _<https://scooterbooster.uy/technicians>_

**Propósito:** Que el usuario encuentre rápidamente un técnico verificado cerca y reserve.

#### **Issues detectados (mobile)**

- **#1 \[Crítica\]** Solo 1 técnico en el catálogo: la página comunica "falta de oferta" más que "red de técnicos". UX-wise no se puede arreglar, pero copy y layout pueden suavizar esto.
- **#2 \[Alta\]** El bloque "Postulate para aparecer en el catálogo" compite con el listado real arriba. Debería ir al final.
- **#3 \[Alta\]** "Zonas rápidas" usa chips para Montevideo Centro, Pocitos, Unión, Punta del Este, Maldonado, Colonia - sin filtros funcionales detrás (la API solo devuelve 1 técnico).
- **#4 \[Media\]** Falta mapa: para "Descubrimiento por cercanía" lo natural es ver pins en un mapa. Hoy es solo texto.
- **#5 \[Media\]** El CTA "Usar mi ubicación" no indica qué pasa después (¿reorden?, ¿filtro?, ¿mapa?).
- **#6 \[Baja\]** "1 resultado" es un texto técnico, no humano. Mejor: "Encontramos 1 técnico en tu zona".

#### **Recomendaciones específicas**

- Reordenar: poner el listado primero, los filtros/zonas inmediatamente abajo del listado o como sticky superior, y la postulación al final.
- Empty state honesto con call to action: "Estamos sumando técnicos. Dejanos tu email y te avisamos cuando haya uno en {zona}".
- Integrar mapa (Mapbox / Google Maps) con pins de técnicos, sticky top en mobile colapsable.
- Explicar "Usar mi ubicación" con tooltip: "Te mostramos los técnicos más cercanos a vos".
- Card de técnico con: avatar grande, nombre, badge "Verificado" con tooltip, distancia ("2.3 km"), rating con cantidad de reseñas, especialidades como chips, precio base, y CTA "Reservar".

#### **Rediseño propuesto**

Vista mobile: header con búsqueda y filtro de zona, mapa colapsable (toggle "Ver mapa"), listado de cards verticales. Tap en card abre perfil. Bottom-sheet de filtros con: zona, servicio, marca, rating mínimo, precio.

#### **Métricas de éxito**

- % de usuarios que activan geolocalización > 30%.
- Tap en card de técnico > 50%.
- Tasa de progresión Listado → Perfil de técnico > 45%.

## **4.7 - Perfil de técnico (/technicians/\[slug\])**

**Ruta:** _<https://scooterbooster.uy/technicians/jonathan-denis>_

**Propósito:** Construir confianza para que el usuario reserve a este técnico específico.

#### **Issues detectados (mobile)**

- **#1 \[Alta\]** Solo una reseña visible sin posibilidad de leer más detalle (autor, fecha, servicio prestado, modelo del scooter).
- **#2 \[Alta\]** Falta foto del técnico y de su taller. Avatar con iniciales ("JD") genera distancia.
- **#3 \[Alta\]** La descripción es un párrafo extenso con tipeo informal ("tecnico", "electronica", "Repro/deslimitacion"). Falta edición editorial.
- **#4 \[Media\]** Disponibilidad semanal es estática (texto). Debería ser un calendario visual con slots disponibles.
- **#5 \[Media\]** Faltan trabajos previos en formato visual: galería antes/después.
- **#6 \[Media\]** El CTA "Reservar turno" no menciona costos ni próximo slot disponible.
- **#7 \[Baja\]** Sin sección "Sobre mí" con años de experiencia, certificaciones, etc.

#### **Recomendaciones específicas**

- Mostrar foto del técnico (obligatoria en onboarding) y opcionalmente foto del taller.
- Editar la descripción siguiendo guidelines de tono. Permitir formateo Markdown limitado al técnico.
- Galería de trabajos: grid 2 columnas con thumbnails clicables que abren lightbox.
- Disponibilidad como calendario semanal interactivo (vista de slots con próximo disponible destacado).
- Sección de reseñas completa con foto del cliente (opcional), fecha, servicio prestado, modelo, calificación.
- Sticky CTA inferior: "Reservar con Jonathan · Próximo slot mañana 10:00 · desde \$1.800 UYU".

#### **Rediseño propuesto**

Hero del perfil: foto circular 80px, nombre, badge verificado, rating + reseñas, zona, distancia. Bloque de servicios y precios como tabla limpia. Calendario semanal interactivo. Galería de trabajos. Reseñas con paginación. CTA sticky.

#### **Métricas de éxito**

- Tap en "Reservar turno" > 35%.
- Tiempo en página > 50s.
- Conversión Perfil → Reserva confirmada > 22%.

## **4.8 - Booking (/booking)**

**Ruta:** _<https://scooterbooster.uy/booking?serviceId=…>_

**Propósito:** Convertir intención en reserva pagada. Es la pieza más crítica del producto.

#### **Issues detectados (mobile)**

- **#1 \[Crítica\]** La ruta se renderiza completamente client-side: el HTML inicial solo trae navbar y nada más. Cualquier falla de JS o latencia alta deja al usuario frente a una pantalla en blanco.
- **#2 \[Crítica\]** Sin SSR ni meta tags propios, no es indexable ni compartible (cualquier link a una reserva muestra preview vacío en WhatsApp).
- **#3 \[Crítica\]** Para el servicio de deslimitación, no hay (visible desde la URL) consentimiento legal explícito antes de confirmar. Riesgo regulatorio.
- **#4 \[Alta\]** Sin indicador de pasos (1 de 3, 2 de 3, 3 de 3). El usuario no sabe cuánto le falta.
- **#5 \[Alta\]** Sin breakdown del costo: cuánto se paga ahora (reserva 10%), cuánto al técnico, total estimado.
- **#6 \[Media\]** Sin opción de "Guardar borrador" o "Recordarme más tarde".

#### **Recomendaciones específicas**

- Implementar SSR mínimo con skeleton + meta tags propios. Para flujos auth-protected, render placeholder.
- Wizard de 3 pasos visible: 1) Scooter, 2) Servicio + horario, 3) Datos + pago. Stepper sticky top.
- Antes de confirmar deslimitación: modal/checkbox obligatorio con texto legal específico, no como nota al pie.
- Resumen permanente lateral (desktop) o bottom-sheet expandible (mobile) con: servicio, técnico, fecha, costo desglosado.
- Pago integrado con MercadoPago Checkout Pro embebido (no redirige fuera del flujo).
- Confirmación final: pantalla con número de reserva, botón "Agendar en Google Calendar", "Compartir por WhatsApp", "Volver al inicio".
- Email + WhatsApp de confirmación automáticos con recordatorios 24h y 1h antes.

#### **Rediseño propuesto**

Wizard mobile-first: stepper arriba (1 ━ 2 ━ 3), título del paso, formulario en una columna con inputs grandes (48px alto), bottom CTA sticky "Continuar" deshabilitado hasta completar. Paso 3 incluye breakdown de costos y CTA primario "Pagar reserva (\$150 UYU)" con logo MercadoPago.

#### **Métricas de éxito**

- Conversión Booking iniciado → Booking confirmado > 65%.
- Tiempo medio del flujo < 90s.
- Tasa de abandono por paso < 15%.
- Errores de pago < 5%.

## **4.9 - Login (/login)**

**Ruta:** _<https://scooterbooster.uy/login>_

**Propósito:** Acceso de usuarios registrados y técnicos. Onboarding del usuario nuevo.

#### **Issues detectados (mobile)**

- **#1 \[Crítica\]** La página renderiza solo el logo y un título; el formulario es client-side y demora en aparecer. Sin skeleton.
- **#2 \[Alta\]** Sin opción visible de "Crear cuenta" o "Continuar con Google / WhatsApp". Fricción de signup elevada.
- **#3 \[Media\]** Sin diferenciación visible entre login de cliente y de técnico.
- **#4 \[Media\]** Sin link a "¿Olvidaste tu contraseña?" o magic link en email.
- **#5 \[Baja\]** Sin badge de seguridad ("Tu sesión está protegida").

#### **Recomendaciones específicas**

- SSR del formulario base + skeleton de los providers OAuth.
- Login pasivo con magic link al email o WhatsApp como método principal (reduce fricción + es nativo a UY).
- Toggle "Soy cliente / Soy técnico" arriba del formulario.
- Trust mark "🔒 Sesión protegida" y link a política de privacidad.
- Si el usuario viene de booking, mensaje contextual: "Iniciá sesión para confirmar tu reserva".

#### **Rediseño propuesto**

Layout vertical, logo arriba, H1 "Ingresá a ScooterBooster", sub "Reservá servicios o gestioná tus turnos", input grande de email/teléfono, CTA primary "Enviar código por WhatsApp", debajo separador "o" y botones "Continuar con Google" / "Continuar con Apple". Link "¿Sos nuevo? Crear cuenta".

#### **Métricas de éxito**

- Tasa de login completado > 80%.
- % de signups vía WhatsApp magic link > 50%.
- Errores de login < 3%.

## **4.10 - FAQ y páginas legales (/legal/faq, /legal/terms, /legal/privacy, /legal/cookies)**

**Ruta:** _<https://scooterbooster.uy/legal/faq>_

**Propósito:** Resolver dudas y dar transparencia legal antes y después de la reserva.

#### **Issues detectados (mobile)**

- **#1 \[Alta\]** Las FAQs están en formato bold + párrafo, sin accordion. Lectura larga en mobile.
- **#2 \[Media\]** Sin buscador interno ni categorías (Reserva · Pago · Servicios · Técnico · Legal).
- **#3 \[Media\]** El email de soporte se repite 3 veces - debería ser un solo bloque con CTA "Contactanos".
- **#4 \[Media\]** Falta un contador / fecha de última actualización en términos y privacidad.
- **#5 \[Baja\]** Sin acceso desde el booking (link "¿Dudas? Mirá las FAQ").

#### **Recomendaciones específicas**

- Accordion con búsqueda y categorías visibles en mobile como chips.
- Bloque de contacto al final: "¿No encontraste tu respuesta?" con CTAs WhatsApp + email.
- Última actualización visible al inicio de cada legal.
- Link contextual a FAQ desde booking y desde el detalle de Speed Limit (el más sensible).
- Convertir las preguntas en data estructurada con FAQ Schema (JSON-LD) para SEO.

#### **Rediseño propuesto**

FAQ en mobile: search input sticky arriba, chips de categorías, accordion limpio (semántica \`&lt;details&gt;\`), un solo bloque de contacto al final. Páginas legales: TOC anclado lateral en desktop, sticky top en mobile.

#### **Métricas de éxito**

- Búsquedas en FAQ > 25% de los visitantes.
- Tasa de clic en CTA de contacto < 8% (señal de que FAQ resolvió).
- Reducción de tickets de soporte sobre temas presentes en FAQ.

## **4.11 - Footer (transversal)**

**Ruta:** _Todas las rutas_

**Propósito:** Cierre informativo y red de seguridad de navegación.

#### **Issues detectados (mobile)**

- **#1 \[Media\]** Footer plano: 4 columnas (ScooterBooster · Servicios · Plataforma · Legal), sin sello de marca distintivo.
- **#2 \[Media\]** Sin redes sociales (Instagram, TikTok son canales naturales para scooters en LATAM).
- **#3 \[Baja\]** Sin idioma (es-UY) ni selector país.
- **#4 \[Baja\]** Copyright "© 2026" - verificar dinamismo.

#### **Recomendaciones específicas**

- Agregar logo + tagline en la columna principal.
- Trust badges: MercadoPago, Ley 18.331, WhatsApp Business verificado.
- Links a redes sociales con iconos.
- Newsletter opcional "Recibí novedades y descuentos" con input de email.
- Mini-mapa o referencia geográfica (Uruguay) para reforzar el "somos locales".

# **Parte 5 - Matriz de priorización (Impacto × Esfuerzo)**

Esta matriz organiza las recomendaciones más importantes según el impacto esperado en métricas de negocio (conversión, confianza, retención) y el esfuerzo de implementación. Recomendamos atacar primero el cuadrante alto-impacto / bajo-esfuerzo.

### **Alto impacto · Bajo esfuerzo (hacer YA)**

- Sticky CTA inferior con precio en detalle de scooter, servicio y técnico.
- CTA primario único en home.
- Trust badges (MercadoPago, Ley 18.331, WhatsApp).
- Skeleton screens en /booking, /login, /technicians.
- Rediseño de card de scooter con 3 datos máximo.
- Limpieza del título SEO (eliminar duplicados "| ScooterBooster").

### **Alto impacto · Alto esfuerzo (planificar Q2/Q3)**

- Wizard completo de booking en 3 pasos con SSR + consentimiento legal de deslimitación.
- Pruebas sociales: galería antes/después + reseñas con foto.
- Mapa integrado en /technicians con geolocalización.
- Calendario de disponibilidad real en perfil de técnico.
- Sistema de búsqueda y filtros en catálogo.

### **Bajo impacto · Bajo esfuerzo (cuando sobre tiempo)**

- Iconografía consistente en servicios.
- Microcopy en empty states.
- Schema.org FAQ para SEO.
- Redes sociales en footer.

### **Bajo impacto · Alto esfuerzo (evitar)**

- Refresh completo de la marca sin antes resolver conversión.
- Animaciones complejas tipo Lottie en hero (pesadas, marginales).
- App nativa antes de probar PWA.

### **Sprint plan sugerido**

| **Sprint**        | **Foco**                            | **Entregables principales**                                                                                      |
| ----------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Sprint 1 (2 sem.) | Quick wins de confianza y jerarquía | Tokens, CTA único en home, sticky bottom CTA, trust badges, rediseño de card de scooter, skeleton screens.       |
| Sprint 2 (2 sem.) | Detalle de scooter y servicio       | Rediseño de hero modelo, FAQ accordion, eliminar catálogo duplicado, galería before/after básica.                |
| Sprint 3 (2 sem.) | Booking y consentimiento            | SSR + skeleton, stepper, consentimiento legal explícito de deslimitación, summary lateral, MercadoPago embebido. |
| Sprint 4 (2 sem.) | Técnicos y pruebas sociales         | Foto del técnico obligatoria, galería de trabajos, reseñas extendidas, calendario semanal, mapa básico.          |
| Sprint 5 (2 sem.) | Buscador, filtros y SEO             | Buscador y filtros en catálogo, schema FAQ, alts SEO, mejoras de performance, AVIF/WebP responsive.              |

# **Parte 6 - Apéndices**

### **A. Glosario UX usado en este documento**

- **WCAG 2.2 AA:** estándar de accesibilidad web del W3C. AA es el nivel exigido por la mayoría de regulaciones, incluida la ley de accesibilidad digital uruguaya.
- **F-pattern / Z-pattern:** patrones de lectura observados por eyetracking (Nielsen Norman Group).
- **Skeleton screens:** placeholders neutros que imitan la estructura del contenido mientras carga (Luke Wroblewski, 2013).
- **Hit target:** área tappable mínima recomendada: 44×44pt (Apple HIG) / 48×48dp (Material).
- **Ley de Hick:** el tiempo de decisión aumenta con el número de opciones disponibles.
- **Ley de Fitts:** el tiempo para alcanzar un target es función de su tamaño y distancia.
- **Disclosure pattern:** patrón que oculta información complementaria hasta que el usuario decide expandirla.
- **Thumb zone:** área del pulgar alcanzable cómodamente en mobile (Steven Hoober).

### **B. Referencias y benchmarks**

- **Baymard Institute (2023):** "Mobile checkout UX" - 70% de los carritos mobile se abandonan por fricción.
- **Nielsen Norman Group (2022):** "Ten Usability Heuristics for User Interface Design".
- **Apple Human Interface Guidelines:** patrones de bottom navigation, sheets y safe area.
- **Material Design 3:** tokens, motion, color, tipografía.
- **Stripe Checkout:** benchmark de booking wizard mobile.
- **Airbnb:** benchmark de filtros bottom-sheet con contador dinámico.
- **Mercado Libre / Uber / Rappi:** benchmarks LATAM de bottom navigation, sticky CTA y skeleton screens.

### **C. Supuestos de esta auditoría**

- **Sin acceso a analytics (GA4, Hotjar) ni a sesiones reales:** las hipótesis de conversión se basan en benchmarks públicos. Sería deseable validar con datos propios.
- **Sin acceso autenticado:** no fue posible auditar el flujo completo de booking (paso 2 y 3), el dashboard de cliente ni el panel de técnico. Recomendamos una segunda auditoría privada.
- **Sin entrevistas a usuarios:** todas las recomendaciones se fundamentan en heurísticas reconocidas y patrones de mercado. Una ronda de 5 entrevistas de usabilidad (Nielsen, 1994) podría validar y priorizar los hallazgos.

### **D. Próximos pasos sugeridos**

- Revisar este documento internamente y priorizar contra capacidad real del equipo.
- Implementar Sprint 1 (quick wins) y medir impacto en conversión y bounce rate por 4 semanas.
- Hacer una ronda de 5 entrevistas a dueños de scooters en Montevideo para validar las hipótesis.
- Crear o consolidar el design system en Figma con los tokens propuestos.
- Planificar Sprints 2-5 con métricas atadas a cada release.

_- Fin del documento -_