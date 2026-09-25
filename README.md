# Mashup Match V1.6 — Novedades primero + apoyo voluntario

Actualización incremental de V1.5: conserva catálogo, búsqueda, rueda Camelot, paginación, CSV, autocompletado y configuración existente. **No ejecutés SQL de nuevo ni modifiques `config.js` ni la Edge Function `music-metadata` que ya corregiste.** Las canciones actuales siguen almacenadas en Supabase.

## A. Actualizar GitHub Pages

1. Guardá una copia de los archivos actuales del repositorio o comprobá que podés volver a un commit anterior.
2. Extraé el ZIP de actualización. En GitHub > tu repositorio `mashup-match` > `Add file` > `Upload files`, arrastrá **los seis archivos de la raíz**:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `support-config.js` (nuevo)
   - `donations.js` (nuevo)
   - `README.md` (opcional)
3. Confirmá `Commit changes`. **No subas ni reemplaces `config.js`**, que ya contiene la conexión de tu sitio; tampoco copies `supabase.sql` ni cambies tu función de MusicBrainz.
4. Comprobá la versión publicada; si ves una versión antigua, probá `Ctrl + F5`.

### Cómo cambia el orden

Ahora al entrar aparece `Novedades (primero las nuevas)` en el selector **Ordenar**. Utiliza `created_at` de tu tabla `songs`: es el momento de ingreso a la base, no el año del tema ni la fecha de la última edición. Podés seguir ordenando por título, artista, BPM, año o por antigüedad. `Limpiar filtros` vuelve a novedades. La paginación de 24 por página sigue igual. En un CSV importado de un solo golpe, varias canciones pueden compartir momento de ingreso; el orden entre esas canciones del mismo lote no equivale necesariamente al orden de las filas del Excel.

## B. Crear y activar el botón de donaciones

El sitio **no procesa dinero ni tarjetas**. Sólo enlaza a tu perfil oficial de un servicio de apoyo externo. Todas las funciones siguen siendo gratuitas.

1. Creá tu página pública en https://ko-fi.com/ (alternativamente PayPal.Me, Cafecito o Buy Me a Coffee, si están disponibles para tu cuenta). Comprobá que podés recibir aportes desde tu país.
2. Si elegís Ko-fi y sólo querés propinas, revisá `Settings > Payment` y desactivá **Contributor / Standard** si querés la opción sin comisión de plataforma para donaciones puntuales; PayPal u otro procesador mantiene sus propias tarifas. Verificá las condiciones actuales en el servicio.
3. Editá **sólo** `support-config.js`, y reemplazá las comillas vacías por tu enlace REAL, por ejemplo:

```js
window.MASHUP_SUPPORT = {
  url: 'https://ko-fi.com/tuusuario'
};
```

4. Subí el `support-config.js` editado a la raíz de GitHub. Tras publicar, aparecerán un botón discreto `☕ Apoyar el proyecto` arriba y otro al final de la página. Si no ponés una URL válida, ambos botones permanecen ocultos y no hay enlaces que lleven a una cuenta equivocada.

El archivo de configuración de donaciones es público y **no contiene contraseñas, tokens ni claves privadas**. Poné sólo el enlace a tu perfil público. No pegues allí claves de PayPal ni códigos de acceso.

## C. Dominio personalizado (opcional, no incluido porque aún no compraste uno)

Tu GitHub Pages actual seguirá funcionando gratis. Si comprás un dominio como `mashupmatch.xyz` o `mashupmatch.com` (ejemplos, NO verificada la disponibilidad), no necesitás pagar alojamiento.

1. Elegí el dominio comprobando **el costo de renovación anual** además de la oferta inicial.
2. En GitHub > repositorio > `Settings > Pages > Custom domain`, guardá primero tu dominio. GitHub crea un archivo `CNAME` en la rama publicada si la publicación es desde `main`.
3. Después, en el panel DNS de tu registrador, si usás `www.tudominio.com`, creá un `CNAME` para `www` apuntando a `santiagorochanovas.github.io` (sin `/mashup-match`). Si también querés el dominio raíz `tudominio.com`, configurá los registros `A` de GitHub para `@`:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

4. Cuando el DNS se propague, en `Settings > Pages` activá `Enforce HTTPS`. El DNS puede tardar hasta 24 horas. Comprobá ambos nombres con y sin `www` según los DNS que hayas configurado.
5. Como publicamos desde una rama, dejá que GitHub maneje el archivo `CNAME`. Si publicás actualizaciones posteriores, **no borres** ese archivo de tu repositorio.

Documentación oficial: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## Nota sobre MusicBrainz y las donaciones

MusicBrainz ofrece su servicio web sin costo para usos no comerciales. Como ahora podrías recibir donaciones, verificá con MusicBrainz si tu uso concreto continúa dentro de sus condiciones antes de monetizar o ampliar tráfico; algunos datos tienen licencias distintas de los datos básicos. La V1.6 **no modifica** tu Edge Function, tu base ni las portadas que ya tienes.

Fuentes: https://musicbrainz.org/doc/MusicBrainz_API ; https://musicbrainz.org/doc/About/Data_License
