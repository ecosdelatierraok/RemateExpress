import { esAdmin } from "../utils/admin";
import {
  archivarRemate,
  darNuevaOportunidad,
} from "../utils/rematesStorage";
import { obtenerEstadoRemate } from "../utils/estadoRemate";
import { Link } from "react-router-dom";

function TarjetaRemate({ remate, cantidadOfertas = 0 }) {
  if (!remate) return null;

  const admin = esAdmin();
  const estado = obtenerEstadoRemate(remate);

  const remateActivo = remate.estado === "ACTIVO";
  const remateFinalizado = remate.estado === "FINALIZADO";
  const remateArchivado = remate.estado === "ARCHIVADO";

  const esImagen =
    typeof remate.imagen === "string" &&
    remate.imagen.startsWith("data:image");

  const cantidadFotos =
    Array.isArray(remate.imagenes) && remate.imagenes.length > 0
      ? remate.imagenes.length
      : remate.imagen
        ? 1
        : 0;

  async function compartirRemate() {
    const numeroRemate = remate.numero || remate.id;

    const urlRemate = `${window.location.origin}/remate/${numeroRemate}`;

    const texto =
      `Te comparto este remate de Remate Express:\n\n` +
      `🔨 #${numeroRemate} · ${remate.titulo}\n` +
      `💰 Base: $${Number(remate.base).toLocaleString("es-AR")}\n` +
      `📍 ${remate.barrio}\n\n` +
      `Mirá todos los detalles y participá desde acá:`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Remate #${numeroRemate} · ${remate.titulo}`,
          text: texto,
          url: urlRemate,
        });

        return;
      }

      await navigator.clipboard.writeText(
        `${texto}\n${urlRemate}`
      );

      alert("Texto y link del remate copiados.");
    } catch (error) {
      if (error?.name !== "AbortError") {
        alert("No se pudo compartir el remate.");
      }
    }
  }

  return (
    <article className="tarjeta-remate">
      {esImagen ? (
        <img
          src={remate.imagen}
          alt={remate.titulo}
          className="foto-remate-img"
        />
      ) : (
        <div className="foto-remate">{remate.imagen}</div>
      )}

      <div>
        <h2>
          #{remate.numero || remate.id} - {remate.titulo}
        </h2>

        <p className={estado.clase}>
          {estado.emoji} {estado.texto}
        </p>

        <p>📍 {remate.barrio}</p>

        <p>
          💰 Base: ${Number(remate.base).toLocaleString("es-AR")}
        </p>

        <p>
          🔨 Oferta actual: $
          {Number(remate.oferta).toLocaleString("es-AR")}
        </p>

        <p>
          🔥 {cantidadOfertas}{" "}
          {cantidadOfertas === 1 ? "oferta realizada" : "ofertas realizadas"}
        </p>

        <p>
          📷 {cantidadFotos}{" "}
          {cantidadFotos === 1 ? "foto disponible" : "fotos disponibles"}
        </p>

        <p>
          ⏰ {remateFinalizado ? "Finalizó" : "Finaliza"}:{" "}
          {remate.cierre}
        </p>

        {!remateArchivado && (
          <>
            <Link
              to={`/remate/${remate.numero || remate.id}`}
              className="boton-secundario"
              onClick={() => {
                sessionStorage.setItem(
                  "scroll-remates",
                  String(window.scrollY)
                );
              }}
            >
              Ver remate
            </Link>

            <button
              className="boton-secundario"
              type="button"
              onClick={compartirRemate}
            >
              📤 Compartir este remate
            </button>
          </>
        )}

        {admin && (
          <>
            {remateActivo && (
              <Link
                to={`/editar/${remate.numero || remate.id}`}
                className="boton-secundario"
              >
                ✏️ Editar
              </Link>
            )}

            {remateFinalizado && (
              <button
                className="boton-secundario"
                type="button"
                onClick={async () => {
                  const confirmar = window.confirm(
                    `¿Querés pasar el remate #${remate.numero} al historial?`
                  );

                  if (!confirmar) return;

                  await archivarRemate(remate.id);

                  sessionStorage.setItem(
                    "filtro-estado-remates",
                    "ARCHIVADO"
                  );

                  sessionStorage.setItem(
                    "remate-destacado-numero",
                    String(remate.numero)
                  );

                  window.location.reload();
                }}
              >
                📦 Pasar al historial
              </button>
            )}

            {remateArchivado && (
              <button
                className="boton-secundario"
                type="button"
                onClick={async () => {
                  const confirmar = window.confirm(
                    "¿Querés darle una nueva oportunidad a este objeto?\n\nSe eliminarán las ofertas anteriores, volverá a la base original y quedará publicado durante 24 horas."
                  );

                  if (!confirmar) return;

                  await darNuevaOportunidad(remate);

                  sessionStorage.setItem(
                    "filtro-estado-remates",
                    "ACTIVO"
                  );

                  sessionStorage.setItem(
                    "remate-destacado-numero",
                    String(remate.numero)
                  );

                  window.location.reload();
                }}
              >
                🌱 Dar una nueva oportunidad
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

export default TarjetaRemate;