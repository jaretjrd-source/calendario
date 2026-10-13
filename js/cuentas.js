// ===================================================
// Cuentas y categorías de gastos
// Igual que horario.js: para agregar una cuenta o categoría, solo se edita aquí.
// (Los saldos, gastos y presupuesto se guardan desde la página, en finanzas.js)
// ===================================================

// moneda: "EUR" o "MXN" · credito: true = se muestra la deuda en vez del saldo
// deposito: true = tiene botón "+ Depósito" · pagaDesde: cuenta de la que sale el pago del crédito
export const CUENTAS = [
  { id: "expatrio",        nombre: "Expatrio", banco: "Expatrio", tipo: "Cuenta bloqueada", moneda: "EUR", deposito: true },
  { id: "banamex-debito",  nombre: "Débito",   banco: "Banamex",  tipo: "Débito",           moneda: "MXN", deposito: true },
  { id: "banamex-credito", nombre: "Crédito",  banco: "Banamex",  tipo: "Crédito",          moneda: "MXN", credito: true, pagaDesde: "banamex-debito" },
  { id: "efectivo",        nombre: "Efectivo", banco: "",         tipo: "Efectivo",         moneda: "EUR" },
];

export const CATEGORIAS = [
  "Comida",
  "Súper",
  "Renta",
  "Transporte",
  "Uni",
  "Ocio",
  "Salud",
  "Servicios",
  "Otros",
];
