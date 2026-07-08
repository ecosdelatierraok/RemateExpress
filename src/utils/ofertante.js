export function obtenerOfertante() {
  return JSON.parse(localStorage.getItem("ofertante")) || null;
}

export function guardarOfertante(ofertante) {
  localStorage.setItem(
    "ofertante",
    JSON.stringify(ofertante)
  );
}
