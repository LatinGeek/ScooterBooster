# Mercado Pago MCP Server

**Mercado Pago MCP Server** implementa el estándar abierto [Model Context Protocol (MCP)](https://modelcontextprotocol.io) para facilitar el acceso a las APIs y herramientas de Mercado Pago a agentes de IA o LLMs en entornos de desarrollo compatibles.

Este servidor actúa como un intermediario, traduciendo los recursos del ecosistema de Mercado Pago en _tools_, o funciones ejecutables que las aplicaciones de inteligencia artificial pueden invocar para realizar acciones, extendiendo las capacidades tradicionales de las APIs de Mercado Pago a flujos automatizados o asistidos por IA.

De esta forma, Mercado Pago MCP Server permite simplificar el proceso de integración, utilizar la documentación disponible para realizar implementaciones o mejoras de código, y optimizar su funcionamiento mediante interacciones en lenguaje natural y sin necesidad de implementaciones manuales.

Explora nuestra documentación para saber cómo realizar la conexión, cuáles son las _tools_ que el MCP Server de Mercado Pago tiene disponibles, y cómo utilizarlas para potenciar tus integraciones en nuestros casos de uso.

## Requisitos previos

Antes de empezar a utilizar el servidor, confirma que tienes todo el entorno listo: 

| Requisito | Descripción |
|-|-|
| **Cliente** | La conexión a Mercado Pago MCP Server es remota, por lo que necesitas elegir un cliente desde donde interactuar con el asistente. La solución está disponible para los principales agentes de IA: Cursor (versión 1 o superior), VS Code, Windsurf, Cline, Claude Desktop o Code y ChatGPT. En todos los casos, asegúrate de tener la última versión disponible.|
| **Credenciales** | Las credenciales son claves de acceso únicas con las que identificamos una integración en tu cuenta y serán necesarias para realizar la conexión con algunos clientes. Consulta la [documentación](/developers/es/docs/credentials) para saber más. |