export function obtenerEstadoRemate(remate) {
  switch (remate.estado) {
    case "FINALIZADO":
      return {
        texto: "Finalizado",
        emoji: "🏁",
        clase: "estado-finalizado",
      };

    case "ARCHIVADO":
      return {
        texto: "Archivado",
        emoji: "📦",
        clase: "estado-archivado",
      };

    case "ACTIVO":
    default:
      return {
        texto: "Activo",
        emoji: "🟢",
        clase: "estado-activo",
      };
  }
}