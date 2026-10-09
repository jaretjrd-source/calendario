// ===================================================
// Calendario — lógica de la página
// 1. Utilidades de fechas (semana ISO = "KW" en Alemania)
// 2. Salón de una clase en una semana dada
// 3. Dibujar: encabezado, cuadrícula, próxima clase, materias
// 4. Navegación entre semanas
// ===================================================

import { SEMANA_INICIO, ANIO_INICIO, ACTIVIDADES, CLASES, DIAS_ESPECIALES } from "./horario.js";

const HORA_MIN = 8;   // la cuadrícula empieza a las 8:00
const HORA_MAX = 19;  // y termina a las 19:00
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MS_DIA = 24 * 60 * 60 * 1000;

// ---------- 1. Fechas ----------

// Lunes (a las 00:00) de la semana a la que pertenece `fecha`
function lunesDe(fecha) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const diaSemana = (d.getDay() + 6) % 7; // lunes = 0 … domingo = 6
  d.setDate(d.getDate() - diaSemana);
  return d;
}

// Lunes de la semana ISO `kw` del año `anio`.
// Regla ISO: la semana 1 es la que contiene el 4 de enero.
function lunesDeKW(anio, kw) {
  const lunesSemana1 = lunesDe(new Date(anio, 0, 4));
  return sumarDias(lunesSemana1, (kw - 1) * 7);
}

// Número de semana ISO (KW) de una fecha
function kwDe(fecha) {
  const jueves = sumarDias(lunesDe(fecha), 3); // el jueves define el año ISO
  const lunesSemana1 = lunesDe(new Date(jueves.getFullYear(), 0, 4));
  return Math.round((lunesDe(fecha) - lunesSemana1) / (7 * MS_DIA)) + 1;
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

function mismoDia(a, b) {
  return a.toDateString() === b.toDateString();
}

// "14:30" → minutos desde medianoche (870)
function aMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

const fmtDia = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
const fmtAnio = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

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

// ---------- 3. Dibujar ----------

const $ = (id) => document.getElementById(id);
let lunesVisible = lunesDe(new Date()) < LUNES_INICIO ? LUNES_INICIO : lunesDe(new Date());

function dibujar() {
  dibujarEncabezado();
  dibujarCalendario();
  dibujarProxima();
}

function dibujarEncabezado() {
  const domingo = sumarDias(lunesVisible, 6);
  $("semana-kw").textContent = `KW ${kwDe(lunesVisible)}`;
  $("semana-rango").textContent = `${fmtDia.format(lunesVisible)} – ${fmtAnio.format(domingo)}`;
  $("btn-anterior").disabled = lunesVisible <= LUNES_INICIO;
  $("btn-hoy").disabled = mismoDia(lunesVisible, lunesDe(new Date()));
}

function dibujarCalendario() {
  const cal = $("calendario");
  const ahora = new Date();
  const horas = HORA_MAX - HORA_MIN;
  cal.style.setProperty("--horas", horas);
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

  // Columna de horas
  const eje = crear("div", "calendario__horas");
  for (let h = HORA_MIN; h < HORA_MAX; h++) {
    eje.append(crear("span", "", `${h}:00`));
  }
  cal.append(eje);

  // Una columna por día con sus clases
  DIAS.forEach((_, i) => {
    const fecha = sumarDias(lunesVisible, i);
    const col = crear("div", "calendario__col");
    if (mismoDia(fecha, ahora)) col.classList.add("es-hoy");

    const clases = CLASES.filter((c) => c.dia === i + 1);
    const especial = DIAS_ESPECIALES[i + 1];
    if (especial) col.append(crear("p", "calendario__especial", especial));
    else if (clases.length === 0) col.append(crear("p", "calendario__libre", "Libre"));

    for (const clase of clases) col.append(tarjetaClase(clase, fecha, ahora));

    // Línea roja de "ahora"
    const min = ahora.getHours() * 60 + ahora.getMinutes();
    if (mismoDia(fecha, ahora) && min >= HORA_MIN * 60 && min <= HORA_MAX * 60) {
      const linea = crear("div", "calendario__ahora");
      linea.style.top = posicion(min);
      col.append(linea);
    }
    cal.append(col);
  });
}

function tarjetaClase(clase, fecha, ahora) {
  const materia = ACTIVIDADES[clase.materia];
  const ini = aMinutos(clase.inicio);
  const fin = aMinutos(clase.fin);
  const aviso = avisoCambio(clase, lunesVisible);
  const lugar = textoSalon(clase, lunesVisible);

  const el = crear("article", `clase clase--${materia.color}`);
  el.style.top = posicion(ini);
  el.style.height = `calc(${posicion(fin)} - ${posicion(ini)})`;

  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  if (mismoDia(fecha, ahora) && minAhora >= ini && minAhora < fin) el.classList.add("en-curso");
  if ("salon" in clase && salonEn(clase, lunesVisible) == null) el.classList.add("sin-salon");

  el.innerHTML = `
    <h3>${materia.nombre}</h3>
    <p class="clase__hora">${clase.inicio} – ${clase.fin}</p>
    ${lugar ? `<p>${lugar}</p>` : ""}
    ${materia.profe ? `<p class="clase__profe">${materia.profe}</p>` : ""}
    ${aviso ? `<p class="clase__aviso">⚠ ${aviso}</p>` : ""}
  `;
  return el;
}

// Minutos del día → posición vertical (en % de la columna)
function posicion(min) {
  return `${((min - HORA_MIN * 60) / ((HORA_MAX - HORA_MIN) * 60)) * 100}%`;
}

// Tarjeta "Ahora / Lo próximo" (siempre respecto a hoy, no a la semana visible)
function dibujarProxima() {
  const ahora = new Date();
  const caja = $("proxima");

  // Buscar en los próximos 14 días la primera clase que no haya terminado
  for (let d = 0; d < 14; d++) {
    const fecha = sumarDias(ahora, d);
    if (lunesDe(fecha) < LUNES_INICIO) continue;
    const dia = (fecha.getDay() + 6) % 7 + 1;
    const minAhora = d === 0 ? ahora.getHours() * 60 + ahora.getMinutes() : -1;

    const clase = CLASES
      .filter((c) => c.dia === dia && aMinutos(c.fin) > minAhora)
      .sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio))[0];
    if (!clase) continue;

    const materia = ACTIVIDADES[clase.materia];
    const enCurso = minAhora >= aMinutos(clase.inicio);
    const cuando = enCurso
      ? `Ahora · hasta las ${clase.fin}`
      : `${cuandoTexto(d, fecha)} · ${clase.inicio} – ${clase.fin}`;

    caja.className = `proxima clase--${materia.color}`;
    caja.innerHTML = `
      <p class="eyebrow">${enCurso ? "Ahora" : "Lo próximo"}</p>
      <p class="proxima__nombre">${materia.nombre}</p>
      <p class="proxima__detalle">${[cuando, textoSalon(clase, lunesDe(fecha)), materia.profe].filter(Boolean).join(" · ")}</p>
    `;
    return;
  }
  caja.innerHTML = "";
}

function cuandoTexto(d, fecha) {
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  return `${DIAS[(fecha.getDay() + 6) % 7]} ${fmtDia.format(fecha)}`;
}

function dibujarMaterias() {
  const lista = $("materias");
  for (const [id, m] of Object.entries(ACTIVIDADES)) {
    const horas = CLASES
      .filter((c) => c.materia === id)
      .map((c) => `${DIAS[c.dia - 1].slice(0, 3)} ${c.inicio}`)
      .join(" · ");
    const li = crear("li", `materia clase--${m.color}`);
    li.innerHTML = `<strong>${m.nombre}</strong>${m.profe ? `<span>${m.profe}</span>` : ""}<small>${horas}</small>`;
    lista.append(li);
  }
}

function crear(tag, clase = "", texto = "") {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto) el.textContent = texto;
  return el;
}

// ---------- 4. Navegación ----------

function moverSemana(semanas) {
  const nuevo = sumarDias(lunesVisible, semanas * 7);
  if (nuevo < LUNES_INICIO) return;
  lunesVisible = nuevo;
  dibujar();
}

$("btn-anterior").addEventListener("click", () => moverSemana(-1));
$("btn-siguiente").addEventListener("click", () => moverSemana(1));
$("btn-hoy").addEventListener("click", () => {
  lunesVisible = lunesDe(new Date()) < LUNES_INICIO ? LUNES_INICIO : lunesDe(new Date());
  dibujar();
});

// Flechas del teclado para cambiar de semana
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") moverSemana(-1);
  if (e.key === "ArrowRight") moverSemana(1);
});

dibujarMaterias();
dibujar();
setInterval(dibujar, 60 * 1000); // actualizar la línea de "ahora" cada minuto
