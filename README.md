# Mashup Match

Catálogo web personal para buscar canciones por título, artista, BPM y tonalidad, con sugerencias para mashups usando la rueda Camelot.

## Qué incluye esta V1

- Búsqueda por título, artista, álbum, año, BPM o tonalidad.
- Filtros por tonalidad y rango de BPM.
- Página/modal de detalle por canción.
- Recomendaciones por:
  - misma tonalidad;
  - tonalidades vecinas en Camelot;
  - relativo mayor/menor;
  - BPM cercano;
  - relación half-time/double-time.
- Login de administrador.
- Alta, edición y borrado desde la propia web.
- Campo de versión (Original, Remix, Acapella, Instrumental, etc.).
- Base de datos PostgreSQL en Supabase.
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

## Portadas

En esta V1 se guarda una URL externa. Más adelante se puede automatizar la búsqueda de álbum/año/portada con MusicBrainz + Cover Art Archive sin guardar archivos pesados en tu hosting.

## Próximas mejoras recomendadas

- Búsqueda tolerante a errores/acentos.
- Importación masiva desde CSV.
- Detección local de BPM y tonalidad a partir de un audio, sin subirlo al servidor.
- Duración, género y energía opcionales.
- Favoritos/listas de mashups.
- Historial de combinaciones probadas.
- Etiquetas personalizadas.
- Auto-completado de metadata y portadas.
