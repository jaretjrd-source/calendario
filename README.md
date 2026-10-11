# Mi horario — Calendario personalizado

Página web con mi horario personal del **Wintersemester 2026/27** (intercambio
en Alemania): clases de la uni, clases de alemán y el domingo de repaso.
En línea: https://jaretjrd-source.github.io/calendario/

Hecha con **HTML, CSS y JavaScript puro**, en el mismo estilo "minimal técnico"
que mi [portafolio](https://jaretjrd-source.github.io/portafolio/).

## Qué hace

- Muestra la semana completa (lunes a domingo), de 8:00 a 19:00, con el número de semana (**KW**).
- **Vista Semana | Mes.** En el mes, cada día muestra sus actividades en corto (hora + título)
  con su estado; clic en un día abre esa semana.
- Navegación (botones ← → , flechas del teclado y botón "Hoy"): por semana o por mes.
- **Barra lateral de resumen** del periodo visible: cumplidas, no cumplidas, por venir,
  % de cumplimiento y la lista de lo no cumplido (se puede marcar desde ahí).
- Tarjeta de **lo próximo / lo que está pasando ahora** y línea roja con la hora actual.
- Cada actividad con su color; salón, edificio y profesor cuando aplica.
- Días con una nota en vez de horas (el domingo es de **repaso**).
- Cambios de salón por semana (p. ej. Image Processing del jueves pasa al 1.04 desde la KW 46).
- **Mis eventos:** botón "+ Evento" (o clic en un hueco libre) para agregar uno con
  título, fecha, horario, lugar y persona, y opción de **repetir cada semana**.
  Clic en un evento para editarlo o borrarlo.
- **Cumplido / no cumplido:** cada actividad tiene un cuadrito. Cuando ya pasó su
  hora, la tarjeta se atenúa y el cuadrito queda **verde ✓** (cumplida, título tachado)
  o **rojo ✕** (no cumplida).
  Se puede marcar en cualquier momento, aunque ya haya pasado.
- Si el texto no cabe en la tarjeta, termina en "…"; al pasar el mouse se ve completo.
- Modo oscuro automático según el sistema.

## Cómo editar el horario

Todo el horario está en [`js/horario.js`](js/horario.js). Para agregar una actividad,
cambiar un salón o registrar un cambio a partir de cierta semana, solo se edita
ese archivo.

Los eventos que agrego desde la página y las casillas de cumplido se guardan en
el **navegador** (`localStorage`, ver [`js/guardado.js`](js/guardado.js)): solo
existen en el navegador/dispositivo donde los creé.

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
- [x] Fase 6 — Eventos propios (con repetición semanal) y marcar cumplido / no cumplido
- [x] Fase 7 — Vista mensual y barra lateral de resumen
- [ ] Fase 8 — Extras (opcional): sincronizar entre dispositivos, exportar a .ics, días festivos
