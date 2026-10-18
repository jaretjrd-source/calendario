// ===================================================
// Panel de finanzas — lo que se dibuja
// 1. Parte financiera de la barra lateral (presupuesto + cuentas)
// 2. Formulario de gasto
// 3. Formulario de presupuesto y gastos fijos
// 4. Formulario para ajustar el saldo de una cuenta
// ===================================================

import { CUENTAS, CATEGORIAS } from "./cuentas.js";
import {
  obtenerConfig, guardarConfig, guardarGasto, borrarGasto, obtenerFijos, guardarFijo,
  borrarFijo, gastosDelDia, totalDe, presupuestoDe, presupuestoMensual, fijosDelMes, saldoDe,
  ajustarSaldo, cuentaPorId,
  guardarMovimiento, borrarMovimiento,
} from "./finanzas.js";
import { leer, escribir } from "./guardado.js";
import {
  aISO, kwDe, lunesDe, sumarDias, diasDelMes, primeroDeMes, fmtDia, dinero, $, crear, escapar,
} from "./util.js";

let alCambiar = () => {}; // main.js pasa aquí su función para redibujar

export function iniciarFinanzas(redibujar) {
  alCambiar = redibujar;
  llenarSelects();
  conectarGasto();
  conectarAjustes();
  conectarCuenta();
  conectarMovimiento();

  // Ocultar / mostrar los montos de las cuentas (se recuerda en el navegador)
  $("btn-ocultar").addEventListener("click", () => {
    escribir(CLAVE_OCULTAR, !leer(CLAVE_OCULTAR, false));
    aplicarOcultar();
  });
}

const CLAVE_OCULTAR = "calendario.ocultarSaldos";

function aplicarOcultar() {
  const ocultar = leer(CLAVE_OCULTAR, false) === true;
  $("cuentas").classList.toggle("ocultas", ocultar);
  const btn = $("btn-ocultar");
  btn.textContent = ocultar ? "Mostrar" : "Ocultar";
  btn.setAttribute("aria-pressed", ocultar);
  btn.title = ocultar ? "Mostrar los saldos" : "Ocultar los saldos";
}

// ---------- 1. Barra lateral ----------

const fmtMes = new Intl.DateTimeFormat("es-MX", { month: "long" });
const mayuscula = (t) => t[0].toUpperCase() + t.slice(1);

// vista: "semana" | "mes" · dias: días visibles · mes: 1.º del mes de referencia
export function dibujarPanelFinanzas(cont, { vista, dias, mes }) {
  const { presupuesto } = obtenerConfig();
  cont.innerHTML = `
    <div class="panel__cabeza">
      <h2>Finanzas</h2>
      <button type="button" class="btn-icono" data-accion="ajustes" title="Presupuesto y gastos fijos"
              aria-label="Presupuesto y gastos fijos">⚙</button>
    </div>
  `;

  if (!presupuesto) {
    const aviso = crear("button", "aviso-presupuesto", "Define tu presupuesto mensual →");
    aviso.type = "button";
    aviso.dataset.accion = "ajustes";
    cont.append(aviso);
  } else {
    const diasMes = Array.from({ length: diasDelMes(mes) }, (_, i) => sumarDias(mes, i));

    if (vista === "semana") {
      cont.append(bloqueSemana(`Semana · KW ${kwDe(dias[0])}`, dias));
      cont.append(bloqueMes(`${mayuscula(fmtMes.format(mes))} completo`, mes, diasMes));
    } else {
      cont.append(bloqueMes(mayuscula(fmtMes.format(mes)), mes, diasMes));
      cont.append(semanasDelMes(mes, diasMes));
    }
  }

  const nuevo = crear("button", "btn-principal btn-ancho", "+ Gasto");
  nuevo.type = "button";
  nuevo.dataset.accion = "gasto";
  cont.append(nuevo);

  cont.querySelectorAll("[data-accion]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.accion === "ajustes") abrirAjustes();
      if (btn.dataset.accion === "gasto") abrirGasto(null, aISO(elegirFecha(dias)));
    });
  });
}

// Cuadros de cuentas (sección "Mis cuentas", abajo de la página)
export function dibujarCuentas(cont) {
  cont.innerHTML = "";
  for (const cuenta of CUENTAS) cont.append(tarjetaCuenta(cuenta));
  aplicarOcultar();
}

// Fecha por defecto para un gasto nuevo: hoy si está a la vista, si no el primer día visible
function elegirFecha(dias) {
  const hoy = aISO(new Date());
  return dias.find((d) => aISO(d) === hoy) ?? dias[0];
}

// Lo gastado en € (cuenta para el presupuesto) y en MXN (se muestra aparte)
// Gastos del día a día (sin fijos ni compras especiales): en € cuentan para la semana;
// en MXN se muestran aparte
function gastadoEn(dias) {
  const gastos = dias.flatMap(gastosDelDia).filter((g) => !g.fijo && !g.especial);
  return { eur: totalDe(gastos, "EUR"), mxn: totalDe(gastos, "MXN") };
}

// Semanas del mes: cada una solo con sus días que caen dentro del mes
function semanasDe(mes, diasMes) {
  const semanas = [];
  for (let lunes = lunesDe(mes); lunes <= diasMes.at(-1); lunes = sumarDias(lunes, 7)) {
    semanas.push({ lunes, dias: diasMes.filter((d) => d >= lunes && d < sumarDias(lunes, 7)) });
  }
  return semanas;
}

// Ahorro: en cada semana del mes que YA terminó, lo que sobró de su presupuesto
// (si en una semana me pasé, ese exceso se resta)
function ahorroDe(mes, diasMes) {
  const hoy = aISO(new Date());
  let ahorro = 0;
  for (const { dias } of semanasDe(mes, diasMes)) {
    if (aISO(dias.at(-1)) >= hoy) continue; // la semana todavía no termina
    ahorro += presupuestoDe(dias) - gastadoEn(dias).eur;
  }
  return Math.round(ahorro * 100) / 100;
}

function bloquePresupuesto(titulo, presup, gastado, detalles) {
  const resto = presup - gastado;
  const pct = presup ? Math.min(100, (gastado / presup) * 100) : 0;

  const el = crear("div", `presupuesto${resto < 0 ? " excedido" : ""}`);
  el.innerHTML = `
    <p class="presupuesto__titulo">${titulo}</p>
    <p class="presupuesto__resto">${resto < 0 ? `Te pasaste por ${dinero(-resto)}` : `Quedan ${dinero(resto)}`}</p>
    <div class="resumen__barra" role="img" aria-label="Gastado ${Math.round(pct)}%"><div style="width: ${pct}%"></div></div>
    ${detalles.filter(Boolean).map((d) => `<p class="presupuesto__detalle">${d}</p>`).join("")}
  `;
  return el;
}

// Semana: su parte del sobrante del mes (presupuesto − fijos) contra lo gastado en el día a día
function bloqueSemana(titulo, dias) {
  const presup = presupuestoDe(dias);
  const { eur, mxn } = gastadoEn(dias);
  return bloquePresupuesto(titulo, presup, eur, [
    `Gastado ${dinero(eur)} de ${dinero(presup)}`,
    mxn && `En pesos: ${dinero(mxn, "MXN")}`,
  ]);
}

// Mes: presupuesto inicial, ahorro y lo gastado hasta hoy desglosado en
// GR (gasto regular: día a día + fijos ya cobrados) y GE (gasto especial ★)
function bloqueMes(titulo, mes, diasMes) {
  const hoy = aISO(new Date());
  const hastaHoy = diasMes.flatMap(gastosDelDia).filter((g) => g.fecha <= hoy);
  const regulares = hastaHoy.filter((g) => !g.especial);
  const especiales = hastaHoy.filter((g) => g.especial);
  const gr = totalDe(regulares, "EUR");
  const ge = totalDe(especiales, "EUR");
  const ahorro = ahorroDe(mes, diasMes);
  const mxn = totalDe(hastaHoy, "MXN");

  const el = crear("div", "presupuesto mes-resumen");
  el.innerHTML = `
    <p class="presupuesto__titulo">${titulo}</p>
    <dl class="mes-resumen__datos">
      <div><dt>Presupuesto inicial</dt><dd>${dinero(presupuestoMensual())}</dd></div>
      <div class="${ahorro < 0 ? "negativo" : "positivo"}">
        <dt>Ahorro <small>semanas terminadas</small></dt><dd>${dinero(ahorro)}</dd>
      </div>
      <div class="mes-resumen__gastado">
        <dt>Gastado hasta hoy</dt>
        <dd>
          <span class="desglose"><abbr title="Gasto regular">GR</abbr><span>${dinero(gr)}</span></span>
          <span class="desglose"><abbr title="Gasto especial">GE</abbr><span>${dinero(ge)}</span></span>
          <span class="desglose desglose--total"><span>Total</span><span>${dinero(gr + ge)}</span></span>
        </dd>
      </div>
    </dl>
    ${mxn ? `<p class="presupuesto__detalle">En pesos: ${dinero(mxn, "MXN")}</p>` : ""}
  `;
  return el;
}

// Vista mensual: cómo va cada semana (KW) del mes
function semanasDelMes(mes, diasMes) {
  const cont = crear("div", "semanas");
  cont.append(crear("p", "presupuesto__titulo", "Por semana"));

  for (const { lunes, dias } of semanasDe(mes, diasMes)) {
    const presup = presupuestoDe(dias);
    const { eur: gastado } = gastadoEn(dias);
    const pct = presup ? Math.min(100, (gastado / presup) * 100) : 0;

    const fila = crear("div", `semana-fila${gastado > presup ? " excedido" : ""}`);
    fila.innerHTML = `
      <span class="semana-fila__kw">KW ${kwDe(lunes)}</span>
      <span class="semana-fila__dias">${fmtDia.format(dias[0])}–${fmtDia.format(dias.at(-1))}</span>
      <span class="semana-fila__monto">${dinero(gastado)} / ${dinero(presup)}</span>
      <div class="resumen__barra"><div style="width: ${pct}%"></div></div>
    `;
    cont.append(fila);
  }
  return cont;
}

function tarjetaCuenta(cuenta) {
  const monto = saldoDe(cuenta.id);
  const el = crear("article", `cuenta${cuenta.credito ? " cuenta--credito" : ""}`);
  el.innerHTML = `
    <div class="cuenta__cabeza">
      <div>
        <p class="cuenta__banco">${cuenta.banco || "En mano"}</p>
        <h3>${cuenta.nombre}</h3>
      </div>
      <span class="cuenta__tipo">${cuenta.tipo}</span>
    </div>
    <p class="cuenta__etiqueta">${cuenta.credito ? "Deuda actual" : "Saldo actual"}</p>
    <p class="cuenta__monto">${dinero(monto, cuenta.moneda)}</p>
  `;
  const botones = crear("div", "cuenta__botones");

  // Depósito (Expatrio, Débito) o Pagar (Crédito): la acción principal de la tarjeta
  if (cuenta.deposito || cuenta.pagaDesde) {
    const tipo = cuenta.pagaDesde ? "pago" : "deposito";
    const accion = crear("button", "btn-principal", tipo === "pago" ? "Pagar" : "+ Depósito");
    accion.type = "button";
    accion.setAttribute("aria-label", `${tipo === "pago" ? "Pagar" : "Depositar en"} ${nombreCuenta(cuenta)}`);
    accion.addEventListener("click", () => abrirMovimiento(tipo, cuenta.id));
    botones.append(accion);
  }

  const btn = crear("button", "", "Ajustar");
  btn.type = "button";
  btn.setAttribute("aria-label", `Ajustar ${cuenta.credito ? "deuda" : "saldo"} de ${nombreCuenta(cuenta)}`);
  btn.addEventListener("click", () => abrirCuenta(cuenta.id));
  botones.append(btn);

  el.append(botones);
  return el;
}

// "Banamex Débito", "Expatrio", "Efectivo"
export function nombreCuenta(c) {
  return c.banco && c.banco !== c.nombre ? `${c.banco} ${c.nombre}` : c.nombre;
}

// ---------- Opciones de los <select> ----------

function llenarSelects() {
  for (const sel of document.querySelectorAll("select[name=categoria]")) {
    sel.innerHTML = CATEGORIAS.map((c) => `<option>${c}</option>`).join("");
  }
  for (const sel of document.querySelectorAll("select[name=cuenta]")) {
    sel.innerHTML = CUENTAS
      .map((c) => `<option value="${c.id}">${nombreCuenta(c)} (${c.moneda})</option>`)
      .join("");
  }
}

// ---------- 2. Formulario de gasto ----------

const dlgGasto = $("dialogo-gasto");
const formGasto = $("form-gasto");
let gastoEditando = null;

export function abrirGasto(gasto, fecha) {
  if (gasto?.fijo) return abrirAjustes(); // los fijos se editan en Presupuesto
  gastoEditando = gasto;
  const d = gasto ?? { descripcion: "", monto: "", fecha, categoria: CATEGORIAS[0], cuenta: CUENTAS[0].id, especial: false };
  $("gasto-titulo").textContent = gasto ? "Editar gasto" : "Nuevo gasto";
  formGasto.descripcion.value = d.descripcion;
  formGasto.monto.value = d.monto;
  formGasto.fecha.value = d.fecha;
  formGasto.categoria.value = d.categoria;
  formGasto.cuenta.value = d.cuenta;
  formGasto.especial.checked = d.especial === true;
  $("btn-borrar-gasto").hidden = !gasto;
  actualizarMoneda(formGasto);
  dlgGasto.showModal();
  formGasto.descripcion.focus();
}

// La etiqueta del monto dice la moneda de la cuenta elegida: "Monto (€)" o "Monto (MXN)"
function actualizarMoneda(form) {
  const moneda = cuentaPorId(form.cuenta.value).moneda;
  form.querySelector(".moneda-monto").textContent = moneda === "MXN" ? "MXN" : "€";
}

function conectarGasto() {
  formGasto.cuenta.addEventListener("change", () => actualizarMoneda(formGasto));

  formGasto.addEventListener("submit", (e) => {
    e.preventDefault();
    guardarGasto({
      id: gastoEditando?.id,
      descripcion: formGasto.descripcion.value.trim(),
      monto: Number(formGasto.monto.value),
      fecha: formGasto.fecha.value,
      categoria: formGasto.categoria.value,
      cuenta: formGasto.cuenta.value,
      especial: formGasto.especial.checked,
    });
    dlgGasto.close();
    alCambiar();
  });

  $("btn-cancelar-gasto").addEventListener("click", () => dlgGasto.close());
  $("btn-borrar-gasto").addEventListener("click", () => {
    if (!confirm(`¿Borrar el gasto "${gastoEditando.descripcion}"?`)) return;
    borrarGasto(gastoEditando.id);
    dlgGasto.close();
    alCambiar();
  });
}

// ---------- 3. Presupuesto y gastos fijos ----------

const dlgAjustes = $("dialogo-finanzas");
const formAjustes = $("form-finanzas");
const formFijo = $("form-fijo");

export function abrirAjustes() {
  formAjustes.presupuesto.value = obtenerConfig().presupuesto || "";
  $("presupuesto-ok").textContent = "";
  actualizarMoneda(formFijo);
  dibujarFijos();
  dlgAjustes.showModal();
}

function dibujarFijos() {
  const lista = $("lista-fijos");
  lista.innerHTML = "";
  const fijos = obtenerFijos();
  if (fijos.length === 0) {
    lista.append(crear("li", "fijos__vacio", "Todavía no hay gastos fijos."));
    return;
  }
  for (const f of fijos) {
    const cuenta = cuentaPorId(f.cuenta);
    const li = crear("li", "fijo");
    li.innerHTML = `
      <span><strong>${escapar(f.descripcion)}</strong>
      <small>${dinero(f.monto, cuenta.moneda)} · día ${f.dia} · ${f.categoria} · ${nombreCuenta(cuenta)}</small></span>
    `;
    const btn = crear("button", "btn-peligro", "Quitar");
    btn.type = "button";
    btn.addEventListener("click", () => {
      if (!confirm(`¿Quitar "${f.descripcion}" de los gastos fijos?`)) return;
      borrarFijo(f.id);
      dibujarFijos();
      alCambiar();
    });
    li.append(btn);
    lista.append(li);
  }
}

function conectarAjustes() {
  formFijo.cuenta.addEventListener("change", () => actualizarMoneda(formFijo));
  formAjustes.addEventListener("submit", (e) => {
    e.preventDefault();
    guardarConfig({ presupuesto: Number(formAjustes.presupuesto.value) || 0 });
    $("presupuesto-ok").textContent = "Guardado ✓"; // la ventana sigue abierta para los fijos
    alCambiar();
  });
  $("btn-cerrar-finanzas").addEventListener("click", () => dlgAjustes.close());

  formFijo.addEventListener("submit", (e) => {
    e.preventDefault();
    guardarFijo({
      descripcion: formFijo.descripcion.value.trim(),
      monto: Number(formFijo.monto.value),
      dia: Number(formFijo.dia.value),
      categoria: formFijo.categoria.value,
      cuenta: formFijo.cuenta.value,
      desde: aISO(primeroDeMes(new Date())).slice(0, 7), // empieza a contar este mes
    });
    formFijo.reset();
    llenarSelects();
    actualizarMoneda(formFijo);
    dibujarFijos();
    alCambiar();
  });
}

// ---------- 4. Ajustar saldo de una cuenta ----------

const dlgCuenta = $("dialogo-cuenta");
const formCuenta = $("form-cuenta");
let cuentaEditando = null;

function abrirCuenta(id) {
  cuentaEditando = cuentaPorId(id);
  $("cuenta-titulo").textContent = nombreCuenta(cuentaEditando);
  $("cuenta-etiqueta").textContent = cuentaEditando.credito
    ? `¿Cuánto debes hoy? (${cuentaEditando.moneda})`
    : `¿Cuánto tienes hoy? (${cuentaEditando.moneda})`;
  formCuenta.valor.value = saldoDe(id);
  dlgCuenta.showModal();
  formCuenta.valor.select();
}

function conectarCuenta() {
  formCuenta.addEventListener("submit", (e) => {
    e.preventDefault();
    ajustarSaldo(cuentaEditando.id, Number(formCuenta.valor.value) || 0);
    dlgCuenta.close();
    alCambiar();
  });
  $("btn-cancelar-cuenta").addEventListener("click", () => dlgCuenta.close());
}

// ---------- 5. Depósitos y pagos de la tarjeta ----------

const dlgMov = $("dialogo-movimiento");
const formMov = $("form-movimiento");
let movTipo = "deposito";
let movCuenta = null;

function abrirMovimiento(tipo, idCuenta) {
  movTipo = tipo;
  movCuenta = cuentaPorId(idCuenta);
  const origen = tipo === "pago" ? cuentaPorId(movCuenta.pagaDesde) : null;

  $("mov-titulo").textContent = tipo === "pago"
    ? `Pagar ${nombreCuenta(movCuenta)}`
    : `Depósito a ${nombreCuenta(movCuenta)}`;
  formMov.querySelector(".moneda-monto").textContent = movCuenta.moneda === "MXN" ? "MXN" : "€";
  $("mov-nota").textContent = tipo === "pago"
    ? `Baja la deuda y se descuenta de ${nombreCuenta(origen)} (saldo hoy: ${dinero(saldoDe(origen.id), origen.moneda)}). Se registra en el calendario ese día.`
    : "Se suma al saldo de la cuenta y se registra en el calendario ese día.";

  formMov.reset();
  formMov.fecha.value = aISO(new Date());
  // Para pagar, sugerir la deuda completa
  if (tipo === "pago") formMov.monto.value = Math.max(0, saldoDe(movCuenta.id)) || "";
  dlgMov.showModal();
  formMov.monto.focus();
}

// Clic en un depósito o pago del calendario → se puede borrar
export function abrirMovimientoGuardado(mov) {
  const cuenta = cuentaPorId(mov.cuenta);
  const que = mov.tipo === "pago" ? `el pago de ${nombreCuenta(cuenta)}` : `el depósito a ${nombreCuenta(cuenta)}`;
  if (!confirm(`¿Borrar ${que} por ${dinero(mov.monto, cuenta.moneda)}?`)) return;
  borrarMovimiento(mov.id);
  alCambiar();
}

function conectarMovimiento() {
  formMov.addEventListener("submit", (e) => {
    e.preventDefault();
    guardarMovimiento({
      tipo: movTipo,
      fecha: formMov.fecha.value,
      monto: Number(formMov.monto.value),
      cuenta: movCuenta.id,
      desde: movTipo === "pago" ? movCuenta.pagaDesde : undefined,
      nota: formMov.nota.value.trim(),
    });
    dlgMov.close();
    alCambiar();
  });
  $("btn-cancelar-mov").addEventListener("click", () => dlgMov.close());
}
