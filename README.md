# Mashup Match · V1.4

Catálogo musical para mashups con búsqueda por BPM, tonalidad/Camelot, importación CSV y Explorador Armónico.

## Novedades de V1.4

- **Catálogo y Explorador Armónico separados en pestañas.** La portada vuelve a priorizar las carátulas y el buscador.
- **Paginación del catálogo.** Por defecto muestra 24 canciones por página, con opciones de 12, 24, 48 o 96.
- **Paginación compatible con filtros.** Cuando buscás, cambiás BPM, tonalidad u orden, vuelve automáticamente a la página 1 y pagina solamente los resultados.
- **Catálogos de más de 1000 canciones.** La aplicación ahora consulta Supabase por bloques para no depender del límite habitual de filas de una única petición.
- **Carga diferida de portadas.** Las imágenes siguen usando `loading="lazy"` y, gracias a la paginación, solamente se crean las tarjetas de la página visible.
- **Navegación cruzada.** “Abrir en Explorador Armónico” cambia a la pestaña del explorador, y “Buscar estas tonalidades” vuelve al catálogo con el filtro aplicado.
- **Cache busting.** `index.html` usa `?v=1.4` para `app.js` y `styles.css`, reduciendo los casos en los que GitHub Pages muestra recursos viejos en caché.

## Paginación

La cantidad predeterminada es **24 canciones por página**. El usuario puede elegir 12, 24, 48 o 96. Si hay 24 canciones o menos, los controles de páginas se ocultan automáticamente.

Ejemplos:

- 14 canciones → una sola vista, sin paginador.
- 25 canciones → 2 páginas a 24 por página.
- 100 canciones → 5 páginas a 24 por página.
- 1000 canciones → 42 páginas a 24 por página.

La búsqueda, los filtros de BPM/tonalidad y el ordenamiento se aplican antes de paginar.
