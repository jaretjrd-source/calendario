// ===================================================
// Utilidades compartidas: fechas (semana ISO = "KW"), dinero y DOM
// ===================================================

export const MS_DIA = 24 * 60 * 60 * 1000;
export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// ---------- Fechas ----------

// Lunes (a las 00:00) de la semana a la que pertenece `fecha`
export function lunesDe(fecha) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  d.setDate(d.getDate() - diaDe(d) + 1);
  return d;
}

// Día de la semana: 1 = lunes … 7 = domingo
export function diaDe(fecha) {
  return ((fecha.getDay() + 6) % 7) + 1;
}

// Lunes de la semana ISO `kw` del año `anio`.
// Regla ISO: la semana 1 es la que contiene el 4 de enero.
export function lunesDeKW(anio, kw) {
  const lunesSemana1 = lunesDe(new Date(anio, 0, 4));
  return sumarDias(lunesSemana1, (kw - 1) * 7);
}

// Número de semana ISO (KW) de una fecha
export function kwDe(fecha) {
  const jueves = sumarDias(lunesDe(fecha), 3); // el jueves define el año ISO
  const lunesSemana1 = lunesDe(new Date(jueves.getFullYear(), 0, 4));
  return Math.round((lunesDe(fecha) - lunesSemana1) / (7 * MS_DIA)) + 1;
}

export function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

export function mismoDia(a, b) {
  return a.toDateString() === b.toDateString();
}

// Date → "2026-10-11" (en hora local, no UTC)
export function aISO(fecha) {
  const p = (n) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
}

// "2026-10-11" → Date local
export function deISO(texto) {
  const [a, m, d] = texto.split("-").map(Number);
  return new Date(a, m - 1, d);
}

// "14:30" → minutos desde medianoche (870)
export function aMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function minutosDe(fecha) {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

export const fmtDia = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
export const fmtAnio = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });


// Último día del mes de `fecha` (28–31)
export function diasDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
}

export function primeroDeMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

// ---------- Dinero ----------

const fmtEUR = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const fmtMXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", currencyDisplay: "narrowSymbol" });

// 1926.5 → "1.926,50 €" · 1234 (MXN) → "$1,234.00 MXN"
export function dinero(monto, moneda = "EUR") {
  return moneda === "MXN" ? `${fmtMXN.format(monto)} MXN` : fmtEUR.format(monto);
}

// ---------- DOM ----------

export const $ = (id) => document.getElementById(id);

export function crear(tag, clase = "", texto = "") {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto) el.textContent = texto;
  return el;
}

// Lo que escribo en un formulario se muestra como texto, nunca como HTML
export function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
