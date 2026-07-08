import { esAdmin } from "../utils/admin";
import { eliminarRemate } from "../utils/rematesStorage";
import { Link } from "react-router-dom";

function TarjetaRemate({ remate }) {
  if (!remate) return null;

  const esImagen =
    typeof remate.imagen === "string" && remate.imagen.startsWith("data:image");

  return (
    <article className="tarjeta-remate">
      {esImagen ? (
        <img src={remate.imagen} alt={remate.titulo} className="foto-remate-img" />
      ) : (
        <div className="foto-remate">{remate.imagen}</div>
      )}

      <div>
        <h2>#{remate.numero || remate.id} - {remate.titulo}</h2>

        <p>📍 {remate.barrio}</p>
        <p>Base: ${Number(remate.base).toLocaleString("es-AR")}</p>
        <p>Oferta actual: ${Number(remate.oferta).toLocaleString("es-AR")}</p>
        <p>Finaliza: {remate.cierre}</p>

        <Link
          to={`/remate/${remate.numero || remate.id}`}
          className="boton-secundario"
          onClick={() => {
            sessionStorage.setItem("scroll-remates", String(window.scrollY));
          }}
        >
          Ver remate
        </Link>

        {esAdmin() && (
          <>
            <Link
              to={`/editar/${remate.numero || remate.id}`}
              className="boton-secundario"
            >
              ✏️ Editar
            </Link>

            <button
              className="boton-secundario"
              onClick={async () => {
                if (window.confirm(`¿Eliminar definitivamente el remate #${remate.numero}?`)) {
                  await eliminarRemate(remate.id || remate.numero);
                  window.location.reload();
                }
              }}
            >
              🗑️ Eliminar
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export default TarjetaRemate;