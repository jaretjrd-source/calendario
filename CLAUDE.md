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
- **Lo que agrega Jaret desde la página** (`js/guardado.js`, localStorage, solo en ese navegador):
  - Eventos: `{ id, titulo, fecha, inicio, fin, lugar, persona, repetir }`; con `repetir`
    se repite cada semana el mismo día desde `fecha`. Color fijo `--rosa`.
  - Cumplidas: claves `"idOcurrencia@AAAA-MM-DD"` (`c<índice en CLASES>` o `e<id evento>`).
    Al pasar la hora: tarjeta atenuada + cuadrito verde ✓ (y título tachado) o rojo ✕.
    (Jaret no quiso diagonales ni X encima de la tarjeta: prefiere algo limpio.)
- `main.js` junta clases fijas + eventos en "ocurrencias" por día y reparte en carriles
  las que se empalman.
- **Vistas:** semana (cuadrícula por horas) y mes (cuadrícula de días, actividades en corto).
  La vista elegida se recuerda (localStorage). La barra lateral `#resumen` resume el periodo
  visible (semana o mes) y lista lo no cumplido.
- **Finanzas** (modo "Gastos", se combina con "Horario"; `calendario.modos` en localStorage):
  - `js/cuentas.js` = CUENTAS (Expatrio €, Banamex Débito MXN, Banamex Crédito MXN → muestra deuda,
    Efectivo €) y CATEGORIAS.
  - `js/finanzas.js` = datos y cálculos (localStorage `calendario.finanzas`). Cada monto está en la
    moneda de su cuenta, SIN conversión (Jaret lo pidió así). Presupuesto en € → solo cuenta
    gastos en €; los de MXN se muestran aparte. Fijos se
    generan al vuelo cada mes desde `desde`. Saldo = base − gastos hasta hoy (crédito: base + gastos);
    "Ajustar" recalcula la base. Fijos en € se restan del MES completo desde el día 1 (no de la semana del cobro).
    Presupuesto semanal = (mensual − fijos del mes) ÷ días del mes × días de la semana;
    la semana solo cuenta gastos no fijos. Las cuentas sí descuentan el fijo el día del cobro.
    `especial: true` en un gasto = compra especial: se descuenta de la cuenta, NO del presupuesto
    (ni semana ni mes). Recuadro del mes (`bloqueMes`): presupuesto inicial, ahorro (Σ en semanas
    del mes ya terminadas de presupuesto semanal − gastado del día a día; puede ser negativo),
    gastado desglosado: GR (regular hasta hoy, incluye fijos cobrados), GE (TODAS las especiales
    del mes) y Total; cada uno por moneda (€ y MXN si hay)
    (sin signo +, Jaret lo pidió así). Ya no hay renglón ni lista aparte de compras especiales.
    `movimientos`: depósitos (`deposito: true` en CUENTAS) y pagos del crédito (`pagaDesde` →
    sale de Banamex Débito). Se ven en la fila de gastos del calendario (verdes); clic = borrar.
    No cuentan para el presupuesto. Botón "Ocultar" → clase `.ocultas` (montos con blur),
    guardado en `calendario.ocultarSaldos`.
  - `js/panel-finanzas.js` = barra lateral de finanzas, sección "Mis cuentas" (abajo de la página,
    NO en la barra lateral: ahí se veían muy chicas) + formularios (gasto, ⚙ presupuesto/fijos, cuenta).
  - `js/util.js` = fechas, `dinero()` y helpers de DOM compartidos.
- **Prácticas** (`js/practicas.js`, localStorage `calendario.practicas`): sección "Mis prácticas"
  siempre visible al final. `{ id, empresa, puesto, ciudad, fecha, enlace, estado: "activa"|"rechazada", nota }`.
  Cifras Activas / Rechazadas / Total; enlaces solo http(s).
- **Semanas:** se usa la semana ISO (KW), como en Alemania.

## Sobre Jaret

- Estudiante de Mecatrónica (Tec de Monterrey), de intercambio en Alemania.
- **Responder en español.** Principiante en desarrollo web y Git; explicar con calma.
- Trabaja por fases con checklist (ver README). Ser eficiente con tokens.
- GitHub: `jaretjrd-source` · correo (solo autoría de Git): jaret.jrd@gmail.com

## Pendiente

- Fecha de fin del semestre: no se sabe aún (la navegación no tiene límite hacia adelante).
- Eventos y cumplidas no se sincronizan entre dispositivos (localStorage).
- Ideas (Fase 10, opcional): sincronizar, exportar a .ics, días festivos.
