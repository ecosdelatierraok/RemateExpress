export function esAdmin() {
  return localStorage.getItem("admin-remate-express") === "true";
}

export function activarAdmin(clave) {
  const CLAVE =
  localStorage.getItem("clave-admin-remate-express") || "curadora";

if (clave === CLAVE) {
    localStorage.setItem("admin-remate-express", "true");
    return true;
  }

  return false;
}

export function salirAdmin() {
  localStorage.removeItem("admin-remate-express");
}

export function cambiarClaveAdmin(nuevaClave) {
  localStorage.setItem(
    "clave-admin-remate-express",
    nuevaClave
  );
}

export function ingresarComoAdmin() {
  const clave = prompt("Contraseña de administración:");

  if (clave === null) return;

  if (activarAdmin(clave)) {
    window.location.reload();
  } else {
    alert("Contraseña incorrecta.");
  }
}