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
// gastos: { id, fecha "AAAA-MM-DD", descripcion, monto, categoria, cuenta, especial }
//   especial: true = compra especial → se descuenta de la cuenta, pero NO del presupuesto
// fijos:  { id, descripcion, monto, dia (1–31), categoria, cuenta, desde "AAAA-MM" }
// movimientos: { id, tipo: "deposito" | "pago", fecha, monto, cuenta, desde?, nota }
//   deposito → entra dinero a `cuenta`
//   pago     → se paga la tarjeta `cuenta` (crédito) con dinero de `desde` (débito)
//   No son gastos: no cuentan para el presupuesto.
// bases:  { idCuenta: número } → saldo (o deuda) "de partida" de cada cuenta
let datos = {
  presupuesto: 0,
  gastos: [],
  fijos: [],
  movimientos: [],
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

// ---------- Depósitos y pagos ----------

export function guardarMovimiento(mov) {
  mov.id ??= nuevoId();
  datos.movimientos = [...(datos.movimientos ?? []).filter((m) => m.id !== mov.id), mov];
  guardar();
}

export function borrarMovimiento(id) {
  datos.movimientos = (datos.movimientos ?? []).filter((m) => m.id !== id);
  guardar();
}

export function movimientosDelDia(fecha) {
  const iso = aISO(fecha);
  return (datos.movimientos ?? []).filter((m) => m.fecha === iso);
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

export function presupuestoMensual() {
  return datos.presupuesto;
}

// Total de gastos fijos de un mes en una moneda. Cuentan TODOS desde el día 1,
// aunque su día de cobro no haya llegado: se apartan del presupuesto del mes.
export function fijosDelMes(fecha, moneda = "EUR") {
  return redondear(
    datos.fijos
      .map((f) => fijoComoGasto(f, fecha))
      .filter((g) => g && monedaDe(g) === moneda)
      .reduce((suma, g) => suma + g.monto, 0)
  );
}

// Presupuesto semanal: lo que sobra del mes después de los fijos, repartido por día
// (sobrante ÷ días del mes). Así una semana que cruza dos meses toma su parte de cada uno.
export function presupuestoDe(dias) {
  return redondear(
    dias.reduce((suma, d) => suma + Math.max(0, datos.presupuesto - fijosDelMes(d)) / diasDelMes(d), 0)
  );
}

// Saldo actual de una cuenta (o deuda, si es de crédito).
// Solo cuenta lo que tenga fecha de hoy o antes.
// "Neto" = lo que salió (gastos, pagos hechos desde ella) − lo que entró (depósitos, pagos recibidos)
export function saldoDe(idCuenta) {
  const cuenta = cuentaPorId(idCuenta);
  const neto = netoHastaHoy(idCuenta);
  const base = datos.bases[idCuenta] ?? 0;
  return redondear(cuenta.credito ? base + neto : base - neto);
}

// "Ajustar": digo cuánto hay HOY en la cuenta (o cuánto debo) y se recalcula la base
export function ajustarSaldo(idCuenta, valorHoy) {
  const cuenta = cuentaPorId(idCuenta);
  const neto = netoHastaHoy(idCuenta);
  datos.bases[idCuenta] = redondear(cuenta.credito ? valorHoy - neto : valorHoy + neto);
  guardar();
}

function netoHastaHoy(idCuenta) {
  const hoy = aISO(new Date());
  let suma = 0;

  for (const m of datos.movimientos ?? []) {
    if (m.fecha > hoy) continue;
    if (m.tipo === "deposito" && m.cuenta === idCuenta) suma -= m.monto; // entra dinero
    if (m.tipo === "pago" && m.cuenta === idCuenta) suma -= m.monto;     // baja la deuda
    if (m.tipo === "pago" && m.desde === idCuenta) suma += m.monto;      // sale del débito
  }

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
