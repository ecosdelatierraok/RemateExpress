import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import BotonPrincipal from "../components/BotonPrincipal";
import { activarAdmin } from "../utils/admin";
import { obtenerRemates } from "../utils/rematesStorage";
import "../App.css";

const WHATSAPP_CURADORA = "5493541621908";

const LINK_COMUNIDAD =
  "https://chat.whatsapp.com/FuSDMF7toIZIpElT3oYtZu?s=cl&p=a&ilr=2";

function Home() {
  const navigate = useNavigate();

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [seccionAbierta, setSeccionAbierta] = useState("");
  const [clave, setClave] = useState("");
  const [cantidadActivos, setCantidadActivos] = useState(null);

  useEffect(() => {
    async function cargarCantidadActivos() {
      try {
        const remates = await obtenerRemates();

        const activos = remates.filter(
          (remate) => remate.estado === "ACTIVO"
        );

        setCantidadActivos(activos.length);
      } catch (error) {
        console.error(
          "Error al cargar la cantidad de remates activos:",
          error
        );

        setCantidadActivos(null);
      }
    }

    cargarCantidadActivos();
  }, []);

  function cambiarSeccion(seccion) {
    setSeccionAbierta((actual) =>
      actual === seccion ? "" : seccion
    );
  }

  function ingresarAdmin() {
    if (activarAdmin(clave)) {
      setMostrarLogin(false);
      navigate("/remates");
    } else {
      alert("Contraseña incorrecta.");
    }
  }

  function contactarCuradora() {
    const mensaje = encodeURIComponent(
      "Hola, Gabi. Quiero darle una nueva oportunidad a un objeto a través de Remate Express. ¿Me contás cómo hacemos?"
    );

    window.open(
      `https://wa.me/${WHATSAPP_CURADORA}?text=${mensaje}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function entrarComunidad() {
    window.open(
      LINK_COMUNIDAD,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function compartirContenido({ title, text, url }) {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(
        `${text}\n\n${url}`
      );

      alert("Texto y link copiados. Ya podés compartirlos.");
    } catch (error) {
      if (error?.name !== "AbortError") {
        alert("No se pudo compartir el enlace.");
      }
    }
  }

  async function compartirRemateExpress() {
    await compartirContenido({
      title: "Remate Express",
      text:
        "Te comparto Remate Express, una iniciativa comunitaria creada por Gabi (@Gabiaguz) en Córdoba. Es un espacio donde los objetos encuentran un nuevo hogar a través de remates simples, cercanos y transparentes.",
      url: window.location.href,
    });
  }

  async function compartirComunidad() {
    await compartirContenido({
      title: "Comunidad Remate Express",
      text:
        "Te comparto la comunidad de Remate Express, un proyecto creado por Gabi (@Gabiaguz) en Córdoba. En este grupo de WhatsApp se informan nuevos remates, oportunidades y novedades de la comunidad.",
      url: LINK_COMUNIDAD,
    });
  }

  return (
    <main className="app">
      <section className="hero">
        <div onDoubleClick={() => setMostrarLogin(true)}>
          <Logo />
        </div>

        <p className="frase">
          Cada objeto merece una segunda oportunidad.
        </p>

        {cantidadActivos !== null && (
          <p className="dato-destacado">
            🔨 Hoy hay {cantidadActivos}{" "}
            {cantidadActivos === 1
              ? "remate activo"
              : "remates activos"}
          </p>
        )}

        <BotonPrincipal>
          Ver remates activos
        </BotonPrincipal>

        <div className="panel-admin">
          <button
            className="boton-secundario"
            type="button"
            onClick={() =>
              cambiarSeccion("COMO_FUNCIONA")
            }
          >
            ❓ ¿Cómo funciona?
          </button>

          <button
            className="boton-secundario"
            type="button"
            onClick={() =>
              cambiarSeccion("QUIERO_REMATAR")
            }
          >
            🌱 Quiero rematar
          </button>

          <button
            className="boton-secundario"
            type="button"
            onClick={() =>
              cambiarSeccion("COMUNIDAD")
            }
          >
            💬 Comunidad
          </button>

          <button
            className="boton-secundario"
            type="button"
            onClick={() =>
              cambiarSeccion("COMPARTIR")
            }
          >
            📤 Compartir Remate Express
          </button>
        </div>

        {seccionAbierta === "COMO_FUNCIONA" && (
          <div className="historial-ofertas">
            <h2>¿Cómo funciona?</h2>

            <p>
              🔎 Elegí el objeto que te interese y entrá a
              ver todos sus detalles.
            </p>

            <p>
              🔨 Si te interesa, hacé tu oferta respetando
              el incremento mínimo.
            </p>

            <p>
              🏁 Cuando termine el remate, gana la oferta
              más alta.
            </p>

            <p>
              👀 El resultado y el historial de ofertas
              quedan visibles para que todo sea
              transparente.
            </p>

            <p>
              🤝 Para la entrega, el retiro o un posible
              envío, Gabi se pondrá en contacto con quien
              resulte adjudicatario para coordinarlo.
            </p>
          </div>
        )}

        {seccionAbierta === "QUIERO_REMATAR" && (
          <div className="historial-ofertas">
            <h2>🌱 Quiero rematar</h2>

            <p>
              ¿Tenés un objeto que todavía tiene mucho para
              ofrecer?
            </p>

            <p>
              Remate Express puede ayudarlo a encontrar un
              nuevo hogar.
            </p>

            <p>
              La comisión del servicio es del 10% sobre el
              valor final adjudicado.
            </p>

            <p>
              Para publicarlo, comunicate con Gabi. Te
              acompañará para preparar el remate y resolver
              cualquier duda.
            </p>

            <button
              className="boton-principal"
              type="button"
              onClick={contactarCuradora}
            >
              💬 Hablar con Gabi
            </button>
          </div>
        )}

        {seccionAbierta === "COMUNIDAD" && (
          <div className="historial-ofertas">
            <h2>💬 Comunidad Remate Express</h2>

            <p>
              La comunidad funciona a través de un grupo de
              WhatsApp.
            </p>

            <p>
              Allí compartimos nuevos remates, novedades
              importantes y oportunidades que pueden
              encontrar justo a la persona indicada.
            </p>

            <p>
              Es un espacio simple y cercano, construido con
              el boca en boca y el cuidado de quienes
              participan.
            </p>

            <button
              className="boton-principal"
              type="button"
              onClick={entrarComunidad}
            >
              Entrar a la comunidad
            </button>

            <button
              className="boton-secundario"
              type="button"
              onClick={compartirComunidad}
            >
              📤 Compartir la comunidad
            </button>
          </div>
        )}

        {seccionAbierta === "COMPARTIR" && (
          <div className="historial-ofertas">
            <h2>📤 Compartir Remate Express</h2>

            <p>
              Remate Express crece de persona a persona.
            </p>

            <p>
              Compartilo con alguien que disfrute encontrar
              oportunidades o que pueda darle un nuevo
              hogar a alguno de estos objetos.
            </p>

            <button
              className="boton-principal"
              type="button"
              onClick={compartirRemateExpress}
            >
              Compartir Remate Express
            </button>
          </div>
        )}

        {mostrarLogin && (
          <div className="modal-admin">
            <h2>Administrador</h2>

            <input
              type="password"
              placeholder="Contraseña"
              value={clave}
              onChange={(event) =>
                setClave(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  ingresarAdmin();
                }
              }}
            />

            <button
              className="boton-principal"
              type="button"
              onClick={ingresarAdmin}
            >
              Ingresar
            </button>
          </div>
        )}

        <footer
          style={{
            marginTop: "42px",
            paddingTop: "20px",
            borderTop: "1px solid var(--beige)",
            color: "var(--verde-oliva)",
            fontSize: "14px",
            lineHeight: "1.6",
          }}
        >
          <div>
            Remate Express V1 © 2026 · Córdoba, Argentina
          </div>

          <div>
            Un proyecto creado por{" "}
            <strong>@Gabiaguz</strong>
          </div>
        </footer>
      </section>
    </main>
  );
}

export default Home;