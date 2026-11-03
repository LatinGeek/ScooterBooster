# Token Extractor (técnicos/admin)

Sección integrada en ScooterBooster para consultar Xiaomi Cloud y descargar
firmware BLE/MCU sin salir del panel. Está limitada a usuarios con rol
`admin` o `technician`.

## Acceso

- Admin: `/admin/token-extractor`
- Técnico: `/dashboard/technician/token-extractor`
- También aparece en el menú lateral de ambos paneles.

La página vuelve a comprobar el rol en el servidor y las rutas API vuelven a
comprobarlo en cada request. No basta con ocultar el enlace.

## Configuración

Añadir a `.env.local` y al entorno de producción:

```env
TOKEN_EXTRACTOR_SESSION_SECRET=<cadena-larga-y-aleatoria>
```

Si no se define, el backend usa `CRON_SECRET` como respaldo. Sin ninguno de los
dos, la sección responde con error de configuración. El secreto cifra la cookie
HTTPOnly que guarda la sesión de Xiaomi Cloud; no se guarda en Firestore.

## Flujo

1. El técnico/admin inicia sesión en ScooterBooster con su cuenta.
2. Abre Token Extractor.
3. Conecta Xiaomi Cloud con QR o usuario/contraseña.
   - Soporta captcha y 2FA por email.
   - La región no es el país: para Uruguay probar `i2`, `us` o todas.
4. Escanea una o todas las regiones.
5. Revisa dispositivos: nombre, modelo, DID, MAC, IP, token, BLE key y LTMK.
6. Los secretos están ocultos por defecto; se muestran con “Mostrar secretos”.
7. “Ver firmware” consulta `/v2/device/latest_ver` y muestra BLE/MCU.
8. La descarga pasa por el backend, valida host Xiaomi y MD5 antes de entregar
   el archivo.

## Rutas API

Todas viven bajo `/api/admin/token-extractor` y requieren sesión de ScooterBooster
con rol `admin` o `technician`:

| Método | Ruta |
|---|---|
| GET | `/session` |
| POST | `/logout` |
| POST | `/login/password` |
| POST | `/login/captcha` |
| POST | `/login/2fa` |
| POST | `/login/qr/start` |
| GET | `/login/qr/poll` |
| POST | `/scan` |
| POST | `/firmware/check` |
| POST | `/firmware/download` |

## Seguridad

- La sesión Xiaomi se cifra con AES-256-GCM y se guarda en una cookie HTTPOnly.
- El estado pendiente de captcha/2FA/QR también se cifra y caduca a los 10 min.
- Los intentos de login usan el rate limit `authIp` existente.
- Los POST validan el origen con `assertTrustedOrigin`.
- La descarga solo acepta HTTPS hacia dominios de Xiaomi y no sigue redirecciones.
- El backend comprueba MD5 antes de enviar el archivo.
- No se persisten credenciales ni tokens en disco.
- No se instala firmware: solo se descarga.
- El marcador `MITFOTA`/`TFOTA` se muestra como marcador, no como firma
  verificada.

## Limitaciones

- El endpoint OTA puede variar por región/modelo.
- No se ha validado contra una actualización oficial real del Mi 6 Base.
- La sesión Xiaomi caduca a las 2 horas.
- Si se despliega en múltiples instancias, el secreto debe ser idéntico en todas.
