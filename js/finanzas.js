// ===================================================
// Finanzas — datos y cálculos (sin dibujar nada)
// - Presupuesto mensual (en €)
// - Gastos: los que voy agregando
// - Gastos fijos: se repiten cada mes el mismo día (renta, seguro…)
// - Saldos de las cuentas
// Se guarda en el navegador (localStorage), igual que los eventos.
// ===================================================

import { leer, escribir } from "./guardado.js";
import { CUENTAS } from "./cuentas.js";
import { aISO, deISO, diasDelMes, sumarDias } from "./util.js";

const CLAVE = "calendario.finanzas";

// Cada monto está en la moneda de SU cuenta (Expatrio/efectivo €, Banamex MXN). No hay conversión.
// gastos: { id, fecha "AAAA-MM-DD", descripcion, monto, categoria, cuenta }
// fijos:  { id, descripcion, monto, dia (1–31), categoria, cuenta, desde "AAAA-MM" }
// bases:  { idCuenta: número } → saldo (o deuda) "de partida" de cada cuenta
let datos = {
  presupuesto: 0,
  gastos: [],
  fijos: [],
  bases: {},
  ...leer(CLAVE, {}),
};

function guardar() {
  escribir(CLAVE, datos);
}

const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const redondear = (n) => Math.round(n * 100) / 100;

export function cuentaPorId(id) {
  return CUENTAS.find((c) => c.id === id);
}

// ---------- Configuración ----------

export function obtenerConfig() {
  return { presupuesto: datos.presupuesto };
}

export function guardarConfig({ presupuesto }) {
  datos.presupuesto = presupuesto;
  guardar();
}

// Moneda de un gasto = la de la cuenta con que se pagó
export function monedaDe(gasto) {
  return cuentaPorId(gasto.cuenta)?.moneda ?? "EUR";
}

// ---------- Gastos ----------

export function guardarGasto(gasto) {
  gasto.id ??= nuevoId();
  datos.gastos = [...datos.gastos.filter((g) => g.id !== gasto.id), gasto];
  guardar();
}

export function borrarGasto(id) {
  datos.gastos = datos.gastos.filter((g) => g.id !== id);
  guardar();
}

// ---------- Gastos fijos ----------

export function obtenerFijos() {
  return datos.fijos;
}

export function guardarFijo(fijo) {
  fijo.id ??= nuevoId();
  datos.fijos = [...datos.fijos.filter((f) => f.id !== fijo.id), fijo];
  guardar();
}

export function borrarFijo(id) {
  datos.fijos = datos.fijos.filter((f) => f.id !== id);
  guardar();
}

// Fecha en que cae un gasto fijo en el mes de `fecha` (si el mes es corto,
// el día 31 cae el último día del mes)
function fechaDelFijo(fijo, fecha) {
  const dia = Math.min(fijo.dia, diasDelMes(fecha));
  return new Date(fecha.getFullYear(), fecha.getMonth(), dia);
}

// Ocurrencia de un fijo en el mes de `fecha`, como si fuera un gasto normal
function fijoComoGasto(fijo, fecha) {
  const cae = fechaDelFijo(fijo, fecha);
  const mes = aISO(cae).slice(0, 7);
  if (mes < fijo.desde) return null;
  return {
    ...fijo,
    id: `f${fijo.id}@${mes}`,
    fijoId: fijo.id,
    fecha: aISO(cae),
    fijo: true,
  };
}

// ---------- Consultas ----------

// Todos los gastos de un día (los míos + los fijos que caen ese día)
export function gastosDelDia(fecha) {
  const iso = aISO(fecha);
  const lista = datos.gastos.filter((g) => g.fecha === iso);
  for (const fijo of datos.fijos) {
    const g = fijoComoGasto(fijo, fecha);
    if (g && g.fecha === iso) lista.push(g);
  }
  return lista;
}

// Total de los gastos en una moneda (los de otra moneda no se suman)
export function totalDe(gastos, moneda = "EUR") {
  return redondear(gastos.filter((g) => monedaDe(g) === moneda).reduce((suma, g) => suma + g.monto, 0));
}

// Presupuesto que le toca a un conjunto de días: cada día recibe
// presupuesto mensual ÷ días de su mes. Así una semana que cruza dos meses
// toma su parte de cada uno.
export function presupuestoDe(dias) {
  return redondear(dias.reduce((suma, d) => suma + datos.presupuesto / diasDelMes(d), 0));
}

// Saldo actual de una cuenta (o deuda, si es de crédito).
// Solo cuentan los gastos con fecha de hoy o antes.
export function saldoDe(idCuenta) {
  const cuenta = cuentaPorId(idCuenta);
  const usado = movimientosHastaHoy(idCuenta);
  const base = datos.bases[idCuenta] ?? 0;
  return redondear(cuenta.credito ? base + usado : base - usado);
}

// "Ajustar": digo cuánto hay HOY en la cuenta (o cuánto debo) y se recalcula la base
export function ajustarSaldo(idCuenta, valorHoy) {
  const cuenta = cuentaPorId(idCuenta);
  const usado = movimientosHastaHoy(idCuenta);
  datos.bases[idCuenta] = redondear(cuenta.credito ? valorHoy - usado : valorHoy + usado);
  guardar();
}

function movimientosHastaHoy(idCuenta) {
  const hoy = aISO(new Date());
  let suma = 0;

  for (const g of datos.gastos) {
    if (g.cuenta === idCuenta && g.fecha <= hoy) suma += g.monto;
  }

  // Fijos: una vez por cada mes desde `desde` hasta hoy
  for (const fijo of datos.fijos) {
    if (fijo.cuenta !== idCuenta) continue;
    for (let mes = deISO(`${fijo.desde}-01`); aISO(mes) <= hoy; mes = sumarDias(mes, diasDelMes(mes))) {
      const g = fijoComoGasto(fijo, mes);
      if (g && g.fecha <= hoy) suma += g.monto;
    }
  }
  return redondear(suma);
}
