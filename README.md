# Mi horario — Calendario personalizado

Página web con mi horario personal del **Wintersemester 2026/27** (intercambio
en Alemania): clases de la uni, clases de alemán y el domingo de repaso.
En línea: https://jaretjrd-source.github.io/calendario/

Hecha con **HTML, CSS y JavaScript puro**, en el mismo estilo "minimal técnico"
que mi [portafolio](https://jaretjrd-source.github.io/portafolio/).

## Qué hace

- Muestra la semana completa (lunes a domingo), de 8:00 a 19:00, con el número de semana (**KW**).
- Navegación entre semanas (botones ← → , flechas del teclado y botón "Hoy").
- Tarjeta de **lo próximo / lo que está pasando ahora** y línea roja con la hora actual.
- Cada actividad con su color; salón, edificio y profesor cuando aplica.
- Días con una nota en vez de horas (el domingo es de **repaso**).
- Cambios de salón por semana (p. ej. Image Processing del jueves pasa al 1.04 desde la KW 46).
- Modo oscuro automático según el sistema.

## Cómo editar el horario

Todo el horario está en [`js/horario.js`](js/horario.js). Para agregar una actividad,
cambiar un salón o registrar un cambio a partir de cierta semana, solo se edita
ese archivo.

## Cómo abrirla

Usa módulos ES, así que en local hay que abrirla con **Live Server** (VS Code),
no con doble clic en `index.html`.

## Progreso

- [x] Fase 0 — Carpeta del proyecto, estilo base del portafolio
- [x] Fase 1 — Datos del horario (`horario.js`)
- [x] Fase 2 — Vista semanal con cuadrícula y colores por actividad
- [x] Fase 3 — Navegación por semanas, "hoy", próxima actividad
- [x] Fase 4 — Horario personal completo: salón nuevo de Image Processing (Edif. 4 · 1.04 desde KW 46), alemán, domingo de repaso
- [x] Fase 5 — Publicado: https://jaretjrd-source.github.io/calendario/
- [ ] Fase 6 — Extras (opcional): exámenes, tareas, días festivos, exportar a .ics
