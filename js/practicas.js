// ===================================================
// Prácticas — seguimiento de las prácticas a las que apliqué
// Cada aplicación: { id, empresa, puesto, ciudad, fecha "AAAA-MM-DD",
//                    enlace, estado: "activa" | "rechazada", nota }
// Se guarda en el navegador (localStorage), igual que los eventos y las finanzas.
// ===================================================

import { leer, escribir } from "./guardado.js";
import { aISO, deISO, fmtAnio, $, crear, escapar } from "./util.js";

const CLAVE = "calendario.practicas";
let practicas = leer(CLAVE, []);
let filtro = "todas"; // "todas" | "activa" | "rechazada"
let editando = null;

function guardar() {
  escribir(CLAVE, practicas);
  dibujarPracticas();
}

export function iniciarPracticas() {
  $("btn-practica").addEventListener("click", () => abrirPractica(null));

  for (const btn of document.querySelectorAll("[data-filtro]")) {
    btn.addEventListener("click", () => {
      filtro = btn.dataset.filtro;
      dibujarPracticas();
    });
  }

  const form = $("form-practica");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const p = {
      id: editando?.id ?? Date.now().toString(36),
      empresa: form.empresa.value.trim(),
      puesto: form.puesto.value.trim(),
      ciudad: form.ciudad.value.trim(),
      fecha: form.fecha.value,
      enlace: form.enlace.value.trim(),
      estado: form.estado.value,
      nota: form.nota.value.trim(),
    };
    practicas = [...practicas.filter((x) => x.id !== p.id), p];
    $("dialogo-practica").close();
    guardar();
  });

  $("btn-cancelar-practica").addEventListener("click", () => $("dialogo-practica").close());
  $("btn-borrar-practica").addEventListener("click", () => {
    if (!confirm(`¿Borrar la aplicación a ${editando.empresa}?`)) return;
    practicas = practicas.filter((x) => x.id !== editando.id);
    $("dialogo-practica").close();
    guardar();
  });

  dibujarPracticas();
}

function abrirPractica(p) {
  editando = p;
  const form = $("form-practica");
  const d = p ?? { empresa: "", puesto: "", ciudad: "", fecha: aISO(new Date()), enlace: "", estado: "activa", nota: "" };
  $("practica-titulo").textContent = p ? "Editar aplicación" : "Nueva aplicación";
  form.empresa.value = d.empresa;
  form.puesto.value = d.puesto;
  form.ciudad.value = d.ciudad;
  form.fecha.value = d.fecha;
  form.enlace.value = d.enlace;
  form.estado.value = d.estado;
  form.nota.value = d.nota;
  $("btn-borrar-practica").hidden = !p;
  $("dialogo-practica").showModal();
  form.empresa.focus();
}

// Solo enlaces http(s); cualquier otra cosa no se convierte en link
function enlaceSeguro(texto) {
  try {
    const url = new URL(texto);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function dibujarPracticas() {
  const activas = practicas.filter((p) => p.estado === "activa").length;
  const rechazadas = practicas.filter((p) => p.estado === "rechazada").length;

  $("practicas-cifras").innerHTML = `
    <div class="cifra-grande cifra-grande--activa"><strong>${activas}</strong><span>Activas</span></div>
    <div class="cifra-grande cifra-grande--rechazada"><strong>${rechazadas}</strong><span>Rechazadas</span></div>
    <div class="cifra-grande"><strong>${activas + rechazadas}</strong><span>Total</span></div>
  `;

  for (const btn of document.querySelectorAll("[data-filtro]")) {
    btn.setAttribute("aria-pressed", btn.dataset.filtro === filtro);
  }

  const lista = $("practicas-lista");
  lista.innerHTML = "";
  const visibles = practicas
    .filter((p) => filtro === "todas" || p.estado === filtro)
    .sort((a, b) => b.fecha.localeCompare(a.fecha)); // las más recientes primero

  if (visibles.length === 0) {
    lista.append(crear("li", "practicas__vacio",
      practicas.length ? "No hay aplicaciones con este filtro." : "Todavía no registras ninguna aplicación. Usa “+ Aplicación”."));
    return;
  }

  for (const p of visibles) lista.append(filaPractica(p));
}

function filaPractica(p) {
  const li = crear("li", `practica practica--${p.estado}`);
  const enlace = enlaceSeguro(p.enlace);
  const detalles = [p.puesto, p.ciudad, `Aplicada el ${fmtAnio.format(deISO(p.fecha))}`].filter(Boolean);

  li.innerHTML = `
    <div class="practica__info">
      <div class="practica__cabeza">
        <strong>${escapar(p.empresa)}</strong>
        <span class="practica__estado">${p.estado === "activa" ? "Activa" : "Rechazada"}</span>
      </div>
      <p class="practica__detalle">${detalles.map(escapar).join(" · ")}</p>
      ${p.nota ? `<p class="practica__nota">${escapar(p.nota)}</p>` : ""}
    </div>
  `;

  const acciones = crear("div", "practica__acciones");
  if (enlace) {
    const a = crear("a", "practica__enlace", "Ver oferta ↗");
    a.href = enlace;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    acciones.append(a);
  }

  // Cambiar de estado con un clic
  const cambiar = crear("button", "", p.estado === "activa" ? "Marcar rechazada" : "Reactivar");
  cambiar.type = "button";
  cambiar.addEventListener("click", () => {
    p.estado = p.estado === "activa" ? "rechazada" : "activa";
    guardar();
  });

  const editar = crear("button", "", "Editar");
  editar.type = "button";
  editar.addEventListener("click", () => abrirPractica(p));

  acciones.append(cambiar, editar);
  li.append(acciones);
  return li;
}
