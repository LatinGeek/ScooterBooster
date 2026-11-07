# Firmware Patcher (Parcheador de firmware)

Herramienta **interna** para técnicos y administradores de ScooterBooster. Recibe un archivo de firmware `.bin` de un scooter basado en Brightway, detecta el modelo automáticamente, aplica los parches seleccionados **en el servidor** y devuelve un `.bin` modificado para descargar.

> Estado: implementación detrás de feature flags (apagada por defecto). Esta guía documenta la API y la operación; la interfaz vive en `/admin/firmware-patcher` y `/dashboard/technician/firmware-patcher`.

## 1. Qué hace y qué no hace

| Hace                                                                  | No hace                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Detecta el modelo desde el encabezado del firmware (sin override).    | **No flashea** ni se conecta al scooter (sin BLE, USB, serial, OTA).      |
| Muestra solo los parches válidos para el modelo y sus rangos seguros. | No guarda firmware en disco, Firestore, Storage, logs ni terceros.        |
| Aplica los parches en memoria, todo o nada, y recalcula checksums.    | No firma ni valida el firmware: la salida es una imagen **no oficial**.   |
| Registra una auditoría con hashes y tamaños (nunca bytes).            | No hace llamadas de red salientes.                                       |

## 2. Acceso

| Rol           | Acceso                                                                  |
| ------------- | ----------------------------------------------------------------------- |
| `admin`       | Sí: parches estables, experimentales y volcado completo.                |
| `technician`  | Sí: parches estables, experimentales y volcado completo.                |
| `user`        | No (403).                                                               |
| Anónimo       | No (401).                                                               |

- Cada solicitud vuelve a validar la sesión y el rol en el servidor; ocultar el enlace de navegación no es autorización.
- El rol nunca se toma de la query, el body ni los headers.

## 3. Advertencias operativas (no bloqueantes)

La herramienta es interna y **no** hay aviso legal ni aceptación bloqueante. Se mantienen estas advertencias visibles:

- Los parches experimentales **no están validados en hardware**: pueden no arrancar bajo carga o dejar el equipo inutilizable (brick).
- Parchear puede dejar el dispositivo inutilizable aunque la herramienta no devuelva errores.
- La herramienta **no flashea**: solo genera un archivo.
- El modo volcado completo (`fullDump`) cambia el comportamiento del checksum (ver §6).

## 4. Licencia y atribución

- Basada en **bw-patcher** de ScooterTeam: <https://github.com/scooterteam/bw-patcher>.
- Versión de referencia: **1.1.6**, commit **`95a8f339787a1fb6486554d61b573b8e2b688c53`** (2026-09-28).
- **G0 (2026-11-07):** el propietario del producto confirmó que el equipo está autorizado a usar `bw-patcher`. La atribución, el pin de versión y el aviso de licencia deben conservarse; ver también `src/lib/firmware-patcher/PROVENANCE.md`.
- `mss0exp` es un parche **propio de ScooterBooster** (no existe upstream): experimento «MSS0 coherent latch» para `mi6` y `mi6lite`.

## 5. Modelos y matriz de parches

> **Fuente de verdad:** `src/lib/firmware-patcher/capabilities.ts` (generado desde las clases upstream fijadas). La tabla siguiente es una **referencia** tomada de la especificación v1.0 §4.2 hasta que se revise la matriz generada; si difieren, manda el archivo generado y esta tabla debe corregirse.

Modelos parcheables: `mi4`, `mi4lite`, `mi4pro2nd`, `mi5`, `mi5max`, `mi5pro`, `mi5elite`, `mi5plus`, `mi6`, `mi6lite`, `ultra4`.
La detección puede reconocer otras etiquetas (`3lite`, `6esstl`, `6pro_or_6max`, `mi4lite2`, `t2201`): **nunca** son parcheables.

| Código    | Parche                                         | Valor / rango                | Modelos                                                              |
| --------- | ---------------------------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| `sls`     | Límite de velocidad Sport                      | 1.0–35.0, paso 0.1           | Todos                                                                |
| `sld`     | Límite de velocidad Drive                      | 1.0–35.0, paso 0.1           | Todos                                                                |
| `slp`     | Límite de velocidad Peatón                     | 1.0–35.0, paso 0.1           | `mi5elite`, `mi6`, `mi6lite`, `mi5plus`                               |
| `dms`     | Velocidad máxima del tablero                   | 1.0–29.6, paso 0.1           | `mi4`, `ultra4`                                                      |
| `mss`     | Velocidad de arranque del motor                | 1.0–9.0, paso 0.1            | Todos salvo `mi4`, `mi4lite`, `mi5plus`; **experimental** en `mi6`/`mi6lite` |
| `fdv`     | Versión de firmware falsa                      | exactamente 4 dígitos        | Todos salvo `mi4pro2nd`, `mi5pro` y modelos Leqi                      |
| `cce`     | Control de crucero                             | booleano                     | Todos salvo modelos Leqi                                             |
| `mss0exp` | MSS0 experimental (coherent latch) — **propio** | booleano, apagado por defecto | Solo `mi6` y `mi6lite`; **experimental**; reemplaza a `mss`          |
| `chk`     | Corregir checksum                              | —                            | Automático (no seleccionable) salvo `fullDump`                       |
| `img`     | Crear imagen completa                          | —                            | Automático (no seleccionable) en modelos Leqi                        |

Notas:

- Modelos Leqi: `mi5elite`, `mi6`, `mi6lite`, `mi5plus`. En `mi5elite`/`mi6`/`mi6lite` un parche de velocidad también aplica internamente la corrección del límite regional; no es un checkbox aparte.
- `rfm` (region-free) y `rsls` (quitar límite Sport) existen upstream pero **no** se exponen (decisión D6).
- **Orden canónico** (el servidor normaliza el orden del cliente): `sls, sld, slp, dms, fdv, cce, mss, mss0exp, chk, img`.
- **`mss0exp`:** si está presente, reemplaza por completo al parche `mss`; el servidor **ignora** cualquier valor `mss` enviado por el cliente. Se aplica después de los parches de velocidad/región y antes de `chk`/`img`. Requiere `allowExperimental=true`.

## 6. Detección

Port de `bwpatcher/detect.py` (v1.1.6): ventana de encabezado `0x00..0x80`, etiquetas LEQI (`EU1`, `BU1`), mapas de producto/familia/tamaño, IDs BrightWay empaquetados, marcadores crudos, puntuación con `MIN_SCORE = 30` y manejo de empates. Es determinista y sin efectos secundarios.

- El servidor **siempre** vuelve a detectar el modelo; no existe campo de modelo en la API (y enviarlo se rechaza).
- No hay override manual: si la detección es incorrecta, se corrige la detección.
- La respuesta incluye diagnósticos (puntaje, coincidencias, notas) para que el técnico vea por qué se eligió un modelo.

**Modo volcado completo (`fullDump`)**: omite el parche automático `chk`; en modelos Leqi igualmente se agrega `img`. Aplica a ambos roles y queda auditado.

## 7. API

Todas las rutas están bajo `/api/admin/firmware-patcher`, usan runtime Node, `dynamic = "force-dynamic"`, `maxDuration = 10` y responden `Cache-Control: no-store`. Los POST validan `Origin` (`assertTrustedOrigin`). Los errores son JSON `{ success: false, error }` con mensaje en español y header `x-request-id`.

Orden de comprobaciones: **flag → Origin (POST) → sesión/rol → rate limit (solo `/patch`) → cuerpo**.

### `GET /capabilities`

Devuelve `{ success, data: { enabled, upstream: {version, commit}, limits: {maxInputBytes, maxOutputBytes, maxPatches, maxDurationSeconds}, patchOrder, roleAccess, models[] } }`. `models[]` = `{ code, displayName, family, patches[] }`; `patches` contiene solo parches seleccionables (nunca `unsupported`, `chk` ni `img`) con `code`, `label` (español), `status` (`supported`/`experimental`), `kind` (`number`/`boolean`/`version`), `min`, `max`, `step`, `default`.

### `POST /detect`

`multipart/form-data` con un único campo `file` (sin otros campos). Devuelve `{ detection: {ok, model, displayName, family, container, score, hits[], notes[], supported}, availablePatches[], supported, message, inputSha256, size }` (`availablePatches` usa la misma forma que `models[].patches`). Un modelo no detectado o no soportado responde **200** con `supported: false`, `availablePatches: []` y un `message`, para poder mostrar diagnósticos.

### `POST /patch`

`multipart/form-data`:

| Campo               | Obligatorio | Descripción                                                                                       |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `file`              | Sí          | Un único `.bin` (≤ 4 MiB).                                                                         |
| `selection`         | Sí          | JSON `[{ "code": "sls", "value": 30 }, ...]`. Máx. 8 entradas, no vacía. Booleanos: `true`.       |
| `allowExperimental` | No          | `"true"` / `"false"` (estricto; por defecto `false`). Obligatorio para cualquier parche experimental. |
| `fullDump`          | No          | `"true"` / `"false"` (estricto; por defecto `false`).                                              |

Cualquier otro campo (incluido `model`) se rechaza con 400. **No existe** campo de aviso legal.

Respuesta 200 (binario):

| Header                                                               | Valor                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Content-Type`                                                       | `application/octet-stream`                                         |
| `Content-Disposition`                                                | `attachment; filename="patched_<modelo>_<nombre>.bin"` (saneado)   |
| `Content-Length`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` | —                                                        |
| `X-Firmware-Model`                                                   | modelo detectado en el servidor                                    |
| `X-Firmware-Input-Sha256` / `X-Firmware-Output-Sha256`               | SHA-256 en hexadecimal                                             |
| `X-Firmware-Input-Size` / `X-Firmware-Output-Size`                   | bytes                                                              |
| `X-Firmware-Patch-Log`                                               | base64url del JSON `[{name, offset, before, after}]`, ≤ 4096 caracteres codificados |
| `X-Firmware-Patch-Log-Truncated`                                     | `1` cuando el log supera el límite y se omite el header anterior   |

Errores:

| Estado | Causa                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------ |
| 400    | Archivo ausente/múltiple/vacío/sin `.bin`, multipart malformado, campos no permitidos, booleanos no estrictos, selección inválida (código desconocido, duplicado, `chk`/`img`, no aplicable al modelo, fuera de rango o paso, `fdv` sin 4 dígitos), experimental sin `allowExperimental`. |
| 401    | Sin sesión.                                                                                            |
| 403    | Rol no autorizado u `Origin` no confiable.                                                             |
| 404    | Flag apagada (cualquiera de las dos).                                                                  |
| 413    | Archivo > 4 MiB (también por `Content-Length` antes de leer el cuerpo).                                |
| 422    | Modelo no detectado/no soportado, o el motor rechazó el firmware.                                      |
| 429    | Rate limit o demasiadas operaciones simultáneas.                                                       |
| 500    | Error inesperado del motor o salida inválida (> 8 MiB o vacía).                                        |
| 503    | No se pudo escribir la auditoría: **no se entrega el binario** (fail-closed, D5).                      |

Validación estricta respecto de upstream: valores fuera de rango o fuera de paso se **rechazan** (no se recortan); `fdv` inválido se rechaza en lugar de omitirse; una selección vacía se rechaza.

## 8. Seguridad

- Sesión y rol revalidados en cada solicitud; 401/403 según corresponda.
- `assertTrustedOrigin` en POST (CSRF); sin llamadas salientes (sin SSRF).
- Dispatch de modelo/parche por listas estáticas; nunca se evalúa ni importa una cadena del cliente.
- Nombre de archivo saneado (separadores, control, ≤ 120 caracteres); nunca se usa como ruta ni se registra.
- Errores del motor traducidos a categorías seguras: el mensaje original, los bytes y los stacks no llegan a logs, auditoría ni Sentry.
- Sin persistencia: el firmware vive solo en memoria durante la solicitud.

## 9. Auditoría y observabilidad

Colección `auditLog` (solo servidor), `targetType: "firmware"`:

| Acción                    | Cuándo                                                       |
| ------------------------- | ------------------------------------------------------------ |
| `firmware_patch_applied`  | Parche aplicado y auditado antes de entregar el binario.     |
| `firmware_patch_rejected` | Entrada rechazada tras autenticar (categoría en `reason`).   |
| `firmware_patch_failed`   | Falla del motor, salida inválida (`reason` seguro).          |

Metadata de `applied`: `role, model, family, container, patches, values, experimental, fullDump, mss0exp, inputSha256, outputSha256, inputSize, outputSize, durationMs`. `targetId` es el SHA-256 de entrada. Las razones de rechazo/falla son categorías (`invalid_upload`, `invalid_selection`, `experimental_not_acknowledged`, `model_undetected`, `model_unsupported`, `file_too_large`, `engine_rejected`, `engine_error`, `output_too_large`). No se auditan los rechazos por 401/403/404/429.

Logs estructurados (`pino`): `feature: "firmware-patcher"`, `uid`, `role`, `model`, `patchCount`, `durationMs`, `outcome`. Nunca bytes, nombres de archivo ni hashes. El `requestId` viaja en el header `x-request-id` de cada respuesta.

## 10. Límites

| Límite                       | Valor                                   |
| ---------------------------- | --------------------------------------- |
| Tamaño de entrada            | 4 MiB (4 194 304 bytes), no vacío       |
| Tamaño de salida             | 8 MiB                                   |
| Parches por solicitud        | 8                                       |
| Duración máxima              | `maxDuration = 10` s                    |
| Rate limit `firmwarePatch`   | 10 / minuto / usuario                   |
| Rate limit `firmwarePatchDaily` | 100 / día / usuario                  |
| Operaciones simultáneas      | 4 por instancia                         |
| Log de parches en header     | 4096 caracteres codificados             |

Los límites de tasa usan Upstash Redis cuando hay `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`; si no, un limitador local por proceso (no distribuido). `/detect` no consume el cupo de `/patch`.

**Plataforma (Vercel):** el límite de cuerpo de las funciones serverless es ~4.5 MB, por lo que un archivo de exactamente 4 MiB más el envoltorio multipart queda muy ajustado. Verificar el límite del plan desplegado antes de habilitar volcados grandes y bajar `maxInputBytes` si hace falta.

## 11. Pruebas y paridad

- Rutas/servidor: `npx vitest run src/app/api/admin/firmware-patcher src/lib/ratelimit.test.ts` (matriz de roles, Origin, flag, tamaño, multipart malformado, modelo no soportado, parche desconocido, experimental para ambos roles, volcado completo, MSS0, auditoría fail-closed, rate limit, headers, sin persistencia, sin campo de aviso legal). Los tests usan un motor simulado (`src/lib/firmware-patcher/server/test-support.ts`).
- Paridad contra Python (`scripts/firmware-parity.*`, bw-patcher 1.1.6 @ `95a8f33…`), vectores dorados MSS0 y detección: los entrega el motor (W1/W2); sin ese reporte la paridad está **UNVERIFIED**, no PASS.
- Línea base del repo (sin cambios por esta función): `npm run lint` con 14 errores/5 advertencias y 2 fallos en `uruguay-locations.test.ts`.

## 12. Operación: flags, despliegue y rollback

| Variable                                | Valor por defecto | Efecto                                      |
| --------------------------------------- | ----------------- | ------------------------------------------- |
| `FIRMWARE_PATCHER_ENABLED`              | `false`           | Habilita la API (servidor).                 |
| `NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED`  | `false`           | Habilita páginas y navegación (cliente).    |

Ambas deben ser exactamente `"true"`. Si alguna está apagada: la API devuelve 404, las páginas `notFound()` y se oculta la navegación. Las flags no son secretos. Habilitar en producción es una acción de aceptación de release del dueño del producto.

Checklist de despliegue:

1. Con ambas flags en `false`: `GET /api/admin/firmware-patcher/capabilities` → 404 (también anónimo).
2. Habilitar en preview; con sesión `technician` y `admin`: `capabilities` 200; `detect` con fixture; `patch` con fixture y comparar hashes del header contra el resultado esperado.
3. Con rol `user` y anónimo: 403 y 401.
4. Monitoreo: consultar `auditLog` por `firmware_patch_*`; alertar sobre `firmware_patch_failed`, 5xx y 503 de auditoría.
5. **Rollback:** poner ambas flags en `false`. No hay datos que limpiar.

Sin cambios en reglas de Firestore (`auditLog` ya es solo servidor).

## 13. Actualizar el upstream

No hay sincronización automática. Para actualizar: revisar el diff upstream, revalidar la licencia, regenerar `capabilities.ts`, reejecutar la paridad y reverificar. Registrar la nueva versión/commit aquí y en `PROVENANCE.md`.

## 14. Limitaciones conocidas

- Sin override manual de modelo; una detección ambigua se corrige en el código, no en la UI.
- Los parches experimentales (incluido `mss0exp`) no están validados físicamente.
- El motor es síncrono: `maxDuration` limita la solicitud pero no interrumpe un parcheo ya iniciado; el límite de 4 MiB y el tope de operaciones simultáneas acotan el costo.
- El limitador local no es distribuido cuando falta Upstash.
- No firma ni verifica firmas; la salida nunca debe describirse como oficial o validada por el fabricante.
