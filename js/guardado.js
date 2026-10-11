// ===================================================
// Guardado — lo que yo agrego desde la página
// - Eventos propios (título, fecha, horas, lugar, persona, repetir)
// - Qué actividades marqué como cumplidas
// Se guarda en el navegador (localStorage): vive en ESTE navegador/dispositivo.
// ===================================================

const CLAVE_EVENTOS = "calendario.eventos";
const CLAVE_HECHAS = "calendario.hechas";

// Leer/escribir con try/catch: en modo incógnito o con el guardado
// bloqueado, localStorage puede fallar y la página debe seguir funcionando.
function leer(clave, porDefecto) {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? porDefecto;
  } catch {
    return porDefecto;
  }
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin guardado: los cambios duran solo mientras la página esté abierta
  }
}

// ---------- Eventos ----------
// { id, titulo, fecha: "AAAA-MM-DD", inicio: "HH:MM", fin: "HH:MM",
//   lugar, persona, repetir: true/false }

let eventos = leer(CLAVE_EVENTOS, []);

export function obtenerEventos() {
  return eventos;
}

export function guardarEvento(evento) {
  if (!evento.id) evento.id = Date.now().toString(36);
  eventos = [...eventos.filter((e) => e.id !== evento.id), evento];
  escribir(CLAVE_EVENTOS, eventos);
}

export function borrarEvento(id) {
  eventos = eventos.filter((e) => e.id !== id);
  escribir(CLAVE_EVENTOS, eventos);
}

// ---------- Cumplidas ----------
// Cada ocurrencia tiene una clave "idActividad@AAAA-MM-DD"

const hechas = new Set(leer(CLAVE_HECHAS, []));

export function estaHecha(clave) {
  return hechas.has(clave);
}

export function alternarHecha(clave) {
  if (hechas.has(clave)) hechas.delete(clave);
  else hechas.add(clave);
  escribir(CLAVE_HECHAS, [...hechas]);
}

// ---------- Vista elegida (semana / mes) ----------

const CLAVE_VISTA = "calendario.vista";

export function obtenerVista() {
  return leer(CLAVE_VISTA, "semana") === "mes" ? "mes" : "semana";
}

export function guardarVista(vista) {
  escribir(CLAVE_VISTA, vista);
}
