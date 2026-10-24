# Mi espacio · Página de inicio

Página estática para GitHub Pages, sin servidor ni autenticación. Los enlaces se leen siempre de `data/links.json`. En el navegador solo se guardan preferencias, notas rápidas y la caché del tiempo.

## Gestionar enlaces

Para añadir, cambiar, ordenar o quitar un enlace, edita `data/links.json` y publica el cambio mediante un commit en el repositorio. El orden de las categorías y enlaces en el archivo determina su orden en la página.

Ejemplo de categoría:

```json
{
    "nombre": "IA y Desarrollo",
    "icono": "🤖",
    "enlaces": [
        {
            "nombre": "Claude",
            "url": "https://claude.ai/"
        }
    ]
}
```

El documento completo contiene un objeto con una lista `categorias`. Cada enlace necesita `nombre` y una `url` que comience por `https://` o `http://`. El campo `icono` es opcional: admite un emoji; si no se indica, se intenta cargar el favicon.

La página no permite editar enlaces ni crea copias de ellos en el navegador. Las configuraciones locales de versiones anteriores no sustituyen al archivo publicado.

## Abrir en local y publicar

Usa Live Server de VS Code (http://127.0.0.1:5500/index.html) o cualquier servidor de archivos estáticos. Abrir directamente con `file://` puede impedir cargar el JSON.

Publica los cambios mediante el flujo habitual del repositorio GitHub Pages. Las modificaciones locales no aparecen en la web pública hasta subirlas y completar el despliegue.

## Funciones

- Buscadores por iconos: Brave, Google y DuckDuckGo, con selección mediante ratón o flechas del teclado.
- Búsqueda de enlaces por nombre, categoría y URL, sin distinguir acentos.
- Temas oscuro, claro y automático; acento violeta, azul, menta o rosa.
- Notas rápidas en el layout principal, junto a los enlaces en escritorio y debajo en pantallas pequeñas (con acceso «Ir a notas»): texto de varias líneas, hasta 10.000 caracteres, guardado automático al escribir. Se conservan al cerrar y recargar en ese navegador; no se sincronizan ni se publican en GitHub. Al borrar los datos del sitio también se borran las notas.
- `Ctrl K` / `⌘ K` para buscar en Internet; `/` para filtrar enlaces; `Escape` limpia el filtro o cierra las preferencias.
- Los iconos web utilizan el servicio de favicons de Google, con un icono alternativo si falla.

Las preferencias se conservan en ese navegador. También se recuperan las preferencias de versiones anteriores, sin cargar sus copias de enlaces.

## Tiempo de Jaén

Open-Meteo se consulta con coordenadas fijas (37.7796, -3.7849), grados Celsius y hora de Europe/Madrid. Muestra temperatura, condiciones, mínima, máxima y probabilidad diaria de lluvia. El visor ofrece la sensación térmica y fecha completa al pasar el ratón.

Los datos se almacenan durante 30 minutos. El botón ↻ fuerza la actualización; también se comprueba al volver a la pestaña y cada 15 minutos mientras está visible. Si falla la conexión se muestran datos de hasta tres horas, marcados como sin actualizar, o se ofrece reintentar. No requiere geolocalización ni clave de API.

## Comprobaciones

Con Node.js:

```sh
node --check js/app.js
node --check js/weather.js
node --test tests/app.test.cjs tests/weather.test.cjs
```

Las pruebas usan un DOM mínimo y respuestas simuladas para verificar búsqueda, carga del JSON, preferencias y manejo del tiempo.
