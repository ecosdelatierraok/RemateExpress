import Logo from "../components/Logo";
import { Link, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import ModalOfertante from "../components/ModalOfertante";
import { obtenerOfertante } from "../utils/ofertante";
import { esAdmin } from "../utils/admin";
import {
  obtenerRemates,
  finalizarRemate,
  actualizarOfertaActual,
} from "../utils/rematesStorage";
import {
  obtenerOfertas,
  guardarOferta,
} from "../utils/ofertasStorage";
import "../App.css";

function DetalleRemate() {
  const { id } = useParams();

  const [remate, setRemate] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [monto, setMonto] = useState("");
  const [ofertas, setOfertas] = useState([]);
  const [ofertante, setOfertante] = useState(obtenerOfertante());
  const [finalizando, setFinalizando] = useState(false);
  const [ofertando, setOfertando] = useState(false);
  const [indiceImagen, setIndiceImagen] = useState(0);

  const inicioDeslizamiento = useRef(null);

  const adminActivo = esAdmin();

  async function cargarRemate() {
    const remates = await obtenerRemates();

    const encontrado = remates.find(
      (item) => item.id === Number(id) || item.numero === Number(id)
    );

    setRemate(encontrado || null);
    setCargando(false);

    return encontrado || null;
  }

  async function cargarOfertas(remateId) {
    try {
      const datos = await obtenerOfertas(remateId);
      setOfertas(datos);
    } catch (error) {
      console.error("Error al cargar ofertas:", error);
      setOfertas([]);
    }
  }

  useEffect(() => {
    async function iniciar() {
      const remateEncontrado = await cargarRemate();

      if (remateEncontrado) {
        await cargarOfertas(remateEncontrado.id);
      }

      setMonto("");
      setIndiceImagen(0);
    }

    iniciar();
  }, [id]);

  if (cargando) {
    return (
      <main className="app">
        <section className="hero">
          <Logo />
          <h1>Cargando remate...</h1>
        </section>
      </main>
    );
  }

  if (!remate) {
    return (
      <main className="app">
        <section className="hero">
          <Logo />
          <h1>Remate no encontrado</h1>

          <Link to="/remates" className="boton-secundario">
            ← Volver
          </Link>
        </section>
      </main>
    );
  }

  const remateFinalizado = remate.estado === "FINALIZADO";

  const imagenes =
    Array.isArray(remate.imagenes) && remate.imagenes.length > 0
      ? remate.imagenes
      : remate.imagen
        ? [remate.imagen]
        : [];

  const imagenActual = imagenes[indiceImagen] || "";

  const mejorOferta = ofertas.length
    ? Math.max(...ofertas.map((oferta) => oferta.monto))
    : remate.oferta;

  const ganador = ofertas.length
    ? ofertas.reduce((mejor, oferta) =>
        oferta.monto > mejor.monto ? oferta : mejor
      )
    : null;

  const minimo = mejorOferta + remate.incrementoMinimo;

  function actualizarOfertante() {
    setOfertante(obtenerOfertante());
  }

  function mostrarImagenAnterior() {
    setIndiceImagen((indiceActual) =>
      indiceActual === 0 ? imagenes.length - 1 : indiceActual - 1
    );
  }

  function mostrarImagenSiguiente() {
    setIndiceImagen((indiceActual) =>
      indiceActual === imagenes.length - 1 ? 0 : indiceActual + 1
    );
  }

  function iniciarDeslizamiento(event) {
    inicioDeslizamiento.current = event.touches[0].clientX;
  }

  function finalizarDeslizamiento(event) {
    if (inicioDeslizamiento.current === null || imagenes.length <= 1) return;

    const fin = event.changedTouches[0].clientX;
    const diferencia = inicioDeslizamiento.current - fin;

    if (diferencia > 50) {
      mostrarImagenSiguiente();
    }

    if (diferencia < -50) {
      mostrarImagenAnterior();
    }

    inicioDeslizamiento.current = null;
  }

  async function registrarOferta(event) {
    event.preventDefault();

    if (remateFinalizado) {
      alert("Este remate ya finalizó. No se pueden hacer más ofertas.");
      return;
    }

    if (!ofertante) return;

    const montoNumerico = Number(monto || minimo);

    if (!montoNumerico || montoNumerico < minimo) {
      alert(`La oferta mínima es $${minimo.toLocaleString("es-AR")}`);
      return;
    }

    try {
      setOfertando(true);

      await guardarOferta({
        remateId: remate.id,
        nombre: ofertante.nombre,
        telefono: ofertante.telefono,
        monto: montoNumerico,
      });

      await actualizarOfertaActual(remate.id, montoNumerico);
      await cargarOfertas(remate.id);
      await cargarRemate();

      setMonto("");
    } catch (error) {
      console.error("Error al registrar oferta:", error);
      alert("No se pudo registrar la oferta. Intentá nuevamente.");
    } finally {
      setOfertando(false);
    }
  }

  async function manejarFinalizarRemate() {
    const confirmar = window.confirm(
      "¿Querés finalizar este remate? Una vez finalizado, no se podrán hacer más ofertas."
    );

    if (!confirmar) return;

    try {
      setFinalizando(true);
      await finalizarRemate(remate.id);
      await cargarRemate();
      await cargarOfertas(remate.id);
    } catch (error) {
      console.error("Error al finalizar remate:", error);
      alert("No se pudo finalizar el remate.");
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <main className="app">
      {!ofertante && !remateFinalizado && (
        <ModalOfertante onGuardar={actualizarOfertante} />
      )}

      <section className="hero">
        <Logo />

        {imagenActual.startsWith("data:image") ? (
          <>
            <img
              src={imagenActual}
              alt={`${remate.titulo} - Foto ${indiceImagen + 1}`}
              className="foto-detalle-img"
              onClick={() => {
                if (imagenes.length > 1) {
                  mostrarImagenSiguiente();
                }
              }}
              onTouchStart={iniciarDeslizamiento}
              onTouchEnd={finalizarDeslizamiento}
              style={{
                cursor: imagenes.length > 1 ? "pointer" : "default",
                touchAction: "pan-y",
              }}
            />

            {imagenes.length > 1 && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "14px",
                  }}
                >
                  <button
                    className="boton-secundario"
                    type="button"
                    onClick={mostrarImagenAnterior}
                    style={{ marginTop: 0 }}
                  >
                    ←
                  </button>

                  <strong>
                    Foto {indiceImagen + 1} de {imagenes.length}
                  </strong>

                  <button
                    className="boton-secundario"
                    type="button"
                    onClick={mostrarImagenSiguiente}
                    style={{ marginTop: 0 }}
                  >
                    →
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    overflowX: "auto",
                    marginBottom: "20px",
                    paddingBottom: "6px",
                  }}
                >
                  {imagenes.map((imagen, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setIndiceImagen(index)}
                      style={{
                        flex: "0 0 auto",
                        padding: 0,
                        border:
                          index === indiceImagen
                            ? "3px solid #4f6443"
                            : "1px solid #ded2bc",
                        borderRadius: "12px",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={imagen}
                        alt={`Miniatura ${index + 1}`}
                        style={{
                          display: "block",
                          width: "72px",
                          height: "72px",
                          objectFit: "cover",
                          borderRadius: "9px",
                        }}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="foto-detalle">{imagenActual}</div>
        )}

        <h1>
          #{remate.numero || remate.id} · {remate.titulo}
        </h1>

        {remateFinalizado ? (
          <p className="dato-destacado">🏁 Remate finalizado</p>
        ) : (
          <p className="dato-destacado">🟢 Remate activo</p>
        )}

        <p className="dato-destacado">
          💰 Base: ${Number(remate.base).toLocaleString("es-AR")}
        </p>

        <p>
          📈 Mejor oferta: ${Number(mejorOferta).toLocaleString("es-AR")}
        </p>

        {remateFinalizado && ganador && (
          <div className="historial-ofertas">
            <h2>🏆 Ganador</h2>

            <p>
              <strong>{ganador.nombre}</strong>
            </p>

            <p>${Number(ganador.monto).toLocaleString("es-AR")}</p>

            {adminActivo && <p>📱 {ganador.telefono}</p>}
          </div>
        )}

        {remateFinalizado && !ganador && (
          <div className="historial-ofertas">
            <h2>🏁 Resultado</h2>
            <p>Este remate finalizó sin ofertas.</p>
          </div>
        )}

        <p>
          ⬆️ Incremento mínimo: $
          {Number(remate.incrementoMinimo).toLocaleString("es-AR")}
        </p>

        <p>📍 {remate.barrio}</p>

        <p>
          ⏰ {remateFinalizado ? "Finalizó" : "Finaliza"}: {remate.cierre}
        </p>

        {remate.descripcion && (
          <>
            <h3>Características</h3>

            <p style={{ whiteSpace: "pre-line" }}>
              {remate.descripcion}
            </p>
          </>
        )}

        {remate.frase && remate.frase.trim() !== "" && (
          <>
            <h3>Antes de irte...</h3>

            <blockquote
              className="frase-neuroventa"
              style={{ whiteSpace: "pre-line" }}
            >
              {remate.frase}
            </blockquote>
          </>
        )}

        {!remateFinalizado && (
          <form className="form-oferta" onSubmit={registrarOferta}>
            <h2>Hacer una oferta</h2>

            {ofertante && (
              <p>
                Ofertando como <strong>{ofertante.nombre}</strong>
              </p>
            )}

            <input
              type="number"
              min={minimo}
              step={remate.incrementoMinimo}
              placeholder={`Mínimo $${minimo.toLocaleString("es-AR")}`}
              value={monto}
              disabled={ofertando}
              onFocus={() => {
                if (!monto) setMonto(minimo);
              }}
              onChange={(event) => setMonto(event.target.value)}
            />

            <button
              className="boton-principal"
              type="submit"
              disabled={ofertando}
            >
              {ofertando ? "Ofertando..." : "Ofertar"}
            </button>
          </form>
        )}

        {remateFinalizado && (
          <p className="dato-destacado">
            🔒 Las ofertas están cerradas para este remate.
          </p>
        )}

        {adminActivo && !remateFinalizado && (
          <button
            className="boton-secundario"
            type="button"
            onClick={manejarFinalizarRemate}
            disabled={finalizando}
          >
            {finalizando ? "Finalizando..." : "Finalizar remate"}
          </button>
        )}

        <div className="historial-ofertas">
  {ofertas.length === 0 ? (
    <>
      <h2>🌱 Primera oportunidad</h2>

      <p>
        💚 Este remate espera su primera oferta.
      </p>

      <p>
        Quizás hoy seas vos quien le dé una nueva oportunidad.
      </p>
    </>
  ) : (
    <>
      <h2>
        🔨 {ofertas.length}{" "}
        {ofertas.length === 1
          ? "oferta realizada"
          : "ofertas realizadas"}
      </h2>

      {ofertas.map((oferta) => (
        <p key={oferta.id}>
          {oferta.nombre}: $
          {Number(oferta.monto).toLocaleString("es-AR")}
          {adminActivo && oferta.telefono
            ? ` · 📱 ${oferta.telefono}`
            : ""}
        </p>
      ))}
    </>
  )}
</div>

        <Link to="/remates" className="boton-secundario">
          ← Volver a los remates
        </Link>
      </section>
    </main>
  );
}

export default DetalleRemate;