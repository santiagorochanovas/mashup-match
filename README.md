# Mashup Match V2.1 · Tempo inteligente

Esta actualización mejora el filtro de BPM del catálogo.

## Nuevo: equivalencia half-time / double-time
El filtro **Equivalencia BPM** viene activado por defecto.

Ejemplos:
- Buscar 70–80 BPM también incluye 140–160 BPM porque 140/2=70 y 160/2=80.
- Buscar 140–160 BPM también incluye 70–80 BPM porque 70×2=140 y 80×2=160.
- Si una canción entra sólo mediante equivalencia, su tarjeta muestra `↔ XX BPM equiv.`.
- Podés cambiar a **Solo BPM exacto** para recuperar el comportamiento anterior.

## Actualizar GitHub
Reemplazá únicamente:
- `index.html`
- `app.js`
- `styles.css`

No hace falta tocar Supabase, Admin Local, MusicBrainz, `config.js`, `support-config.js` ni `donations.js`.
