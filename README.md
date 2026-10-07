# Mashup Match V1.9.1 — corrección

Esta actualización corrige la V1.9 y verifica dos mejoras:

1. En **Relación tonal** aparece **Tonalidad relativa y exacta**.
2. En **Explorador armónico**, debajo de la rueda, aparece **Mapa cromático** con las 24 tonalidades, distancia en semitonos/tonos, relación armónica y cantidad de canciones.

La lógica también se inyecta desde `app.js` como respaldo si el navegador conserva temporalmente un `index.html` anterior.

Reemplazar en GitHub: `index.html`, `styles.css`, `app.js`.
No tocar `config.js`, `support-config.js`, `donations.js`, Supabase ni el Admin Local.


## V1.9.2
El modo `relative` ahora conserva la tonalidad base y suma su relativa.
Ejemplo: F major (7B) muestra F major (7B) + D minor (7A).
Las opciones `safe` y `wide` no fueron modificadas.
