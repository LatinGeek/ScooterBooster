# Casos de uso

Mercado Pago MCP Server garantiza que actividades comunes a desarrolladores sean optimizadas de manera fácil y rápida. A continuación, conoce los principales casos de uso para implementar en tu integración.

> NOTE
>
> Los ejemplos de esta sección utilizan Cursor como cliente MCP, pero puedes utilizar el cliente MCP que prefieras.

:::AccordionComponent{title="Consultar la documentación desde un IDE" pill="1"}

La _tool_ `search-documentation` permite buscar información directamente en la documentación oficial de Mercado Pago.

Al usar el asistente y hacer una solicitud en lenguaje natural, es posible buscar información en la documentación y acceder a ella según cada etapa del desarrollo. Por ejemplo, consultar qué medios de pago están disponibles en un determinado país.

```plain
Busca en la documentación de Mercado Pago los medios de pago disponibles.
``` 

![search-payment-methods-es.gif](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/4/28/1748435732404-searchdocpaymentmethodses.gif)

:::
:::AccordionComponent{title="Generar código para integrar un checkout de Mercado Pago" pill="2"}

Además de consultar la documentación, la _tool_ `search-documentation` también te permite generar código para tu proyecto.

Puedes solicitar esta recomendación al asistente pidiéndole que revise la documentación del producto que deseas integrar e indique los pasos necesarios para realizar esta integración. El MCP Server proporciona el contexto necesario, a través de código y documentación, para que el IDE realice las modificaciones necesarias en tu proyecto.

Para este caso de uso, consideremos una tienda que ya esté configurada y que solo necesite integrar un checkout para empezar a procesar pagos. En este sentido, un _prompt_ de orientación para integrar con Checkout Pro podría ser:

```plain
Implementa la integración de Checkout Pro. 
Consulta la documentación del MCP server de Mercado Pago para cualquier detalle de implementación o incertidumbre.

Después de revisar el código de la aplicación existente, genera código productivo de la siguiente manera:

Frontend:
1- Reemplazar el botón de pago con la interfaz de checkout de Mercado Pago;
2- Integrar el formulario de pago;
3- Implementar flujos de éxito/fallo del lado del cliente.

Backend:
1- Configurar credenciales e integración de SDK en la versión más reciente;
2- Crear servicios de procesamiento de pagos;
3- Implementar el manejo de webhooks con validaciones.

Requisitos:
- Utilizar las mejores prácticas y validación de seguridad de Mercado Pago;
- Manejo de errores con códigos de estado;
- Casos de prueba para flujos críticos;
- Agregar documentación en el código;
- Verificar todos los pasos contra la documentación del MCP server de Mercado Pago.
```

El resultado puede variar según la configuración de tu proyecto, pero como regla general, el MCP Server de Mercado Pago sugerirá modificaciones de código en el _frontend_ y _backend_ de tu integración para crear el checkout.

![example-prompt-cho-pro-en-gif](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/4/28/1748437544887-checkoutproprompten.gif)

Si quieres ver más detalles de este ejemplo práctico, accede a nuestro [artículo en Medium](https://medium.com/mercadolibre-tech/agentic-ides-and-model-context-protocol-applied-to-mercado-pago-fa47429894a9) sobre el caso de éxito para integrar Checkout Pro en 30 minutos.

:::
:::AccordionComponent{title="Configurar y probar notificaciones" pill="3"}

Puedes combinar _tools_ para configurar las notificaciones Webhooks de Mercado Pago y probar su correcto funcionamiento previo a salir a producción. 

En el siguiente ejemplo, combinamos el uso de las _tools_ `search_documentation`, `save_webhook` y `simulate_webhook` para realizar una configuración completa, desde la implementación de un receptor hasta la simulación de un evento.

```plain
Estoy desarrollando una integración con Mercado Pago y necesito configurar y probar notificaciones webhooks de pagos.

Sigue las siguientes instrucciones para lograrlo: 

1. Consulta la documentación oficial de Mercado Pago para identificar los requisitos técnicos y de seguridad que debe cumplir un receptor de notificaciones webhooks.

2. En base a esa información, genera un ejemplo de implementación funcional para recibir y procesar notificaciones adaptado a mi proyecto.

3. Configura las notificaciones webhook de Mercado Pago para pagos apuntando a la URL de prueba <webhook.site>.

4. Simula un evento de pago para validar que el receptor los procesa correctamente.
```
![ejemplo-prompt-webhooks](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/8/18/1758226464377-promptnotisesezgif.comoptimize.gif)
:::
:::AccordionComponent{title="Optimizar y medir la calidad de tu integración" pill="4"}

Mercado Pago MCP Server puede asistirte en la implementación de mejoras en tu integración para poder adecuarla a los estándares de calidad y seguridad necesarios en la operación con Mercado Pago.

Combina las _tools_ `quality_checklist` y `quality_evaluation` para asegurar un desarrollo acorde a estos estándares y buenas prácticas, y luego medir la calidad de tu integración con un pago real, una vez que hayas salido a producción.

Para esto, utiliza una secuencia de _prompts_ similar al ejemplo a continuación.

```plain
Quiero asegurar que el código de mi integración tenga la mejor calidad, mantenibilidad, eficiencia y tasa de aprobación. Para ello, necesito que hagas un análisis exhaustivo de su calidad, donde identificarás áreas de mejora e implementarás soluciones concretas que optimicen el rendimiento y adherencia a estándares de Mercado Pago.

Sigue las siguientes instrucciones para implementar estas mejoras:

1. Revisa el código fuente, entiende su estructura e identifica dónde se encuentra la integración con Mercado Pago.
2. Consulta la documentación de Mercado Pago y haz una lista de buenas prácticas y requisitos de calidad para mejorar mi integración teniendo en cuenta los estándares de Mercado Pago.
3. Implementa las mejoras que son requeridas o que serán evaluadas por Mercado Pago. 
4. Genera un resumen de los cambios aplicados e incluye al final aquellas sugerencias de buenas prácticas que pueden ser incluidas en la integración.
5. Indícame cómo realizar un pago productivo para poder verificar que estos cambios son efectivos.
```

![ejemplo-prompt-calidad-integración](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/8/18/1758227826324-testqualitypromptesezgif.comoptimize.gif)

Luego de efectuado ese pago productivo, podrás solicitarle al agente que realice una medición de calidad utilizando el nuevo identificador del pago.

```plain
Mide la calidad de mi integración con Mercado Pago tomando como referencia el payment_id <tunuevopaymentid>. 
```
:::
:::AccordionComponent{title="Generar paso a paso para pruebas de integración y crear usuarios de prueba" pill="5"}

Las _tools_ de Mercado Pago MCP Server te ayudarán a obtener una guía completa para realizar correctamente las pruebas de tu integración en un solo lugar, asistiéndote también en la creación de los usuarios de prueba. 

En este ejemplo, las _tools_ `search_documentation` y `create_test_user` son combinadas para tener lo necesario para un flujo completo de pruebas de integración de Código QR sin salir del entorno de desarrollo. 

```plain
**Contexto:**

Estás integrando el flujo de Código QR modelo dinámico utilizando la API de Orders de Mercado Pago y necesitas probar esta integración con una simulación de punta a punta, respetando las condiciones reales de prueba.

**Rol del modelo:**

Actúa como un generador de documentación técnica y código que sigue estrictamente la documentación oficial de Mercado Pago.

**Tarea específica:**

Genera una respuesta estructurada y detallada que incluya:

1. **Control de pruebas de integración:**
Utiliza exclusivamente la documentación oficial de Mercado Pago para detallar los requisitos necesarios para probar el flujo de Código QR modelo dinámico con API Orders. Indica claramente qué tipo de credenciales deben usarse (test vs. production) en cada etapa.

2. **Creación de usuarios de prueba:**
Crea usuarios de prueba:
* Un vendedor de Argentina con credenciales, etiquetado como `pruebas orders`.
* Un comprador etiquetado como `comprador orders`.

3. **Simulación paso a paso del pago:**
Proporciona instrucciones concisas para simular el flujo completo desde la creación de la order hasta la finalización del pago, utilizando solamente la documentación oficial.
* Desglosa cada acción clave.
* Explica el orden lógico de las operaciones y su justificación.

**Restricción:**

No generes ni asumas datos fuera de la documentación oficial. Si falta información específica, indícalo claramente y sugiere alternativas verificables o recursos oficiales.

**Resultado esperado:**

Una guía con secciones bien diferenciadas, código o JSON de ejemplo si aplica, y explicaciones técnicas precisas, lista para ser utilizada como base de pruebas en un entorno de integración.
```

![Ejemplo test código QR](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/11/9/1765290677960-testqrfinalesezgif.comvideotogifconverter.gif)

:::