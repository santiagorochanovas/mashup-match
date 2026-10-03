# Mashup Match V1.7 — actualización

Esta actualización mantiene Supabase, MusicBrainz, donaciones, importación CSV, paginación y Explorador Armónico.

## Cambios
- Los títulos se muestran y guardan con mayúscula inicial en cada palabra. Ejemplo: `Just the way you are` → `Just The Way You Are`.
- Las 187 canciones existentes se formatean visualmente al cargarse, sin modificar la base de datos. Si una canción existente se edita y guarda, el título corregido sí queda persistido.
- Los títulos importados por CSV también se normalizan antes de guardarse.
- El panel **Administrar** ahora abre en una ventana modal; login, autocompletado, formulario e importador ya no aparecen al final de la página.
- Editar una canción abre automáticamente el panel de administración.

## Instalación
Reemplazá en GitHub solamente:
- `index.html`
- `styles.css`
- `app.js`

No reemplaces `config.js`, `support-config.js`, `donations.js` ni la Edge Function de MusicBrainz. No hace falta tocar Supabase.
