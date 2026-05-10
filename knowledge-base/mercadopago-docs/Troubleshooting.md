# Troubleshooting

Al trabajar con el MCP Server de Mercado Pago, puedes encontrar problemas que interrumpan tu flujo de trabajo. Esta guía te ayudará a identificar, diagnosticar y resolver errores comunes rápidamente, garantizando una experiencia más fluida.

Si tienes problemas para conectarte al MCP, sigue estos pasos:

:::AccordionComponent{title="Verificar tu conexión de red"}
Asegúrate de que tu dispositivo esté conectado a internet y que no haya bloqueos que impidan el acceso al endpoint del MCP Server (`https://mcp.mercadopago.com/mcp`).
:::

:::AccordionComponent{title="Verificar tus credenciales"}
Para acceder al MCP Server, necesitas una credencial válida. Llama a una de nuestras APIs públicas para verificar tu credencial, por ejemplo la:TagComponent{tag="API" text="/v1/payment_methods" href="/developers/es/reference/online-payments/checkout-pro/payment-methods/get"}.

Mira cómo funciona en la práctica:

```bash
curl -X GET "https://api.mercadopago.com/v1/payment_methods" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

El resultado esperado es:

```json
[
  {
  "id": "visa",
  "name": "Visa",
  "payment_type_id": "credit_card",
  "status": "active",
  "secure_thumbnail": "https://www.mercadopago.com/org-img/MP3/API/logos/visa.gif",
  "thumbnail": "http://img.mlstatic.com/org-img/MP3/API/logos/visa.gif",
  "deferred_capture": "supported",
  "settings": {
  "card_number": {
  "length": 16,
  "validation": "standard"
  },
  "security_code": {
  "mode": "mandatory",
  "length": 3,
  "card_location": "back"
  }
  },
  "additional_info_needed": [
  {}
  ],
  "min_allowed_amount": 0.5,
  "max_allowed_amount": 60000,
  "accreditation_time": 2880,
  "financial_institutions": {},
  "processing_modes": "aggregator"
  }
]
```

Si recibes una respuesta diferente, tus credenciales pueden no ser válidas. En caso de que necesites obtener una nueva clave, sigue nuestra [documentación de credenciales](/developers/es/docs/credentials).
:::

:::AccordionComponent{title="Verificar la versión de Node.js"}
Para la mayoría de los clientes MCP, como Cursor, Claude y Windsurf, es necesario usar Node.js versión 20 o superior. Para verificar cuál es tu versión actual de Node.js, ejecuta:

```bash
node -v
```

El resultado mostrará la versión predeterminada de Node.js y lo esperado es que sea la versión 20 o superior. Si usas NVM (Node Version Manager), ejecuta los siguientes comandos para verificar las versiones instaladas y, si es necesario, instalar una nueva:

```bash
# Listar versiones instaladas de Node.js
nvm list

# Instalar Node.js 20
nvm install 20

# Desinstalar una versión específica (reemplaza XX por el número de versión)
nvm uninstall XX
```
:::

:::AccordionComponent{title="Verificar la instalación de NPX"}
NPX es una herramienta ejecutora de paquetes incluida en NPM (Node Package Manager) que se usa para conectarse al MCP Server de Mercado Pago.

### Verificar instalación de NPX

Para verificar si NPX ya está instalado, ejecuta:

```bash
npx --version
```

Si aparece un número de versión, significa que el paquete está instalado. En caso de recibir un error "command not found", instala o actualiza NPM, lo que incluye también NPX.

### Instalar o actualizar NPX

El paquete de NPX está incluido en NPM versión 5.2.0 y superior. Ejecuta el siguiente comando para instalar o actualizar ambos paquetes (NPM y NPX):

```bash
npm install -g npm
```

Después de la actualización, verifica la instalación:

```bash
npx --version
```

Si los problemas persisten, asegúrate de que tus instalaciones de Node.js y NPM estén actualizadas. Luego, verifica tu versión de NPM con el comando:

```bash
npm -v
```

Para más información, consulta la [documentación de NPX](https://www.npmjs.com/package/npx).
:::
:::::AccordionComponent{title="Verificar la versión de tu cliente"}
Para conectarse exitosamente con nuestro MCP Server, es importante contar siempre con la última versión disponible del cliente que estás utilizando. 

Para verificar esto y, de ser necesario, realizar una actualización, consulta el paso a paso según tu cliente de preferencia.

::::TabsComponent
:::TabComponent{title="Cursor"}

Para conocer cuál es la última versión disponible de Cursor, consulta su [_Changelog_](https://cursor.com/changelog). Luego, verifica tu versión de la aplicación según tu sistema operativo. 

### macOS

Puedes verificar la versión de Cursor que estás utilizando accediendo a **Cursor > About Cursor**. 

Si no coincide con la versión señalada en el _Changelog_, puedes forzar su actualización accediendo nuevamente al menú en la barra superior y haciendo clic en **Cursor > Check for updates**. Esto te guiará en el paso a paso necesario para realizarlo.

### Windows

Puedes verificar la versión de Cursor que estás utilizando accediendo al menú **Help > About Cursor**. 

Si no coincide con la versión señalada en el _Changelog_, puedes forzar su actualización accediendo nuevamente al menú en la barra superior y haciendo clic en **Help > Check for updates**. Esto te guiará en el paso a paso necesario para realizarlo.

:::
:::TabComponent{title="Windsurf"}
Para conocer cuál es la última versión disponible de Windsurf, consulta su [_Changelog_](https://windsurf.com/changelog). Luego, verifica tu versión de la aplicación según tu sistema operativo. 

### macOS

Puedes verificar la versión de Windsurf que estás utilizando accediendo a **Windsurf > About Windsurf**. 

Si no coincide con la versión señalada en el _Changelog_, puedes forzar su actualización accediendo nuevamente al menú en la barra superior y haciendo clic en **Windsurf > Check for updates**. Esto te guiará en el paso a paso necesario para realizarlo.

### Windows

Puedes verificar la versión de Windsurf que estás utilizando accediendo al menú **Help > About Windsurf**. 

Si no coincide con la versión señalada en el _Changelog_, puedes forzar su actualización accediendo nuevamente al menú en la barra superior y haciendo clic en **Help > Check for updates**. Esto te guiará en el paso a paso necesario para realizarlo.

:::
:::TabComponent{title="Otros clientes"}

Para verificar si hay actualizaciones disponibles en otros clientes, como **Claude Desktop** o **ChatGPT**, busca por las opción **Check for updates** en el menú superior de la aplicación. 

Si existe una actualización disponible, la aplicación te lo notificará y te permitirá instalarla. 

En caso de tener algún problema al realizar la actualización de esta forma, también puedes acceder al sitio oficial del cliente, descargar la versión más actualizada de la aplicación, y reemplazarla en tu sistema. 
:::
::::
:::::
:::AccordionComponent{title="Probar la conexión vía terminal"}
Si los problemas para conectarte persisten, prueba realizar la conexión al MCP Server a través del terminal con el comando:

```bash
npx -y mcp-remote@latest https://mcp.mercadopago.com/mcp --header 'Authorization:Bearer <ACCESS_TOKEN>'
```

La respuesta debería ser como el siguiente ejemplo:

```text
[22599] Using automatically selected callback port: 22476
[22599] Using custom headers: {"Authorization":"Bearer <ACCESS_TOKEN>"}
[22599] [22599] Connecting to remote server: https://mcp.mercadopago.com/mcp
[22599] Using transport strategy: http-first
[22599] Connected to remote server using StreamableHTTPClientTransport
[22599] Local STDIO server running
[22599] Proxy established successfully between local STDIO and remote StreamableHTTPClientTransport
[22599] Press Ctrl+C to exit
```

Los errores comunes en esta etapa son:

| Error | Descripción |
|-|-|
| ```ReferenceError: TransformStream is not defined```| Significa que estás usando una versión desactualizada de Node.js. Desinstala todas las versiones excepto una (versión 20 o superior). |
| ```command not found: npx``` | Significa que NPX no está instalado en tu sistema. Sigue las instrucciones en la sección **Verifica la instalación de NPX** para resolver este problema. | 

:::
:::::AccordionComponent{title=" Probar la conexión vía header de autenticación"}

Si tienes inconvenientes para conectar nuestro MCP Server en Cursor o VS Code, intenta cambiando el modo de autenticación. Para eso, sigue los pasos indicados para el cliente que estés utilizando. 

::::TabsComponent
:::TabComponent{title="Cursor"}

Para instalar nuestro MCP en Cursor vía _header_ de autenticación, puedes hacer clic en el botón a continuación o seguir los pasos manualmente.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=mercadopago-mcp-server&config=eyJ1cmwiOiJodHRwczovL21jcC5tZXJjYWRvcGFnby5jb20vbWNwIiwiaGVhZGVycyI6eyJBdXRob3JpemF0aW9uIjoiQmVhcmVyIDxBQ0NFU1NfVE9LRU4%252BIn19)

Abre el archivo `.cursor/mcp.json` y agrega la configuración del servidor de Mercado Pago. Consulta la [documentación de Cursor](https://docs.cursor.com/context/model-context-protocol) para más información.

Completa el campo `<authorization>` con tu :toolTipComponent[_Access Token_]{content ="Clave privada de la aplicación creada en Mercado Pago y que se utiliza en el backend. Puedes acceder a ella a través de *Tus integraciones* > *Detalles de la aplicación* > *Pruebas* > *Credenciales de prueba* o *Producción* > *Credenciales de producción*." title="Access Token"}.

```json
{
  "mcpServers": {
  "mercadopago-mcp-server-prod": {
  "url": "https://mcp.mercadopago.com/mcp",
  "headers": {
  "Authorization": "Bearer <ACCESS_TOKEN>"
  }
  }
  }
}
```

Al concluir estos pasos, Mercado Pago MCP Server debería estar listo para usar. Para verificar si la integración fue exitosa, accede a las configuraciones de tu cliente y confirma que el MCP esté señalado como disponible.
:::
:::TabComponent{title="VS Code"}

1. Abre VS Code y presiona **Cmnd + Shift + P**, si utilizas macOS, o **Ctrl + Shift + P**, si utilizas Windows. Esto te posicionará en la barra de búsqueda, ubicada en el margen superior, para que puedas buscar en tus configuraciones. 
2. Escribe **MCP: Open User Configuration**. Se abrirá automáticamente el archivo `mcp.json`, donde deberás agregar la configuración de Mercado Pago MCP Server tal como se muestra a continuación, completando el campo <authorization> con tu :toolTipComponent[_Access Token_]{content ="Clave privada de la aplicación creada en Mercado Pago y que se utiliza en el backend. Puedes acceder a ella a través de *Tus integraciones* > *Detalles de la aplicación* > *Pruebas* > *Credenciales de prueba* o *Producción* > *Credenciales de producción*." title="Access Token"}.

```json
{
  "servers": {
  "mcp-mercadopago": { 
  "command": "npx",
  "args": [
  "-y",
  "mcp-remote@latest",
  "https://mcp.mercadopago.com/mcp",
  "--header",
  "Authorization: Bearer <ACCESS_TOKEN>"
  ],
  }
  }
}
```

3. Guarda la configuración y accede a **Extensions > MCP Servers - Installed**, donde podrás visualizarlo. 
4. Haz clic en sus **Ajustes** y luego en **Start Server**. Se iniciará el proceso de conexión, que podrás seguir desde la consola.

Al finalizar, Mercado Pago MCP Server estará listo para usarse. Si llegara a haber algún error en el proceso, te será señalado y podrás hacer los ajustes necesarios.

:::
:::TabComponent{title="Claude Code"}

Si tienes inconvenientes con la autenticación OAuth en Claude Code, puedes conectarte utilizando tu :toolTipComponent[_Access Token_]{content ="Clave privada de la aplicación creada en Mercado Pago y que se utiliza en el backend. Puedes acceder a ella a través de *Tus integraciones* > *Detalles de la aplicación* > *Pruebas* > *Credenciales de prueba* o *Producción* > *Credenciales de producción*." title="Access Token"} de forma manual. Utiliza el siguiente comando:

```bash
claude mcp add \
  --transport http \
  mercadopago \
  https://mcp.mercadopago.com/mcp \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Luego, verifica la conexión ejecutando:

```bash
/mcp
```

Con este método de autenticación via credenciales, no se abrirá una ventana de autenticación OAuth. El MCP estará disponible inmediatamente tras su verificación.

:::
::::
:::::