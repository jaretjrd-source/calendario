# Calendario personalizado

Página con el horario personal de Jaret (clases de la uni, alemán, repaso; no solo
la uni) durante su intercambio en Alemania (Hochschule Zittau/Görlitz,
Wintersemester 2026/27; el horario empezó en la KW 41).

- **Stack:** HTML + CSS + JS puro (módulos ES), sin frameworks, igual que `../portafolio`.
- **Estilo:** "minimal técnico" del portafolio (Inter auto-alojada, acento `#3f5c74`,
  modo oscuro automático). Cada actividad tiene un color (`--azul`, `--violeta`, `--cian`, …).
- **Datos:** todo el horario vive en `js/horario.js`. `main.js` solo dibuja.
  - `ACTIVIDADES` = qué es (nombre, profe opcional, color).
  - `CLASES` = cuándo y dónde (`dia` 1 = lunes … 7 = domingo).
    Sin propiedad `salon` = no se muestra lugar; `salon: null` = "Sin salón";
    `cambios: [{ desde: KW, salon }]` = cambio a partir de esa semana
    (`salon: undefined` = por confirmar).
  - `DIAS_ESPECIALES` = días con una nota en vez de bloques (domingo = "Repaso").
- **Semanas:** se usa la semana ISO (KW), como en Alemania.

## Sobre Jaret

- Estudiante de Mecatrónica (Tec de Monterrey), de intercambio en Alemania.
- **Responder en español.** Principiante en desarrollo web y Git; explicar con calma.
- Trabaja por fases con checklist (ver README). Ser eficiente con tokens.
- GitHub: `jaretjrd-source` · correo (solo autoría de Git): jaret.jrd@gmail.com

## Pendiente

- Fecha de fin del semestre: no se sabe aún (la navegación no tiene límite hacia adelante).
- Ideas (Fase 6, opcional): exámenes, tareas, días festivos, exportar a .ics.
