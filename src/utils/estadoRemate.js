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
        texto: "En el historial",
        emoji: "📦",
        clase: "estado-archivado",
      };

    case "ACTIVO":
    default:
      return {
        texto: "Buscando nuevo hogar",
        emoji: "🟢",
        clase: "estado-activo",
      };
  }
}