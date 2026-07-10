import { supabase } from "../lib/supabase";

function sanitizarTexto(valor) {
  const texto = String(valor ?? "");
  return new TextDecoder().decode(new TextEncoder().encode(texto));
}

function armarFechaCierre(fecha, hora) {
  if (!fecha || !hora) return null;
  return `${fecha}T${hora}:00-03:00`;
}

function fechaParaInput(fechaCierre) {
  if (!fechaCierre) return "";

  return new Date(fechaCierre).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Cordoba",
  });
}

function horaParaInput(fechaCierre) {
  if (!fechaCierre) return "18:00";

  return new Date(fechaCierre).toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatearCierre(remate) {
  if (!remate.fecha_cierre) return "Pendiente";

  const fecha = new Date(remate.fecha_cierre);

  const dia = fecha.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    day: "2-digit",
  });

  const mes = fecha.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    month: "2-digit",
  });

  const anio = fecha.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
  });

  const hora = fecha.toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${dia}/${mes}/${anio} - ${hora} hs`;
}

function adaptarRemate(remate) {
  return {
    id: remate.id,
    numero: remate.numero,
    titulo: remate.titulo,
    descripcion: remate.descripcion || "",
    barrio: remate.barrio || "",
    base: remate.base || 0,
    incrementoMinimo: remate.incremento || 1000,
    oferta: remate.oferta_actual || remate.base || 0,
    cierre: formatearCierre(remate),
    fechaCierre: fechaParaInput(remate.fecha_cierre),
    horaCierre: horaParaInput(remate.fecha_cierre),
    imagen: remate.imagen || "",
    estado: remate.estado || (remate.activo ? "ACTIVO" : "FINALIZADO"),
    frase: remate.frase || "",
  };
}

export async function obtenerRemates(opciones = {}) {
  const { soloActivos = false } = opciones;

  let consulta = supabase
    .from("remates")
    .select("*")
    .neq("estado", "ARCHIVADO");

  if (soloActivos) {
    consulta = consulta.eq("estado", "ACTIVO");
  }

  const { data, error } = await consulta.order("numero", {
    ascending: true,
  });

  if (error) {
    console.error("Error al obtener remates:", error);
    return [];
  }

  return (data || []).map(adaptarRemate);
}

export async function guardarRemate(remate) {
  const fechaCierre = armarFechaCierre(
    remate.fechaCierre,
    remate.horaCierre
  );

  const datosParaGuardar = {
    numero: Number(remate.numero),
    titulo: sanitizarTexto(remate.titulo),
    descripcion: sanitizarTexto(remate.descripcion),
    barrio: sanitizarTexto(remate.barrio),
    base: Number(remate.base || 0),
    incremento: Number(remate.incrementoMinimo || 1000),
    oferta_actual: Number(remate.base || 0),
    fecha_cierre: fechaCierre,
    imagen: sanitizarTexto(remate.imagen),
    frase: sanitizarTexto(remate.frase),
    activo: true,
    estado: "ACTIVO",
  };

  const { error } = await supabase
    .from("remates")
    .insert([datosParaGuardar]);

  if (error) throw error;
}

export async function editarRemate(id, remateEditado) {
  const fechaCierre = armarFechaCierre(
    remateEditado.fechaCierre,
    remateEditado.horaCierre
  );

  const { error } = await supabase
    .from("remates")
    .update({
      numero: Number(remateEditado.numero),
      titulo: sanitizarTexto(remateEditado.titulo),
      descripcion: sanitizarTexto(remateEditado.descripcion),
      barrio: sanitizarTexto(remateEditado.barrio),
      base: Number(remateEditado.base || 0),
      incremento: Number(remateEditado.incrementoMinimo || 1000),
      oferta_actual: Number(remateEditado.base || 0),
      fecha_cierre: fechaCierre,
      imagen: sanitizarTexto(remateEditado.imagen),
      frase: sanitizarTexto(remateEditado.frase),
      activo: true,
      estado: "ACTIVO",
    })
    .or(`id.eq.${id},numero.eq.${id}`);

  if (error) throw error;
}

export async function actualizarOfertaActual(id, monto) {
  const { error } = await supabase
    .from("remates")
    .update({
      oferta_actual: Number(monto),
    })
    .or(`id.eq.${id},numero.eq.${id}`);

  if (error) throw error;
}

export async function eliminarRemate(id) {
  const { error } = await supabase
    .from("remates")
    .delete()
    .or(`id.eq.${id},numero.eq.${id}`);

  if (error) throw error;
}

export async function finalizarRemate(id) {
  const { error } = await supabase
    .from("remates")
    .update({
      activo: false,
      estado: "FINALIZADO",
    })
    .or(`id.eq.${id},numero.eq.${id}`);

  if (error) throw error;
}

export async function archivarRemate(id) {
  const { error } = await supabase
    .from("remates")
    .update({
      activo: false,
      estado: "ARCHIVADO",
    })
    .or(`id.eq.${id},numero.eq.${id}`);

  if (error) throw error;
}

export async function migrarRematesLocalesASupabase() {
  alert("La migración local ya fue realizada. No hace falta volver a migrar.");
}