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
  borrarFijo, gastosDelDia, totalDe, monedaDe, presupuestoDe, presupuestoMensual, fijosDelMes, saldoDe,
  ajustarSaldo, cuentaPorId,
  guardarMovimiento, borrarMovimiento, enEuros, enEurosTotal, ultimoTipoCambio,
} from "./finanzas.js";
import { leer, escribir } from "./guardado.js";
import { SEMANA_INICIO, ANIO_INICIO } from "./horario.js";
import {
  aISO, kwDe, lunesDe, lunesDeKW, sumarDias, diasDelMes, primeroDeMes, fmtDia, dinero, $, crear, escapar,
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
  const { eur, sinCambio } = enEurosTotal(gastos);
  return { eur, mxn: totalDe(sinCambio, "MXN") }; // mxn = lo que falta convertir
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
// (si en una semana me pasé, ese exceso se resta). Devuelve el total y cuánto aporta cada semana.
function ahorroDe(mes, diasMes) {
  const hoy = aISO(new Date());
  const semanas = [];
  for (const { lunes, dias } of semanasDe(mes, diasMes)) {
    if (aISO(dias.at(-1)) >= hoy) continue; // la semana todavía no termina
    const valor = Math.round((presupuestoDe(dias) - gastadoEn(dias).eur) * 100) / 100;
    semanas.push({ kw: kwDe(lunes), dias, valor });
  }
  const total = Math.round(semanas.reduce((s, x) => s + x.valor, 0) * 100) / 100;
  return { total, semanas };
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
    mxn && `⚠ ${dinero(mxn, "MXN")} sin tipo de cambio (clic en el gasto para ponerlo)`,
  ]);
}

// Mes: presupuesto inicial, ahorro y lo gastado hasta hoy desglosado en
// GR (gasto regular: día a día + fijos ya cobrados) y GE (gasto especial ★)
// ---------- Cierre de mes ----------
// Al terminar un mes: (ahorro del mes + ahorro que llegó) − (GE del mes + GE que llegó).
// Si sobra → pasa al mes siguiente como "Ahorro del mes anterior".
// Si falta → pasa al mes siguiente como "Gasto especial del mes anterior".
// La cadena empieza en el mes en que empezó el semestre.

const MES_INICIO_FINANZAS = primeroDeMes(lunesDeKW(ANIO_INICIO, SEMANA_INICIO));
const r2 = (n) => Math.round(n * 100) / 100;

function diasDeMes(mes) {
  return Array.from({ length: diasDelMes(mes) }, (_, i) => sumarDias(mes, i));
}

function mesSiguiente(mes) {
  return new Date(mes.getFullYear(), mes.getMonth() + 1, 1);
}

function mesTermino(mes) {
  return aISO(sumarDias(mesSiguiente(mes), -1)) < aISO(new Date());
}

// GE del mes en € (lo que no tiene tipo de cambio no se puede sumar)
function geDelMes(diasMes) {
  return enEurosTotal(diasMes.flatMap(gastosDelDia).filter((g) => g.especial)).eur;
}

// Cómo cierra un mes, dado lo que le llegó del anterior
function cierreDe(mes, llega) {
  const dias = diasDeMes(mes);
  const neto = r2(ahorroDe(mes, dias).total + llega.ahorro - (geDelMes(dias) + llega.ge));
  return neto >= 0 ? { ahorro: neto, ge: 0 } : { ahorro: 0, ge: -neto };
}

// Lo que le llega a `mes` del mes anterior: { ahorro, ge } (solo uno puede ser > 0).
// Solo pasa algo si todos los meses anteriores ya terminaron.
function arrastreA(mes) {
  let llega = { ahorro: 0, ge: 0 };
  for (let m = new Date(MES_INICIO_FINANZAS); m < mes; m = mesSiguiente(m)) {
    if (!mesTermino(m)) return { ahorro: 0, ge: 0 };
    llega = cierreDe(m, llega);
  }
  return llega;
}

function bloqueMes(titulo, mes, diasMes) {
  const hoy = aISO(new Date());
  const llega = arrastreA(mes);
  const mesAnterior = fmtMes.format(new Date(mes.getFullYear(), mes.getMonth() - 1, 1));
  const gastosMes = diasMes.flatMap(gastosDelDia);
  // GR: hasta hoy (los fijos futuros todavía no se cobran). GE: todas las del mes.
  const regulares = gastosMes.filter((g) => !g.especial && g.fecha <= hoy);
  const especiales = gastosMes.filter((g) => g.especial);
  const { total: ahorroSemanal, semanas: ahorroSemanas } = ahorroDe(mes, diasMes);
  const ahorro = r2(ahorroSemanal + llega.ahorro);
  // De qué semana viene cada parte del ahorro (con sus días, por si la semana está partida)
  const ahorroAnterior = llega.ahorro ? `
    <span class="desglose desglose--anterior">
      <span>Ahorro del mes anterior <small>${mesAnterior}</small></span>
      <span>${dinero(llega.ahorro)}</span>
    </span>` : "";
  const ahorroDesglose = ahorroAnterior + ahorroSemanas.map(({ kw, dias, valor }) => `
    <span class="desglose ${valor < 0 ? "negativo" : ""}">
      <span>KW ${kw} <small>${fmtDia.format(dias[0])}–${fmtDia.format(dias.at(-1))} · ${dias.length} ${dias.length === 1 ? "día" : "días"}</small></span>
      <span>${dinero(valor)}</span>
    </span>`).join("");

  // Todo en €: lo que está en pesos se convierte con el tipo de cambio de cada gasto.
  // Lo que no tiene tipo de cambio se avisa aparte, en pesos.
  const gr = enEurosTotal(regulares);
  const ge = enEurosTotal(especiales);
  const aviso = (lista) => lista.length
    ? `<br><small>⚠ ${dinero(totalDe(lista, "MXN"), "MXN")} sin tipo de cambio</small>` : "";
  const grTexto = dinero(gr.eur) + aviso(gr.sinCambio);
  const geTotal = r2(ge.eur + llega.ge);
  const geTexto = dinero(geTotal) + aviso(ge.sinCambio);
  const geAnterior = llega.ge ? `
          <span class="desglose desglose--anterior">
            <span>Gasto especial del mes anterior <small>${mesAnterior}</small></span>
            <span>${dinero(llega.ge)}</span>
          </span>` : "";
  const totalTexto = `${gr.convertido || ge.convertido ? "≈ " : ""}${dinero(gr.eur + geTotal)}`;

  // Si el mes ya terminó: qué pasó al mes siguiente
  let cierre = "";
  if (mesTermino(mes)) {
    const pasa = cierreDe(mes, llega);
    const siguiente = fmtMes.format(mesSiguiente(mes));
    cierre = pasa.ge
      ? `<div class="mes-resumen__cierre negativo"><dt>Cierre <small>pasa a ${siguiente} como gasto especial</small></dt><dd>${dinero(pasa.ge)}</dd></div>`
      : `<div class="mes-resumen__cierre positivo"><dt>Cierre <small>pasa a ${siguiente} como ahorro</small></dt><dd>${dinero(pasa.ahorro)}</dd></div>`;
  }

  const el = crear("div", "presupuesto mes-resumen");
  el.innerHTML = `
    <p class="presupuesto__titulo">${titulo}</p>
    <dl class="mes-resumen__datos">
      <div><dt>Presupuesto inicial</dt><dd>${dinero(presupuestoMensual())}</dd></div>
      <div class="${ahorro < 0 ? "negativo" : "positivo"}">
        <dt>Ahorro <small>semanas terminadas</small></dt><dd>${dinero(ahorro)}</dd>
      </div>
      ${ahorroSemanas.length || llega.ahorro
        ? `<div class="ahorro-desglose">${ahorroDesglose}</div>`
        : `<div class="ahorro-desglose"><span class="desglose"><small>Ninguna semana ha terminado todavía.</small></span></div>`}
      <div class="mes-resumen__gastado">
        <dt>Gastado hasta hoy</dt>
        <dd>
          <span class="desglose"><abbr title="Gasto regular (en €, con tu tipo de cambio)">GR</abbr><span>${grTexto}</span></span>
          <span class="desglose"><abbr title="Gasto especial (en €, con tu tipo de cambio)">GE</abbr><span>${geTexto}</span></span>${geAnterior}
          <span class="desglose desglose--total"><span>Total</span><span>${totalTexto}</span></span>
        </dd>
      </div>
      ${cierre}
    </dl>
  `;
  return el;
}

// Total por moneda, sin conversión: "120,00 €", "$500.00 MXN" o ambos en dos líneas
function montos(gastos) {
  const eur = totalDe(gastos, "EUR");
  const mxn = totalDe(gastos, "MXN");
  if (!mxn) return dinero(eur);
  if (!eur) return dinero(mxn, "MXN");
  return `${dinero(eur)}<br>${dinero(mxn, "MXN")}`;
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
  formGasto.tipoCambio.value = d.tipoCambio ?? ultimoTipoCambio();
  $("btn-borrar-gasto").hidden = !gasto;
  actualizarMoneda(formGasto);
  actualizarCambio();
  dlgGasto.showModal();
  formGasto.descripcion.focus();
}

// La etiqueta del monto dice la moneda de la cuenta elegida: "Monto (€)" o "Monto (MXN)"
function actualizarMoneda(form) {
  const moneda = cuentaPorId(form.cuenta.value).moneda;
  form.querySelector(".moneda-monto").textContent = moneda === "MXN" ? "MXN" : "€";
}

// Compra especial en pesos → pedir el tipo de cambio y mostrar el equivalente en €
function actualizarCambio() {
  const mostrar = cuentaPorId(formGasto.cuenta.value).moneda === "MXN";
  $("campo-cambio").hidden = !mostrar;
  formGasto.tipoCambio.required = mostrar;

  const monto = Number(formGasto.monto.value);
  const cambio = Number(formGasto.tipoCambio.value);
  $("gasto-equivalente").textContent = mostrar && monto > 0 && cambio > 0
    ? `≈ ${dinero(monto / cambio)}`
    : "";
}

function conectarGasto() {
  formGasto.cuenta.addEventListener("change", () => {
    actualizarMoneda(formGasto);
    actualizarCambio();
  });
  formGasto.especial.addEventListener("change", actualizarCambio);
  formGasto.monto.addEventListener("input", actualizarCambio);
  formGasto.tipoCambio.addEventListener("input", actualizarCambio);

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
      // solo se guarda en gastos en pesos
      tipoCambio: $("campo-cambio").hidden ? undefined : Number(formGasto.tipoCambio.value),
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
  formFijo.tipoCambio.value = ultimoTipoCambio();
  actualizarCambioFijo();
  dibujarFijos();
  dlgAjustes.showModal();
}

// Fijo en pesos → pedir tipo de cambio y mostrar el equivalente en €
function actualizarCambioFijo() {
  const mostrar = cuentaPorId(formFijo.cuenta.value).moneda === "MXN";
  $("campo-cambio-fijo").hidden = !mostrar;
  formFijo.tipoCambio.required = mostrar;
  const monto = Number(formFijo.monto.value);
  const cambio = Number(formFijo.tipoCambio.value);
  $("fijo-equivalente").textContent = mostrar && monto > 0 && cambio > 0 ? `≈ ${dinero(monto / cambio)}` : "";
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
      <small>${dinero(f.monto, cuenta.moneda)}${cuenta.moneda === "MXN"
        ? (f.tipoCambio ? ` (≈ ${dinero(f.monto / f.tipoCambio)})` : " (⚠ sin tipo de cambio)") : ""}
        · día ${f.dia} · ${f.categoria} · ${nombreCuenta(cuenta)}</small></span>
    `;
    if (cuenta.moneda === "MXN") {
      const cambio = crear("button", "", f.tipoCambio ? "Cambio" : "Poner cambio");
      cambio.type = "button";
      cambio.title = "Tipo de cambio (MXN por 1 €)";
      cambio.addEventListener("click", () => {
        const valor = Number(prompt(`Tipo de cambio para "${f.descripcion}" (MXN por 1 €):`, f.tipoCambio ?? ultimoTipoCambio()));
        if (!(valor > 0)) return;
        guardarFijo({ ...f, tipoCambio: valor });
        dibujarFijos();
        alCambiar();
      });
      li.append(cambio);
    }

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
  formFijo.cuenta.addEventListener("change", () => {
    actualizarMoneda(formFijo);
    actualizarCambioFijo();
  });
  formFijo.monto.addEventListener("input", actualizarCambioFijo);
  formFijo.tipoCambio.addEventListener("input", actualizarCambioFijo);
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
      tipoCambio: $("campo-cambio-fijo").hidden ? undefined : Number(formFijo.tipoCambio.value),
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
