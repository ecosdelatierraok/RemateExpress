import { supabase } from "../lib/supabase";

function sanitizarTexto(valor) {
  const texto = String(valor ?? "");
  return new TextDecoder().decode(new TextEncoder().encode(texto));
}

function adaptarOferta(oferta) {
  return {
    id: oferta.id,
    remateId: oferta.remate_id,
    nombre: oferta.nombre || "",
    telefono: oferta.telefono || "",
    monto: Number(oferta.monto || 0),
    fecha: oferta.fecha
      ? new Date(oferta.fecha).toLocaleString("es-AR", {
          timeZone: "America/Argentina/Cordoba",
        })
      : "",
  };
}

export async function obtenerOfertas(remateId) {
  const { data, error } = await supabase
    .from("ofertas")
    .select("*")
    .eq("remate_id", Number(remateId))
    .order("monto", { ascending: true });

  if (error) throw error;

  return (data || []).map(adaptarOferta);
}

export async function obtenerCantidadOfertasPorRemate() {
  const { data, error } = await supabase
    .from("ofertas")
    .select("remate_id");

  if (error) throw error;

  return (data || []).reduce((cantidades, oferta) => {
    const remateId = Number(oferta.remate_id);

    cantidades[remateId] = (cantidades[remateId] || 0) + 1;

    return cantidades;
  }, {});
}

export async function guardarOferta(oferta) {
  const { data, error } = await supabase
    .from("ofertas")
    .insert([
      {
        remate_id: Number(oferta.remateId),
        nombre: sanitizarTexto(oferta.nombre),
        telefono: sanitizarTexto(oferta.telefono),
        monto: Number(oferta.monto),
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return adaptarOferta(data);
}