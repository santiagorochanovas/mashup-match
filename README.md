# Mashup Match V1.5 · Autocompletar con MusicBrainz

Esta versión **conserva** las pestañas, el buscador, el Explorador Armónico, la paginación y el importador CSV de V1.4. Agrega un buscador de metadatos dentro de **Administrar**. No modifica la tabla `songs`, ni elimina datos existentes.

## Actualizar la web en GitHub (4 archivos)

En tu repositorio `mashup-match`, reemplazá **solamente** estos archivos por los del ZIP de actualización:

- `index.html`
- `styles.css`
- `app.js`
- `README.md` (opcional, sólo documentación)

No reemplaces `config.js`, no vuelvas a ejecutar `supabase.sql` y no hace falta modificar tus canciones actuales. Cuando GitHub Pages termine de publicar, recargá la página (Ctrl+F5 si seguís viendo la anterior).

**Importante:** la consulta automática requiere también el paso siguiente, que se realiza **una sola vez** en Supabase.

## Activar la función de metadatos en Supabase

MusicBrainz requiere que las aplicaciones se identifiquen mediante `User-Agent` y respeten un máximo de 1 petición por segundo. Como desde JavaScript del navegador no se puede configurar ese encabezado correctamente, las búsquedas pasan por una pequeña **Supabase Edge Function**. Así mantenemos el hosting gratuito, no publicamos ninguna clave privada y las búsquedas sólo están disponibles para usuarios conectados.

1. Entrá a tu proyecto de Supabase.
2. En el menú izquierdo abrí **Edge Functions**.
3. Elegí **Deploy a new function → Via Editor** (crear desde el editor).
4. Poné exactamente este nombre: **`music-metadata`**.
5. Borrá el código de ejemplo y pegá **todo** el contenido del archivo `edge-function/music-metadata/index.ts` incluido en este ZIP.
6. Pulsá **Deploy function**. Podés dejar habilitada la opción predeterminada de **Verify JWT**; la web invoca la función estando conectada como administrador. No tenés que agregar variables ni claves secretas nuevas.

El código incluye autorización con Supabase Auth, compatibilidad CORS para GitHub Pages, una cola por instancia para espaciar búsquedas y mensajes de error. Está diseñado para **consultas manuales de un administrador**, no para analizar o importar catálogos enteros de golpe.

> Si vas a monetizar/comercializar Mashup Match, verificá primero las condiciones de uso comercial de MusicBrainz y los derechos de las portadas.

## Cómo probarlo con “Bad Romance”

1. Entrá a tu web > **Administrar** e iniciá sesión.
2. En **Autocompletar con MusicBrainz**, buscá canción **Bad Romance** y artista **Lady Gaga**.
3. Elegí la grabación correspondiente entre los resultados (puede haber diferentes versiones).
4. Seleccioná **The Fame Monster**, si aparece entre los álbumes de ese resultado. MusicBrainz puede devolver grabaciones asociadas a diferentes lanzamientos.
5. La web comprueba si existe una portada en Cover Art Archive. Si no existe, dejá el campo de portada manual. Revisá el año sugerido: es el del lanzamiento elegido.
6. Pulsá **Aplicar al formulario**. Los datos se completan en campos vacíos, **sin guardar**. BPM, tonalidad, versión y notas permanecen exactamente como estaban.
7. Si querés reemplazar un campo ya completado, marcá la casilla **También reemplazar los campos que ya completé** antes de aplicar. Revisá todo y pulsá el **Guardar canción** habitual.

Para completar la portada o el álbum de una de tus canciones actuales, pulsá **Editar** en su tarjeta y después **Usar datos del formulario**. El botón no cambia los datos hasta que elijas el resultado, apliques y guardes. Si no te convence la sugerencia, **Descartar**.

## Sin cambios en Supabase SQL ni en `config.js`

- Guardamos **sólo** el título, artista, álbum, año y URL externa de portada en la tabla que ya existe.
- No almacenamos imágenes ni archivos MP3.
- Las portadas son enlaces a Cover Art Archive. Puede que algún lanzamiento no tenga portada; la vista previa lo indica.
- Los datos de MusicBrainz pueden contener reediciones y grabaciones duplicadas. La selección manual y la revisión son parte del flujo.
- Si tu sesión se cierra mientras buscás, iniciá sesión nuevamente.

**Limitación:** el buscador no estima BPM ni tonalidad; esos campos los seguís verificando vos. Las pruebas incluidas verifican el código con datos simulados, pero no pueden garantizar el estado en vivo de las APIs externas.

Referencias: https://musicbrainz.org/doc/MusicBrainz_API · https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting · https://musicbrainz.org/doc/Cover_Art_Archive/API · https://supabase.com/docs/guides/functions/quickstart-dashboard
