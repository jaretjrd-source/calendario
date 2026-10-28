// ===================================================
// Horario — datos de la semana (Wintersemester 2026/27)
// Aquí vive TODA la información: clases de la uni y mis otras actividades.
// Para cambiar algo del horario, solo se edita este archivo.
// ===================================================

// Semana del calendario (KW) en la que empieza el horario
export const SEMANA_INICIO = 41;
export const ANIO_INICIO = 2026;

// Actividades: nombre, persona a cargo (opcional) y color (cada una tiene el suyo)
export const ACTIVIDADES = {
  mpw:    { nombre: "Mechatronics Projekt Work",  profe: "Daniel Fiß",       color: "azul" },
  ann:    { nombre: "Artificial Neural Networks", profe: "Wolfgang Kästner", color: "violeta" },
  mc:     { nombre: "Microcontrollers",           profe: "Stefan Bischoff",  color: "verde" },
  ip:     { nombre: "Image Processing",           profe: "Stefan Bischoff",  color: "ambar" },
  cob:    { nombre: "Introduction to Cobots",     profe: "Daniel Fiß",       color: "rojo" },
  aleman: { nombre: "Clase de alemán",                                       color: "cian" },
};

// Bloques de la semana.
// id: identificador FIJO de cada bloque (las marcas de "cumplida" y las ediciones hechas
//     desde la página se guardan con él). No cambiarlo ni reutilizar uno borrado.
// dia: 1 = lunes … 7 = domingo
// edificio + salon: dónde es. salon: null = sin salón asignado.
//                   Si no se ponen, no se muestra lugar.
// cambios: a partir de la semana `desde`, el bloque usa otro salón
//          (salon: undefined = todavía no se sabe cuál)
export const CLASES = [
  // Lunes
  { id: "c0", materia: "mpw", dia: 1, inicio: "14:30", fin: "16:00", edificio: 4, salon: "0.03" },

  // Martes
  { id: "c1", materia: "ann", dia: 2, inicio: "10:00", fin: "11:30", edificio: 4, salon: "0.03" },
  { id: "c2", materia: "mc",  dia: 2, inicio: "14:30", fin: "16:00", edificio: 4, salon: "1.04" },

  // Miércoles
  { id: "c3", materia: "ip",  dia: 3, inicio: "08:00", fin: "09:30", edificio: 4, salon: "1.06" },
  { id: "c4", materia: "ann", dia: 3, inicio: "10:00", fin: "11:30", edificio: 4, salon: "1.06" },
  // (c5: Microcontrollers del miércoles 12:30 — cancelada, se quitó)

  // Jueves
  { id: "c6", materia: "cob", dia: 4, inicio: "08:00", fin: "09:30", edificio: 4, salon: "0.02" },
  {
    id: "c7", materia: "ip", dia: 4, inicio: "10:00", fin: "11:30", edificio: 4, salon: "0.02",
    cambios: [{ desde: 46, salon: "1.04" }],
  },
  { id: "c8", materia: "cob", dia: 4, inicio: "12:30", fin: "14:00", edificio: null, salon: null },

  // Alemán: lunes a viernes por la tarde y sábado al mediodía
  ...[1, 2, 3, 4, 5].map((dia) => ({ id: `c${8 + dia}`, materia: "aleman", dia, inicio: "17:00", fin: "18:00" })),
  { id: "c14", materia: "aleman", dia: 6, inicio: "12:00", fin: "13:00" },
];

// Días con una nota en lugar de bloques con hora
export const DIAS_ESPECIALES = {
  7: "Repaso",
};
