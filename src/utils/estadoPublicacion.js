export function obtenerEstadoPublicacion(publicacion) {
  switch (publicacion.estado) {
    case "FINALIZADO":
      return {
        texto: "Recepción finalizada",
        emoji: "🏁",
        clase: "estado-finalizado",
      };

    case "ARCHIVADO":
      return {
        texto: "En el historial",
        emoji: "📦",
        clase: "estado-archivado",
      };

    case "ACTIVO":
    default:
      return {
        texto: "Disponible",
        emoji: "🟢",
        clase: "estado-activo",
      };
  }
}