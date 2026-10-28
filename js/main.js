// ===================================================
// Calendario — lógica de la página
// 1. (Las utilidades de fechas están en util.js)
// 2. Salón de una clase en una semana dada
// 3. Ocurrencias: qué pasa en un día (clases fijas + mis eventos)
// 4. Dibujar: encabezado, cuadrícula, próxima actividad, lista
// 5. Formulario de eventos
// 6. Navegación entre semanas / meses, y qué se muestra (horario, gastos o ambos)
// (Lo de finanzas está en finanzas.js y panel-finanzas.js)
// ===================================================

import { SEMANA_INICIO, ANIO_INICIO, ACTIVIDADES, CLASES, DIAS_ESPECIALES } from "./horario.js";
import {
  obtenerEventos, guardarEvento, borrarEvento, estaHecha, alternarHecha,
  obtenerVista, guardarVista, obtenerModos, guardarModos, obtenerPestana, guardarPestana,
  edicionDeClase, guardarEdicionClase, clasesBorradas,
} from "./guardado.js";
import { gastosDelDia, totalDe, cuentaPorId, monedaDe, movimientosDelDia, enEuros } from "./finanzas.js";
import {
  iniciarFinanzas, dibujarPanelFinanzas, dibujarCuentas, abrirGasto, abrirMovimientoGuardado, nombreCuenta,
} from "./panel-finanzas.js";
import { iniciarPracticas } from "./practicas.js";
import {
  DIAS, lunesDe, diaDe, lunesDeKW, kwDe, sumarDias, mismoDia, aISO, deISO,
  aMinutos, minutosDe, fmtDia, fmtAnio, primeroDeMes, dinero, $, crear, escapar,
} from "./util.js";

const HORA_MIN = 8;   // la cuadrícula empieza a las 8:00 como mínimo
const HORA_MAX = 20;  // y termina a las 20:00 como mínimo (se estira si hay eventos fuera)
const COLOR_EVENTOS = "rosa";

// ---------- 2. Salón ----------

const LUNES_INICIO = lunesDeKW(ANIO_INICIO, SEMANA_INICIO);

// Devuelve el salón vigente de una clase en la semana que empieza en `lunes`
function salonEn(clase, lunes) {
  let salon = clase.salon;
  for (const cambio of clase.cambios ?? []) {
    if (lunes >= lunesDeKW(ANIO_INICIO, cambio.desde)) salon = cambio.salon;
  }
  return salon;
}

function textoSalon(clase, lunes) {
  if (!("salon" in clase)) return ""; // actividad sin lugar fijo
  const salon = salonEn(clase, lunes);
  if (salon === null) return "Sin salón";
  if (salon === undefined) return "Salón por confirmar";
  return `Edif. ${clase.edificio} · Raum ${salon}`;
}

// Aviso si la clase cambiará de salón en una semana futura
function avisoCambio(clase, lunes) {
  const proximo = (clase.cambios ?? []).find(
    (c) => lunes < lunesDeKW(ANIO_INICIO, c.desde)
  );
  return proximo ? `Cambia de salón desde KW ${proximo.desde}` : "";
}

// ---------- 3. Ocurrencias ----------
// Una "ocurrencia" es una actividad en un día concreto, con todo lo
// necesario para dibujarla: título, horas, lugar, persona, color…

function ocurrenciasDe(fecha) {
  const dia = diaDe(fecha);
  const lunes = lunesDe(fecha);
  const iso = aISO(fecha);
  const lista = [];

  // Horario fijo (solo desde que empieza el semestre)
  if (lunes >= LUNES_INICIO) {
    for (const clase of CLASES) {
      const c = claseEfectiva(clase, lunes);
      if (!c || c.dia !== dia) continue;
      lista.push(c);
    }
  }

  // Mis eventos: los que caen ese día, o los semanales del mismo día de la semana
  for (const ev of obtenerEventos()) {
    const inicioSerie = deISO(ev.fecha);
    const toca = ev.repetir
      ? diaDe(inicioSerie) === dia && fecha >= inicioSerie
      : ev.fecha === iso;
    if (!toca) continue;
    lista.push({
      id: `e${ev.id}`,
      titulo: ev.titulo,
      inicio: ev.inicio,
      fin: ev.fin,
      lugar: ev.lugar,
      persona: ev.persona,
      color: COLOR_EVENTOS,
      repetir: ev.repetir,
      evento: ev,
    });
  }

  for (const o of lista) o.clave = `${o.id}@${iso}`;
  return lista.sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio));
}

// Una clase de horario.js con mis cambios de la página encima (null si la borré)
function claseEfectiva(clase, lunes) {
  const ed = edicionDeClase(clase.id) ?? {};
  if (ed.borrada) return null;
  const act = ACTIVIDADES[clase.materia];
  return {
    id: clase.id,
    claseId: clase.id,
    editada: Object.keys(ed).length > 0,
    titulo: ed.titulo ?? act.nombre,
    dia: ed.dia ?? clase.dia,
    inicio: ed.inicio ?? clase.inicio,
    fin: ed.fin ?? clase.fin,
    lugar: ed.lugar ?? textoSalon(clase, lunes),
    persona: ed.persona ?? act.profe ?? "",
    color: act.color,
    // si cambié el lugar a mano, ya no aplica el aviso de cambio de salón
    aviso: "lugar" in ed ? "" : avisoCambio(clase, lunes),
    sinSalon: !("lugar" in ed) && "salon" in clase && salonEn(clase, lunes) == null,
  };
}

// Reparte en "carriles" las ocurrencias que se empalman, para que queden
// una al lado de la otra en vez de encimadas.
function asignarCarriles(lista) {
  let grupo = [];
  let finGrupo = -1;
  let carriles = [];

  const cerrarGrupo = () => {
    for (const o of grupo) o.carriles = carriles.length;
    grupo = [];
    carriles = [];
  };

  for (const o of lista) {
    const ini = aMinutos(o.inicio);
    if (ini >= finGrupo) cerrarGrupo();
    let carril = carriles.findIndex((fin) => fin <= ini);
    if (carril === -1) carril = carriles.length;
    carriles[carril] = aMinutos(o.fin);
    o.carril = carril;
    grupo.push(o);
    finGrupo = Math.max(finGrupo, aMinutos(o.fin));
  }
  cerrarGrupo();
}

// ---------- 4. Dibujar ----------

let lunesVisible = semanaDeHoy();
let horaMin = HORA_MIN;
let horaMax = HORA_MAX;
let vista = obtenerVista();                         // "semana" o "mes"
let modos = obtenerModos();                         // { horario: bool, gastos: bool }
let pestana = obtenerPestana();                     // "calendario" o "practicas"
let mesVisible = primeroDeMes(sumarDias(lunesVisible, 3));
const MES_INICIO = primeroDeMes(LUNES_INICIO);

function semanaDeHoy() {
  const lunes = lunesDe(new Date());
  return lunes < LUNES_INICIO ? LUNES_INICIO : lunes;
}

// ¿Ya terminó la actividad que acaba a la hora `fin` del día `fecha`?
function yaTermino(fecha, fin, ahora = new Date()) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  return d.getTime() + aMinutos(fin) * 60000 <= ahora.getTime();
}

function dibujar() {
  // Pestaña de prácticas: oculta todo lo del calendario (no se combina con nada)
  const enPracticas = pestana === "practicas";
  $("pestana-calendario").hidden = enPracticas;
  $("nav-calendario").hidden = enPracticas;
  $("pestana-practicas").hidden = !enPracticas;
  $("btn-practicas").setAttribute("aria-pressed", enPracticas);
  if (enPracticas) {
    for (const btn of document.querySelectorAll("[data-modo]")) btn.setAttribute("aria-pressed", "false");
    return;
  }

  dibujarEncabezado();
  $("vista-semana").hidden = vista !== "semana";
  $("vista-mes").hidden = vista !== "mes";
  if (vista === "semana") dibujarCalendario();
  else dibujarMes();

  // Barra lateral: arriba el horario, abajo las finanzas (o solo una)
  $("resumen").hidden = !modos.horario;
  $("panel-finanzas").hidden = !modos.gastos;
  $("proxima").hidden = !modos.horario;
  $("titulo-materias").parentElement.hidden = !modos.horario;
  $("btn-nuevo").hidden = !modos.horario;
  $("btn-gasto").hidden = !modos.gastos;
  $("seccion-cuentas").hidden = !modos.gastos;

  if (modos.horario) {
    dibujarResumen();
    dibujarProxima();
  }
  if (modos.gastos) {
    const mes = vista === "semana" ? primeroDeMes(sumarDias(lunesVisible, 3)) : mesVisible;
    dibujarPanelFinanzas($("panel-finanzas"), { vista, dias: diasVisibles(), mes });
    dibujarCuentas($("cuentas"));
  }
}

const fmtMes = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });

function dibujarEncabezado() {
  for (const btn of document.querySelectorAll("[data-vista]")) {
    btn.setAttribute("aria-pressed", btn.dataset.vista === vista);
  }
  for (const btn of document.querySelectorAll("[data-modo]")) {
    btn.setAttribute("aria-pressed", modos[btn.dataset.modo]);
  }

  if (vista === "semana") {
    const domingo = sumarDias(lunesVisible, 6);
    $("semana-kw").textContent = `KW ${kwDe(lunesVisible)}`;
    $("semana-rango").textContent = `${fmtDia.format(lunesVisible)} – ${fmtAnio.format(domingo)}`;
    $("btn-anterior").disabled = lunesVisible <= LUNES_INICIO;
    $("btn-hoy").disabled = mismoDia(lunesVisible, semanaDeHoy());
  } else {
    const ultimo = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0);
    const nombre = fmtMes.format(mesVisible);
    $("semana-kw").textContent = nombre[0].toUpperCase() + nombre.slice(1);
    $("semana-rango").textContent = `KW ${kwDe(mesVisible)} – ${kwDe(ultimo)}`;
    $("btn-anterior").disabled = mesVisible <= MES_INICIO;
    $("btn-hoy").disabled = mismoDia(mesVisible, primeroDeMes(new Date()));
  }
}

// Días que abarca lo que se está viendo (la semana o el mes)
function diasVisibles() {
  if (vista === "semana") return DIAS.map((_, i) => sumarDias(lunesVisible, i));
  const dias = [];
  for (let d = new Date(mesVisible); d.getMonth() === mesVisible.getMonth(); d = sumarDias(d, 1)) {
    dias.push(d);
  }
  return dias;
}

function dibujarCalendario() {
  const cal = $("calendario");
  const ahora = new Date();
  const semana = DIAS.map((_, i) => (modos.horario ? ocurrenciasDe(sumarDias(lunesVisible, i)) : []));
  cal.classList.toggle("solo-gastos", !modos.horario);

  // La cuadrícula se estira si algún evento queda fuera de 8:00–20:00
  const todas = semana.flat();
  horaMin = Math.min(HORA_MIN, ...todas.map((o) => Math.floor(aMinutos(o.inicio) / 60)));
  horaMax = Math.max(HORA_MAX, ...todas.map((o) => Math.ceil(aMinutos(o.fin) / 60)));
  cal.style.setProperty("--horas", horaMax - horaMin);
  cal.innerHTML = "";

  // Esquina vacía + encabezados de día
  cal.append(crear("div", "calendario__esquina"));
  DIAS.forEach((nombre, i) => {
    const fecha = sumarDias(lunesVisible, i);
    const th = crear("div", "calendario__dia");
    if (mismoDia(fecha, ahora)) th.classList.add("es-hoy");
    th.innerHTML = `<span>${nombre}</span><small>${fmtDia.format(fecha)}</small>`;
    cal.append(th);
  });

  // Fila de gastos (debajo de los días). Si el horario está apagado, es lo único
  // que se ve y cada gasto muestra más detalle.
  if (modos.gastos) {
    cal.append(crear("div", "calendario__etiqueta", "Gastos"));
    DIAS.forEach((_, i) => cal.append(celdaGastos(sumarDias(lunesVisible, i), !modos.horario)));
  }
  if (!modos.horario) return;

  // Columna de horas
  const eje = crear("div", "calendario__horas");
  for (let h = horaMin; h < horaMax; h++) {
    eje.append(crear("span", "", `${h}:00`));
  }
  cal.append(eje);

  // Una columna por día con sus actividades
  semana.forEach((ocurrencias, i) => {
    const fecha = sumarDias(lunesVisible, i);
    const col = crear("div", "calendario__col");
    if (mismoDia(fecha, ahora)) col.classList.add("es-hoy");

    const especial = DIAS_ESPECIALES[i + 1];
    if (especial) col.append(crear("p", "calendario__especial", especial));
    else if (ocurrencias.length === 0) col.append(crear("p", "calendario__libre", "Libre"));

    asignarCarriles(ocurrencias);
    for (const o of ocurrencias) col.append(tarjeta(o, fecha, ahora));

    // Clic en un hueco libre → nuevo evento a esa hora
    col.addEventListener("click", (e) => {
      if (e.target !== col && !e.target.matches(".calendario__libre, .calendario__especial")) return;
      const min = horaMin * 60 + (e.offsetY / col.clientHeight) * (horaMax - horaMin) * 60;
      const hora = Math.floor(min / 60);
      abrirFormulario(null, { fecha: aISO(fecha), inicio: hhmm(hora * 60), fin: hhmm(hora * 60 + 60) });
    });

    // Línea roja de "ahora"
    const min = minutosDe(ahora);
    if (mismoDia(fecha, ahora) && min >= horaMin * 60 && min <= horaMax * 60) {
      const linea = crear("div", "calendario__ahora");
      linea.style.top = posicion(min);
      col.append(linea);
    }
    cal.append(col);
  });
}

// Gastos de un día en la vista semanal
function celdaGastos(fecha, detallada) {
  const gastos = gastosDelDia(fecha);
  const celda = crear("div", `gastos-dia${detallada ? " gastos-dia--detalle" : ""}`);
  if (mismoDia(fecha, new Date())) celda.classList.add("es-hoy");
  celda.title = "Clic para agregar un gasto este día";
  celda.addEventListener("click", () => abrirGasto(null, aISO(fecha)));

  for (const g of gastos) {
    const item = crear("button", `gasto${g.fijo ? " gasto--fijo" : ""}${g.especial ? " gasto--especial" : ""}`);
    item.type = "button";
    item.title = g.fijo ? "Gasto fijo (se edita en ⚙ Presupuesto)" : "Editar gasto";
    item.innerHTML = `
      <span class="gasto__desc">${g.especial ? "★ " : ""}${escapar(g.descripcion)}</span>
      <span class="gasto__monto">${dinero(g.monto, monedaDe(g))}</span>
      ${monedaDe(g) === "MXN"
        ? `<small class="gasto__equivalente">${g.tipoCambio ? `≈ ${dinero(enEuros(g))} · 1 € = ${g.tipoCambio} MXN` : "⚠ sin tipo de cambio"}</small>`
        : ""}
      ${detallada ? `<small class="gasto__meta">${g.categoria} · ${nombreCuenta(cuentaPorId(g.cuenta))}${g.fijo ? " · fijo" : ""}${g.especial ? " · especial" : ""}</small>` : ""}
    `;
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirGasto(g);
    });
    celda.append(item);
  }

  // Depósitos y pagos de la tarjeta (no son gastos: no entran al total)
  const movs = movimientosDelDia(fecha);
  for (const m of movs) celda.append(chipMovimiento(m, detallada));

  if (gastos.length) celda.append(crear("p", "gastos-dia__total", `Total ${totales(gastos)}`));
  else if (detallada && !movs.length) celda.append(crear("p", "gastos-dia__vacio", "Sin gastos"));
  return celda;
}

function chipMovimiento(m, detallada) {
  const cuenta = cuentaPorId(m.cuenta);
  const esPago = m.tipo === "pago";
  const item = crear("button", `gasto gasto--${m.tipo}`);
  item.type = "button";
  item.title = `${esPago ? "Pago de" : "Depósito a"} ${nombreCuenta(cuenta)} · clic para borrar`;
  item.innerHTML = `
    <span class="gasto__desc">${esPago ? "Pago tarjeta" : "Depósito"}</span>
    <span class="gasto__monto">${esPago ? "" : "+"}${dinero(m.monto, cuenta.moneda)}</span>
    ${detallada ? `<small class="gasto__meta">${esPago ? `${escapar(nombreCuenta(cuenta))} · desde ${escapar(nombreCuenta(cuentaPorId(m.desde)))}` : escapar(nombreCuenta(cuenta))}${m.nota ? ` · ${escapar(m.nota)}` : ""}</small>` : ""}
  `;
  item.addEventListener("click", (e) => {
    e.stopPropagation();
    abrirMovimientoGuardado(m);
  });
  return item;
}

// Total de un día por moneda: "12,50 €", "$300.00 MXN" o "12,50 € + $300.00 MXN"
function totales(gastos) {
  return ["EUR", "MXN"]
    .map((m) => [m, totalDe(gastos, m)])
    .filter(([, total]) => total)
    .map(([m, total]) => dinero(total, m))
    .join(" + ");
}

function tarjeta(o, fecha, ahora) {
  const ini = aMinutos(o.inicio);
  const fin = aMinutos(o.fin);
  const hecha = estaHecha(o.clave);
  const yaPaso = yaTermino(fecha, o.fin, ahora);

  const el = crear("article", `clase clase--${o.color}`);
  el.style.top = posicion(ini);
  el.style.setProperty("--alto", `calc(${posicion(fin)} - ${posicion(ini)})`);
  // Carriles: si hay empalmes, cada tarjeta ocupa una fracción del ancho
  el.style.left = `calc(4px + (100% - 8px) * ${o.carril} / ${o.carriles})`;
  el.style.width = `calc((100% - 8px) / ${o.carriles} - ${o.carriles > 1 ? 2 : 0}px)`;

  if (mismoDia(fecha, ahora) && minutosDe(ahora) >= ini && !yaPaso) el.classList.add("en-curso");
  if (o.sinSalon) el.classList.add("sin-salon");
  if (hecha) el.classList.add("hecha");
  if (yaPaso) el.classList.add(hecha ? "cumplida" : "no-cumplida");

  el.innerHTML = `
    <h3>${escapar(o.titulo)}${o.repetir ? ' <span class="clase__ciclo" title="Se repite cada semana">↻</span>' : ""}</h3>
    <p class="clase__hora">${o.inicio} – ${o.fin}</p>
    ${o.lugar ? `<p>${escapar(o.lugar)}</p>` : ""}
    ${o.persona ? `<p class="clase__profe">${escapar(o.persona)}</p>` : ""}
    ${o.aviso ? `<p class="clase__aviso">⚠ ${o.aviso}</p>` : ""}
  `;

  // Cuadrito de "cumplida": se puede marcar antes o después de que pase
  const check = crear("button", "check");
  check.type = "button";
  check.setAttribute("aria-pressed", hecha);
  const estado = hecha ? "Cumplida" : yaPaso ? "No cumplida" : "Pendiente";
  check.setAttribute("aria-label", `${o.titulo}: ${estado}`);
  check.title = `${estado} · clic para ${hecha ? "desmarcar" : "marcar como cumplida"}`;
  check.addEventListener("click", (e) => {
    e.stopPropagation();
    alternarHecha(o.clave);
    dibujar();
  });
  el.prepend(check);

  // Mis eventos y mis clases se pueden editar con un clic
  const abrir = o.evento ? () => abrirFormulario(o.evento)
    : o.claseId ? () => abrirClase(o.claseId, fecha)
    : null;
  if (abrir) {
    el.classList.add("editable");
    el.tabIndex = 0;
    el.title = o.evento ? "Editar evento" : "Editar o borrar esta clase";
    el.addEventListener("click", abrir);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") abrir();
    });
  }
  return el;
}

// Minutos del día → posición vertical (en % de la columna)
function posicion(min) {
  return `${((min - horaMin * 60) / ((horaMax - horaMin) * 60)) * 100}%`;
}

// Tarjeta "Ahora / Lo próximo" (siempre respecto a hoy, no a la semana visible)
function dibujarProxima() {
  const ahora = new Date();
  const caja = $("proxima");

  // Buscar en los próximos 14 días la primera actividad que no haya terminado
  for (let d = 0; d < 14; d++) {
    const fecha = sumarDias(ahora, d);
    const minAhora = d === 0 ? minutosDe(ahora) : -1;
    const o = ocurrenciasDe(fecha).find((x) => aMinutos(x.fin) > minAhora);
    if (!o) continue;

    const enCurso = minAhora >= aMinutos(o.inicio);
    const cuando = enCurso
      ? `Ahora · hasta las ${o.fin}`
      : `${cuandoTexto(d, fecha)} · ${o.inicio} – ${o.fin}`;

    caja.className = `proxima clase--${o.color}`;
    caja.innerHTML = `
      <p class="eyebrow">${enCurso ? "Ahora" : "Lo próximo"}</p>
      <p class="proxima__nombre">${escapar(o.titulo)}</p>
      <p class="proxima__detalle">${[cuando, o.lugar, o.persona].filter(Boolean).map(escapar).join(" · ")}</p>
    `;
    return;
  }
  caja.innerHTML = "";
}

function cuandoTexto(d, fecha) {
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  return `${DIAS[diaDe(fecha) - 1]} ${fmtDia.format(fecha)}`;
}

// ---------- 4b. Vista mensual ----------
// Cuadrícula lunes–domingo con las semanas del mes. Cada día muestra sus
// actividades en corto (hora + título + estado). Clic en un día → esa semana.

function dibujarMes() {
  const cont = $("mes");
  const ahora = new Date();
  cont.innerHTML = "";

  cont.append(crear("div", "mes__kw mes__cabeza", "KW"));
  for (const nombre of DIAS) cont.append(crear("div", "mes__cabeza", nombre.slice(0, 3)));

  const ultimo = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0);
  for (let lunes = lunesDe(mesVisible); lunes <= ultimo; lunes = sumarDias(lunes, 7)) {
    cont.append(crear("div", "mes__kw", String(kwDe(lunes))));

    for (let i = 0; i < 7; i++) {
      const fecha = sumarDias(lunes, i);
      const celda = crear("button", "mes__dia");
      celda.type = "button";
      celda.title = `Ver la semana del ${fmtDia.format(fecha)}`;
      if (fecha.getMonth() !== mesVisible.getMonth()) celda.classList.add("fuera");
      if (mismoDia(fecha, ahora)) celda.classList.add("es-hoy");

      celda.append(crear("span", "mes__num", String(fecha.getDate())));

      const especial = DIAS_ESPECIALES[i + 1];
      if (especial) celda.append(crear("span", "mes__especial", especial));

      if (modos.horario) {
        for (const o of ocurrenciasDe(fecha)) {
          const linea = crear("span", `mes__act clase--${o.color} ${estadoDe(o, fecha, ahora)}`);
          linea.innerHTML = `<span class="mes__marca" aria-hidden="true"></span>${o.inicio} ${escapar(o.titulo)}`;
          celda.append(linea);
        }
      }

      // Gastos: con el horario prendido solo el total del día; si no, la lista
      const gastos = modos.gastos ? gastosDelDia(fecha) : [];
      if (gastos.length && !modos.horario) {
        for (const g of gastos) {
          const linea = crear("span", "mes__gasto");
          linea.innerHTML = `<span>${g.especial ? "★ " : ""}${escapar(g.descripcion)}</span><span>${dinero(g.monto, monedaDe(g))}</span>`;
          celda.append(linea);
        }
      }
      // Depósitos y pagos de la tarjeta
      for (const m of modos.gastos ? movimientosDelDia(fecha) : []) {
        const cuenta = cuentaPorId(m.cuenta);
        const linea = crear("span", `mes__gasto mes__mov--${m.tipo}`);
        linea.innerHTML = `<span>${m.tipo === "pago" ? "Pago tarjeta" : "Depósito"}</span><span>${m.tipo === "pago" ? "" : "+"}${dinero(m.monto, cuenta.moneda)}</span>`;
        celda.append(linea);
      }
      if (gastos.length) celda.append(crear("span", "mes__gasto-total", `− ${totales(gastos)}`));

      celda.addEventListener("click", () => {
        lunesVisible = lunesDe(fecha) < LUNES_INICIO ? LUNES_INICIO : lunesDe(fecha);
        cambiarVista("semana");
      });
      cont.append(celda);
    }
  }
}

// "cumplida", "no-cumplida" o "" (todavía no pasa y no está marcada)
function estadoDe(o, fecha, ahora = new Date()) {
  if (estaHecha(o.clave)) return "cumplida";
  return yaTermino(fecha, o.fin, ahora) ? "no-cumplida" : "";
}

// ---------- 4c. Resumen (barra lateral) ----------
// Cuenta lo cumplido / no cumplido / por venir del periodo visible
// y lista lo que ya pasó sin cumplirse.

function dibujarResumen() {
  const ahora = new Date();
  const cumplidas = [];
  const fallidas = [];
  const porVenir = [];

  for (const fecha of diasVisibles()) {
    for (const o of ocurrenciasDe(fecha)) {
      const estado = estadoDe(o, fecha, ahora);
      if (estado === "cumplida") cumplidas.push(o);
      else if (estado === "no-cumplida") fallidas.push({ o, fecha });
      else porVenir.push(o);
    }
  }

  const evaluadas = cumplidas.length + fallidas.length;
  const pct = evaluadas ? Math.round((cumplidas.length / evaluadas) * 100) : null;

  const caja = $("resumen");
  caja.innerHTML = `
    <h2>${vista === "semana" ? "Resumen de la semana" : "Resumen del mes"}</h2>

    <div class="resumen__cifras">
      <div class="cifra cifra--ok"><strong>${cumplidas.length}</strong><span>Cumplidas</span></div>
      <div class="cifra cifra--mal"><strong>${fallidas.length}</strong><span>No cumplidas</span></div>
      <div class="cifra"><strong>${porVenir.length}</strong><span>Por venir</span></div>
    </div>

    <div class="resumen__barra" role="img"
         aria-label="${pct === null ? "Sin actividades terminadas todavía" : `Cumplimiento: ${pct}%`}">
      <div style="width: ${pct ?? 0}%"></div>
    </div>
    <p class="resumen__pct">${pct === null ? "Aún no termina ninguna actividad" : `${pct}% de cumplimiento`}</p>

    <h3>No cumplidas</h3>
  `;

  if (fallidas.length === 0) {
    caja.append(crear("p", "resumen__vacio", evaluadas ? "Todo al día." : "Nada por aquí todavía."));
    return;
  }

  const lista = crear("ul", "resumen__lista");
  for (const { o, fecha } of fallidas) {
    const li = crear("li", `pendiente clase--${o.color}`);
    li.innerHTML = `
      <span class="pendiente__texto">
        <strong>${escapar(o.titulo)}</strong>
        <small>${DIAS[diaDe(fecha) - 1].slice(0, 3)} ${fmtDia.format(fecha)} · ${o.inicio} – ${o.fin}</small>
      </span>
    `;
    const btn = crear("button", "check");
    btn.type = "button";
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-label", `Marcar "${o.titulo}" como cumplida`);
    btn.title = "Marcar como cumplida";
    btn.addEventListener("click", () => {
      alternarHecha(o.clave);
      dibujar();
    });
    li.prepend(btn);
    lista.append(li);
  }
  caja.append(lista);
}

function dibujarActividades() {
  const lista = $("materias");
  lista.innerHTML = "";
  for (const [id, m] of Object.entries(ACTIVIDADES)) {
    const bloques = CLASES
      .filter((c) => c.materia === id)
      .map((c) => claseEfectiva(c, semanaDeHoy()))
      .filter(Boolean)
      .sort((a, b) => a.dia - b.dia || a.inicio.localeCompare(b.inicio));
    if (!bloques.length) continue; // todas sus clases están borradas
    const horas = bloques.map((c) => `${DIAS[c.dia - 1].slice(0, 3)} ${c.inicio}`).join(" · ");
    const li = crear("li", `materia clase--${m.color}`);
    li.innerHTML = `<strong>${m.nombre}</strong>${m.profe ? `<span>${m.profe}</span>` : ""}<small>${horas}</small>`;
    lista.append(li);
  }

  // Si borré clases desde la página, poder recuperarlas
  const borradas = clasesBorradas().filter((id) => CLASES.some((c) => c.id === id));
  const btn = $("btn-restaurar-clases");
  btn.hidden = borradas.length === 0;
  btn.textContent = `Restaurar ${borradas.length} ${borradas.length === 1 ? "clase borrada" : "clases borradas"}`;
}

// ---------- 5b. Editar / borrar una clase ----------

const dlgClase = $("dialogo-clase");
const formClase = $("form-clase");
let claseEditando = null; // { clase de horario.js, original (sin mis cambios) }

function abrirClase(id, fecha) {
  const clase = CLASES.find((c) => c.id === id);
  const ed = edicionDeClase(id) ?? {};
  const act = ACTIVIDADES[clase.materia];
  const lunes = lunesDe(fecha);
  const original = {
    titulo: act.nombre, dia: clase.dia, inicio: clase.inicio, fin: clase.fin,
    lugar: textoSalon(clase, lunes), persona: act.profe ?? "",
  };
  claseEditando = { clase, original, ed };
  const actual = { ...original, ...ed };

  formClase.titulo.value = actual.titulo;
  formClase.dia.value = actual.dia;
  formClase.inicio.value = actual.inicio;
  formClase.fin.value = actual.fin;
  formClase.lugar.value = actual.lugar;
  formClase.persona.value = actual.persona;
  $("btn-restaurar-clase").hidden = Object.keys(ed).length === 0;
  $("error-clase").textContent = "";
  dlgClase.showModal();
  formClase.titulo.focus();
}

formClase.addEventListener("submit", (e) => {
  e.preventDefault();
  if (formClase.fin.value <= formClase.inicio.value) {
    $("error-clase").textContent = "La hora de fin tiene que ser después de la de inicio.";
    return;
  }
  const { clase, original, ed } = claseEditando;
  const nuevo = {
    titulo: formClase.titulo.value.trim(),
    dia: Number(formClase.dia.value),
    inicio: formClase.inicio.value,
    fin: formClase.fin.value,
    lugar: formClase.lugar.value.trim(),
    persona: formClase.persona.value.trim(),
  };
  // Solo guardar lo que es distinto del original (así, p. ej., el cambio de salón
  // por semana de horario.js sigue funcionando si no toqué el lugar)
  const cambios = {};
  for (const [k, v] of Object.entries(nuevo)) {
    if (v !== original[k]) cambios[k] = v;
  }
  guardarEdicionClase(clase.id, cambios);
  dlgClase.close();
  dibujarActividades();
  dibujar();
});

$("btn-borrar-clase").addEventListener("click", () => {
  const { clase, original } = claseEditando;
  if (!confirm(`¿Borrar "${original.titulo}" del ${DIAS[original.dia - 1].toLowerCase()} ${original.inicio} de TODAS las semanas?`)) return;
  guardarEdicionClase(clase.id, { borrada: true });
  dlgClase.close();
  dibujarActividades();
  dibujar();
});

$("btn-restaurar-clase").addEventListener("click", () => {
  guardarEdicionClase(claseEditando.clase.id, {});
  dlgClase.close();
  dibujarActividades();
  dibujar();
});

$("btn-cancelar-clase").addEventListener("click", () => dlgClase.close());

$("btn-restaurar-clases").addEventListener("click", () => {
  const borradas = clasesBorradas();
  if (!confirm(`¿Volver a poner ${borradas.length === 1 ? "la clase borrada" : `las ${borradas.length} clases borradas`}?`)) return;
  for (const id of borradas) guardarEdicionClase(id, {});
  dibujarActividades();
  dibujar();
});

function hhmm(min) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(Math.floor(min / 60) % 24)}:${p(min % 60)}`;
}

// ---------- 5. Formulario de eventos ----------

const dialogo = $("dialogo-evento");
const form = $("form-evento");
let editando = null; // evento que se está editando (null = nuevo)

function abrirFormulario(evento, valores = {}) {
  editando = evento;
  const datos = evento ?? {
    titulo: "",
    fecha: valores.fecha ?? aISO(mismoDia(lunesVisible, lunesDe(new Date())) ? new Date() : lunesVisible),
    inicio: valores.inicio ?? "09:00",
    fin: valores.fin ?? "10:00",
    lugar: "",
    persona: "",
    repetir: false,
  };

  $("dialogo-titulo").textContent = evento ? "Editar evento" : "Nuevo evento";
  form.titulo.value = datos.titulo;
  form.fecha.value = datos.fecha;
  form.inicio.value = datos.inicio;
  form.fin.value = datos.fin;
  form.lugar.value = datos.lugar;
  form.persona.value = datos.persona;
  form.repetir.checked = datos.repetir;
  $("btn-borrar").hidden = !evento;
  $("error-evento").textContent = "";
  dialogo.showModal();
  form.titulo.focus();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (form.fin.value <= form.inicio.value) {
    $("error-evento").textContent = "La hora de fin tiene que ser después de la de inicio.";
    return;
  }
  guardarEvento({
    id: editando?.id,
    titulo: form.titulo.value.trim(),
    fecha: form.fecha.value,
    inicio: form.inicio.value,
    fin: form.fin.value,
    lugar: form.lugar.value.trim(),
    persona: form.persona.value.trim(),
    repetir: form.repetir.checked,
  });
  dialogo.close();
  dibujar();
});

$("btn-cancelar").addEventListener("click", () => dialogo.close());

$("btn-borrar").addEventListener("click", () => {
  const texto = editando.repetir
    ? `¿Borrar "${editando.titulo}" de todas las semanas?`
    : `¿Borrar "${editando.titulo}"?`;
  if (!confirm(texto)) return;
  borrarEvento(editando.id);
  dialogo.close();
  dibujar();
});

$("btn-nuevo").addEventListener("click", () => abrirFormulario(null));

// ---------- 6. Navegación ----------

// Avanza o retrocede una semana o un mes, según la vista
function mover(pasos) {
  if (vista === "semana") {
    const nuevo = sumarDias(lunesVisible, pasos * 7);
    if (nuevo < LUNES_INICIO) return;
    lunesVisible = nuevo;
  } else {
    const nuevo = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + pasos, 1);
    if (nuevo < MES_INICIO) return;
    mesVisible = nuevo;
  }
  dibujar();
}

function cambiarVista(nueva) {
  vista = nueva;
  guardarVista(vista);
  // El mes que se muestra es el de la semana que estaba viendo
  if (vista === "mes") mesVisible = primeroDeMes(sumarDias(lunesVisible, 3));
  dibujar();
}

$("btn-anterior").addEventListener("click", () => mover(-1));
$("btn-siguiente").addEventListener("click", () => mover(1));
$("btn-hoy").addEventListener("click", () => {
  lunesVisible = semanaDeHoy();
  mesVisible = primeroDeMes(new Date());
  dibujar();
});

for (const btn of document.querySelectorAll("[data-vista]")) {
  btn.addEventListener("click", () => cambiarVista(btn.dataset.vista));
}

// Flechas del teclado para cambiar de semana/mes (no mientras se escribe en el formulario)
$("btn-practicas").addEventListener("click", () => {
  pestana = "practicas";
  guardarPestana(pestana);
  dibujar();
  window.scrollTo(0, 0);
});

document.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]") || pestana === "practicas") return;
  if (e.key === "ArrowLeft") mover(-1);
  if (e.key === "ArrowRight") mover(1);
});

// Horario / Gastos: se pueden prender los dos (calendarios sobrepuestos),
// pero no apagar ambos
for (const btn of document.querySelectorAll("[data-modo]")) {
  btn.addEventListener("click", () => {
    // Desde Prácticas: volver al calendario con ese modo prendido
    if (pestana === "practicas") {
      pestana = "calendario";
      guardarPestana(pestana);
      if (!modos[btn.dataset.modo]) {
        modos = { ...modos, [btn.dataset.modo]: true };
        guardarModos(modos);
      }
      dibujar();
      return;
    }
    const nuevo = { ...modos, [btn.dataset.modo]: !modos[btn.dataset.modo] };
    if (!nuevo.horario && !nuevo.gastos) return;
    modos = nuevo;
    guardarModos(modos);
    dibujar();
  });
}

$("btn-gasto").addEventListener("click", () => {
  const dias = diasVisibles();
  const hoy = aISO(new Date());
  abrirGasto(null, aISO(dias.find((d) => aISO(d) === hoy) ?? dias[0]));
});

iniciarFinanzas(dibujar);
iniciarPracticas();
dibujarActividades();
dibujar();
setInterval(() => {
  if (!document.querySelector("dialog[open]")) dibujar(); // actualizar "ahora" y lo que ya pasó, cada minuto
}, 60 * 1000);
