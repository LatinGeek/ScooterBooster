# Conectarse al MCP Server

La conexión a Mercado Pago MCP Server se realiza de manera remota a través del cliente que mejor se ajuste a tu integración. Consulta a continuación el paso a paso según el tipo de cliente.

::::TabsComponent

:::TabComponent{title="Cursor"}
Para instalar nuestro MCP en Cursor, puedes hacer clic en el botón a continuación o seguir los pasos manualmente.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=mcp-mercadopago-prod-oauth&config=eyJ1cmwiOiJodHRwczovL21jcC5tZXJjYWRvcGFnby5jb20vbWNwIn0%3D)

Abre el archivo `.cursor/mcp.json` y agrega la configuración del servidor de Mercado Pago tal como se muestra a continuación.

```json
{
  "mcpServers": {
  "mercadopago-mcp-server": {
  "url": "https://mcp.mercadopago.com/mcp"
  }
  }
}
```
Luego, dirígete a **Cursor Settings > Tools & MCPs** y habilita Mercado Pago MCP Server haciendo clic en **Connect**.

![Cursor Tools & MCP](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/11/5/1764949890252-cursormcp.png)

> WARNING
>
> Si Cursor no inicia la conexión al hacer clic en el botón indicado, utiliza el enlace **Needs authentication**, ubicado debajo del nombre del MCP. 

Al habilitar la conexión, serás redirigido a la web de Mercado Pago para realizar la autenticación, donde deberás indicar desde qué **país** estás operando y, si estás de acuerdo con los permisos otorgados, **autorizar la conexión**. 

Una vez concluidos estos pasos, volverás automáticamente a Cursor y la conexión a Mercado Pago MCP Server estará lista.

![mcp-installation-es-gif](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/4/27/1748367067297-mcpsuccessconfigcursor.png)

:::
:::TabComponent{title="VS Code"}

Abre VS Code y presiona **Cmnd + Shift + P**, si utilizas macOS, o **Ctrl + Shift + P**, si utilizas Windows. Esto te posicionará en la barra de búsqueda, ubicada en el margen superior, para que puedas buscar en tus configuraciones. 

Escribe **MCP: Add Server** y selecciona esa opción. Te será solicitada la siguiente información:
 1. **Tipo de servidor:** selecciona la opción **HTTP (HTTP or Server-Sent Events)**.
 2. **URL del servidor:** copia y pega la URL de Mercado Pago MCP Server.

 ```plain
 "https://mcp.mercadopago.com/mcp"
 ```
 3. **Nombre** para identificar el MCP: asígnale el que sea de tu preferencia.

Esto actualizará la información contenida en el archivo `.vscode/mcp.json` y, al cabo de unos segundos, abrirá una ventana emergente solicitando autorización para ser redirigido a la URL de Mercado Pago para tu autenticación.

![VS Code redirect](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/11/5/1764949890455-vscoderedirect.png)

Si esta ventana emergente no aparece automáticamente, puedes hacer clic en **Start** dentro del mismo archivo `.vscode/mcp.json` . 

Allí, deberás indicar desde qué **país** estás operando y, si estás de acuerdo con los permisos otorgados, **autorizar la conexión**. 

Una vez concluidos estos pasos, volverás automáticamente a VS Code y la conexión a Mercado Pago MCP Server estará lista.
:::
:::TabComponent{title="Windsurf"}
Puedes instalar nuestro MCP en Windsurf a través de la _MCP Store_ del editor, o bien manualmente. Elige la opción que mejor se adecúe a tus necesidades. 

### Instalación a través de la MCP Store

Sigue los pasos a continuación para instalar Mercado Pago MCP Server a través de la _MCP Store_ de Windsurf Editor.

1. Accede a la **MCP Store** en el menú superior derecho del editor.
2. En la pantalla de búsqueda, digita "MercadoPago" para encontrar a nuestro MCP Server.
4. Selecciona el servidor y haz clic en **Install**.
5. En la ventana emergente, ingresa el :toolTipComponent[_Access Token_]{content ="Clave privada de la aplicación creada en Mercado Pago y que se utiliza en el backend. Puedes acceder a ella a través de *Tus integraciones* > *Detalles de la aplicación* > *Pruebas* > *Credenciales de prueba* o *Producción* > *Credenciales de producción*." title="Access Token"} de la cuenta con la que quieres establecer la conexión. 
6. Guarda la configuración y aguarda el resultado.

![Instalación del MCP vía Windsurf Store](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/7/7/1754573349844-Windsurfmcpstore.gif)

Si el proceso fue exitoso, verás al MCP Server de Mercado Pago señalado como **Enabled** y estará listo para ser utilizado. Si, en cambio, observas que todavía no está habilitado, puedes hacer clic en **Refresh** para actualizar la configuración.

### Instalación manual

Si deseas realizar una instalación manual de Mercado Pago MCP Server en Windsurf Editor, abre el archivo `mcp_config.json` y agrega la configuración del servidor de Mercado Pago tal como se muestra a continuación. 

Completa el campo `authorization` con tu :toolTipComponent[_Access Token_]{content ="Clave privada de la aplicación creada en Mercado Pago y que se utiliza en el backend. Puedes acceder a ella a través de *Tus integraciones* > *Detalles de la aplicación* > *Pruebas* > *Credenciales de prueba* o *Producción* > *Credenciales de producción*." title="Access Token"}.

```json
{
  "mcpServers": {
  "mercadopago-mcp-server":{
  "serverUrl": "https://mcp.mercadopago.com/mcp",
  "headers": {
  "Authorization": "Bearer <ACCESS_TOKEN>"
  }
  }
  }
}
```

Al concluir estos pasos, Mercado Pago MCP Server estará listo para usar. Para verificar si la integración fue exitosa, accede a las configuraciones de tu cliente y confirma que el MCP esté señalado como disponible.

> WARNING
>
> Si al consultar las configuraciones de tu cliente IDE no encuentras un MCP Server asociado, verifica haber insertado el código correctamente y haz clic en el ícono de actualización. Si lo deseas, puedes consultar la [documentación de Windsurf](https://docs.codeium.com/windsurf/mcp) para más información.

:::
:::TabComponent{title="Claude Code"}

Para conectarte a Mercado Pago MCP Server desde Claude Code, utiliza el siguiente comando en tu terminal:

```bash
claude mcp add \
  --transport http \
  mercadopago \
  https://mcp.mercadopago.com/mcp
```

Luego, verifica la conexión ejecutando:

```bash
/mcp
```

Verás el MCP de Mercado Pago listado. Para autenticarte, haz clic en el enlace **needs authentication** que aparece debajo del nombre del MCP.

Al hacer clic, se abrirá una ventana emergente que te redirigirá a Mercado Pago para realizar la autenticación. En ese flujo, deberás indicar desde qué **país** estás operando y, si estás de acuerdo con los permisos otorgados, **autorizar la conexión**.

Una vez concluidos estos pasos, volverás automáticamente a Claude Code y la conexión a Mercado Pago MCP Server estará lista para usar.

:::
:::TabComponent{title="Otras IDEs"}

> WARNING
>
> Para configurar el MCP Server en otras IDEs, es obligatorio tener instalado el paquete NPM versión 6 o superior y utilizar NodeJS 20 o superior. 

Abre la IDE y busca el archivo JSON referente a servidores MCP. Después, completa el campo `authorization` con tu :toolTipComponent[_Access Token_]{content ="Clave privada de la aplicación creada en Mercado Pago y que se utiliza en el backend. Puedes acceder a ella a través de *Tus integraciones* > *Detalles de la aplicación* > *Pruebas* > *Credenciales de prueba* o *Producción* > *Credenciales de producción*." title="Access Token"}.

A continuación, puedes ver un ejemplo de cómo realizar esta configuración en **Cline**.

### Cline

Abre el archivo `cline_mcp_settings.json` y agrega la configuración del servidor de Mercado Pago como indicamos a continuación. Recuerda completar el campo `authorization` con tu :toolTipComponent[_Access Token_]{content ="Clave privada de la aplicación creada en Mercado Pago y que se utiliza en el backend. Puedes acceder a ella a través de *Tus integraciones* > *Detalles de la aplicación* > *Pruebas* > *Credenciales de prueba* o *Producción* > *Credenciales de producción*." title="Access Token"}. 

Si necesitas más información, visita la [documentación de Cline Desktop](https://docs.cline.bot/enterprise-solutions/mcp-servers).

```Cline
{
  "mcpServers": {
  "mercadopago-mcp-server": {
  "command": "npx",
  "args": [
  "-y",
  "mcp-remote",
  "https://mcp.mercadopago.com/mcp",
  "--header",
  "Authorization:${AUTH_HEADER}"
  ],
  "env": {
  "AUTH_HEADER": "Bearer <ACCESS_TOKEN>"
  }
  }
  }
}
```

Al concluir estos pasos, Mercado Pago MCP Server estará listo para usar. Para verificar si la integración fue exitosa, accede a las configuraciones de tu cliente IDE y confirma que el MCP esté señalado como disponible.

> WARNING
>
> Si al consultar las configuraciones de tu cliente IDE no encuentras un MCP Server asociado, verifica haber insertado el código correctamente y haz clic en el ícono de actualización.

:::
:::TabComponent{title="Otros clientes"}
En el caso de clientes que no sean una IDE, la conexión se realiza directamente en el panel de configuración. 

> WARNING
>
> Para configurar el MCP Server en otros clientes, es obligatorio tener instalado el paquete NPM versión 6 o superior y utilizar NodeJS 20 o superior.

#### Claude Desktop
Abre el archivo `claude_desktop_config.json` y agrega la configuración del servidor de Mercado Pago. Consulta la [documentación de Claude Desktop](https://modelcontextprotocol.io/quickstart/user) para más información.

```json
{
  "mcpServers": {
  "mercadopago-mcp-server": {
  "command": "npx",
  "args": [
  "-y",
  "mcp-remote",
  "https://mcp.mercadopago.com/mcp",
  "--header",
  "Authorization:${AUTH_HEADER}"
  ],
  "env": {
  "AUTH_HEADER": "Bearer <ACCESS_TOKEN>"
  }
  }
  }
}

```

#### OpenAI
Si utilizas la versión paga de OpenAI, es posible agregar Mercado Pago MCP Server entre las _tools_ disponibles de tu _Playground_. Sigue los pasos a continuación.

1. Ve a la sección _Playground_, ubicada en la esquina superior derecha de la pantalla.
2. En la sección _Prompts_, selecciona el ícono de adición (**+**) ubicado al lado de _Tools_.
3. A continuación, haz clic en **MCP Server**. Se abrirá un modal con opciones de MCPs para agregar. Selecciona el botón **+ Add new**.
4. Completa los campos del formulario con la información del MCP Server:

```json
URL: https://mcp.mercadopago.com/mcp
Label: Mercado Pago MCP Server
Authentication:
Access Token/Public Key: "Bearer <ACCESS_TOKEN>"
```
5. Con esto, el servidor estará conectado. En la pantalla con información del MCP, habilita la aprobación de las llamadas de _Tools_ y selecciona la _Tool_ que deseas utilizar, por ejemplo `search-documentation`.
6. Al final, haz clic en **Add**.
7. Realiza una llamada de prueba por ChatGPT.

Ve el ejemplo a continuación:

![OpenAI example](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/4/27/1748353483238-openaiplatformconnect.gif)

:::

::::

## Probar la conexión

Para probar la conexión al MCP Server, es necesario realizar una consulta con el asistente utilizando alguna de las _tools_ disponibles.

Por ejemplo, si deseas probar la _tool_ `search-documentation`, solo necesitas ejecutar el _prompt_ indicando qué información deseas buscar:

[[[
```plain
Busca en la documentación de Mercado Pago cómo integrar Checkout Pro
```
]]]

![mcp-server-test-es-gif](https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/4/28/1748435027045-searchdocpromptesh.gif)