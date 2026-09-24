# Mashup Match

Catálogo web personal para buscar canciones por título, artista, BPM y tonalidad, con sugerencias para mashups usando la rueda Camelot.

## Qué incluye esta V1.3

- Búsqueda por título, artista, álbum, año, BPM o tonalidad.
- Filtros por tonalidad y rango de BPM.
- Filtro de relación tonal con tres niveles:
  - tonalidad exacta;
  - compatibilidad segura;
  - exploración amplia.
- Explorador Armónico con rueda interactiva de 24 tonalidades.
- Conteo de canciones disponibles por tonalidad directamente en la rueda.
- Relaciones explicadas: misma tonalidad, relativa mayor/menor, vecinas de quinta/cuarta y parientes cercanos.
- Página/modal de detalle por canción.
- Recomendaciones por:
  - misma tonalidad;
  - tonalidad relativa mayor/menor;
  - tonalidades vecinas en Camelot / círculo de quintas;
  - relativas de las tonalidades vecinas como exploración amplia;
  - BPM cercano;
  - relación half-time/double-time.
- Cada ficha de canción incluye un mapa armónico y acceso directo al Explorador Armónico.
- Login de administrador.
- Alta, edición y borrado desde la propia web.
- Campo de versión (Original, Remix, Acapella, Instrumental, etc.).
- Base de datos PostgreSQL en Supabase.
- Importación masiva desde CSV con vista previa, validación y detección de duplicados.
- Plantilla CSV lista para Excel/Google Sheets.
- Portadas por URL, sin ocupar almacenamiento del sitio.

## 1. Crear Supabase

1. Creá un proyecto gratuito en https://supabase.com/
2. Abrí **SQL Editor** y ejecutá `supabase.sql`.
3. En **Authentication**, creá tu usuario administrador con email y contraseña.
4. Para una app personal, desactivá el registro público de usuarios.
5. En **Project Settings > API**, copiá:
   - Project URL
   - Publishable key (`sb_publishable_...`)
6. Pegalos en `config.js`.

> La Publishable key puede estar en el frontend cuando usás Row Level Security. Nunca pongas una Secret key ni una `service_role` key en el navegador.

## 2. Probar localmente

Abrir `index.html` directamente puede funcionar, pero es mejor usar un servidor local. Por ejemplo con VS Code + Live Server.

## 3. Publicar en GitHub Pages

1. Creá un repositorio.
2. Subí estos archivos.
3. En GitHub: **Settings > Pages**.
4. Elegí publicar desde la rama `main` y la carpeta raíz.
5. GitHub te dará una URL pública.

## Explorador Armónico

La rueda está pensada para descubrir ideas, no para afirmar que dos canciones necesariamente funcionarán juntas: el arreglo, la melodía, los acordes y el momento de la mezcla también importan.

Ejemplo con **F major · 7B**:

- **7B · F major**: misma tonalidad.
- **7A · D minor**: relativa menor; comparte las mismas siete notas.
- **6B · B♭ major** y **8B · C major**: vecinas por cuarta/quinta; comparten seis de siete notas.
- En modo **Amplio** también aparecen **6A · G minor** y **8A · A minor**, que son las relativas de esas tonalidades vecinas.

En el buscador, al elegir una tonalidad podés seleccionar **Solo tonalidad exacta**, **Compatibilidad segura** o **Exploración amplia**. Desde la rueda, el botón **Buscar estas tonalidades** aplica automáticamente el conjunto correspondiente al catálogo.

## Importar canciones por CSV

1. Iniciá sesión en **Administrar**.
2. En **Importación masiva**, descargá `plantilla-canciones.csv`.
3. Completala en Excel o Google Sheets sin cambiar los encabezados.
4. Guardala/exportala como CSV UTF-8.
5. Seleccioná el archivo en la web.
6. Revisá la vista previa: la app marca filas válidas, errores y duplicados.
7. Pulsá **Importar canciones**.

Columnas admitidas: `titulo`, `artista`, `bpm`, `tonalidad`, `version`, `album`, `año`, `portada`, `notas`.

La tonalidad puede escribirse como código Camelot (`8A`, `11B`) o como nombre habitual (`A minor`, `G# minor`, `C major`, etc.). El importador acepta CSV separado por coma, punto y coma o tabulación.

Los duplicados se detectan usando **título + artista + versión**. Por defecto se omiten, pero podés desmarcar esa opción antes de importar.

## Portadas

En esta V1 se guarda una URL externa. Más adelante se puede automatizar la búsqueda de álbum/año/portada con MusicBrainz + Cover Art Archive sin guardar archivos pesados en tu hosting.

## Próximas mejoras recomendadas

- Búsqueda tolerante a errores/acentos.
- Detección local de BPM y tonalidad a partir de un audio, sin subirlo al servidor.
- Duración, género y energía opcionales.
- Favoritos/listas de mashups.
- Historial de combinaciones probadas.
- Etiquetas personalizadas.
- Auto-completado de metadata y portadas.
