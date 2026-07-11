import { supabase } from "../lib/supabase";

function sanitizarTexto(valor) {
  const texto = String(valor ?? "");
  return new TextDecoder().decode(new TextEncoder().encode(texto));
}

function sanitizarImagenes(imagenes) {
  if (!Array.isArray(imagenes)) return [];

  return imagenes
    .filter((imagen) => typeof imagen === "string" && imagen.trim() !== "")
    .slice(0, 5)
    .map((imagen) => sanitizarTexto(imagen));
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

function sumar24Horas(fechaCierre) {
  const fecha = new Date(fechaCierre);
  fecha.setHours(fecha.getHours() + 24);
  return fecha.toISOString();
}

function fechaDentroDe24Horas() {
  const fecha = new Date();
  fecha.setHours(fecha.getHours() + 24);
  return fecha.toISOString();
}

function restarSieteDias(fecha) {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() - 7);
  return resultado.toISOString();
}

async function procesarRematesVencidos() {
  const ahora = new Date().toISOString();

  const { data: vencidos, error: errorVencidos } = await supabase
    .from("remates")
    .select("id, fecha_cierre")
    .eq("estado", "ACTIVO")
    .not("fecha_cierre", "is", null)
    .lte("fecha_cierre", ahora);

  if (errorVencidos) {
    console.error("Error al buscar remates vencidos:", errorVencidos);
    return;
  }

  if (!vencidos || vencidos.length === 0) return;

  const idsVencidos = vencidos.map((remate) => remate.id);

  const { data: ofertas, error: errorOfertas } = await supabase
    .from("ofertas")
    .select("remate_id")
    .in("remate_id", idsVencidos);

  if (errorOfertas) {
    console.error("Error al revisar ofertas:", errorOfertas);
    return;
  }

  const rematesConOfertas = new Set(
    (ofertas || []).map((oferta) => Number(oferta.remate_id))
  );

  await Promise.all(
    vencidos.map(async (remate) => {
      if (rematesConOfertas.has(Number(remate.id))) {
        const { error } = await supabase
          .from("remates")
          .update({
            activo: false,
            estado: "FINALIZADO",
            fecha_finalizacion: ahora,
          })
          .eq("id", remate.id);

        if (error) {
          console.error(
            `Error al finalizar el remate ${remate.id}:`,
            error
          );
        }

        return;
      }

      const { error } = await supabase
        .from("remates")
        .update({
          activo: true,
          estado: "ACTIVO",
          fecha_cierre: sumar24Horas(remate.fecha_cierre),
          fecha_finalizacion: null,
        })
        .eq("id", remate.id);

      if (error) {
        console.error(
          `Error al renovar el remate ${remate.id}:`,
          error
        );
      }
    })
  );
}

async function completarFechasFinalizacion() {
  const ahora = new Date().toISOString();

  const { error } = await supabase
    .from("remates")
    .update({
      fecha_finalizacion: ahora,
    })
    .eq("estado", "FINALIZADO")
    .is("fecha_finalizacion", null);

  if (error) {
    console.error(
      "Error al completar fechas de finalización:",
      error
    );
  }
}

async function archivarRematesAntiguos() {
  const limite = restarSieteDias(new Date());

  const { error } = await supabase
    .from("remates")
    .update({
      activo: false,
      estado: "ARCHIVADO",
    })
    .eq("estado", "FINALIZADO")
    .not("fecha_finalizacion", "is", null)
    .lte("fecha_finalizacion", limite);

  if (error) {
    console.error(
      "Error al archivar remates antiguos:",
      error
    );
  }
}

async function procesarEstadosAutomaticos() {
  await procesarRematesVencidos();
  await completarFechasFinalizacion();
  await archivarRematesAntiguos();
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
  const imagenesGuardadas = Array.isArray(remate.imagenes)
    ? remate.imagenes.filter(Boolean)
    : [];

  const imagenPrincipal =
    imagenesGuardadas[0] || remate.imagen || "";

  const imagenes =
    imagenesGuardadas.length > 0
      ? imagenesGuardadas
      : imagenPrincipal
        ? [imagenPrincipal]
        : [];

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
    imagen: imagenPrincipal,
    imagenes,
    estado: remate.estado || (remate.activo ? "ACTIVO" : "FINALIZADO"),
    fechaFinalizacion: remate.fecha_finalizacion || null,
    frase: remate.frase || "",
  };
}

export async function obtenerRemates(opciones = {}) {
  const { incluirArchivados = false } = opciones;

  await procesarEstadosAutomaticos();

  let consulta = supabase.from("remates").select("*");

  if (!incluirArchivados) {
    consulta = consulta.neq("estado", "ARCHIVADO");
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

  const imagenes = sanitizarImagenes(remate.imagenes);
  const imagenPrincipal =
    imagenes[0] || sanitizarTexto(remate.imagen);

  const datosParaGuardar = {
    numero: Number(remate.numero),
    titulo: sanitizarTexto(remate.titulo),
    descripcion: sanitizarTexto(remate.descripcion),
    barrio: sanitizarTexto(remate.barrio),
    base: Number(remate.base || 0),
    incremento: Number(remate.incrementoMinimo || 1000),
    oferta_actual: Number(remate.base || 0),
    fecha_cierre: fechaCierre,
    fecha_finalizacion: null,
    imagen: imagenPrincipal,
    imagenes,
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

  const imagenes = sanitizarImagenes(remateEditado.imagenes);
  const imagenPrincipal =
    imagenes[0] || sanitizarTexto(remateEditado.imagen);

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
      fecha_finalizacion: null,
      imagen: imagenPrincipal,
      imagenes,
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
      fecha_finalizacion: new Date().toISOString(),
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

export async function darNuevaOportunidad(remate) {
  const { error: errorOfertas } = await supabase
    .from("ofertas")
    .delete()
    .eq("remate_id", Number(remate.id));

  if (errorOfertas) throw errorOfertas;

  const { error: errorRemate } = await supabase
    .from("remates")
    .update({
      activo: true,
      estado: "ACTIVO",
      oferta_actual: Number(remate.base || 0),
      fecha_cierre: fechaDentroDe24Horas(),
      fecha_finalizacion: null,
    })
    .eq("id", Number(remate.id));

  if (errorRemate) throw errorRemate;
}

export async function migrarRematesLocalesASupabase() {
  alert("La migración local ya fue realizada. No hace falta volver a migrar.");
}