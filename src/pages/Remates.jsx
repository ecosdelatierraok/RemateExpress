import { useEffect, useMemo, useState } from "react";
import Logo from "../components/Logo";
import { Link } from "react-router-dom";
import {
  obtenerRemates,
  migrarRematesLocalesASupabase,
} from "../utils/rematesStorage";
import { obtenerCantidadOfertasPorRemate } from "../utils/ofertasStorage";
import { esAdmin, salirAdmin } from "../utils/admin";
import TarjetaRemate from "../components/TarjetaRemate";
import "../App.css";

function Remates() {
  const admin = esAdmin();

  const [remates, setRemates] = useState([]);
  const [cantidadesOfertas, setCantidadesOfertas] = useState({});
  const [barrioSeleccionado, setBarrioSeleccionado] = useState("TODOS");
  const [orden, setOrden] = useState("NUMERO");

  useEffect(() => {
    async function cargarRemates() {
      const [datos, cantidades] = await Promise.all([
        obtenerRemates({
          soloActivos: !admin,
        }),
        obtenerCantidadOfertasPorRemate(),
      ]);

      setRemates(datos);
      setCantidadesOfertas(cantidades);

      setTimeout(() => {
        const numeroDestacado = sessionStorage.getItem(
          "remate-destacado-numero"
        );

        if (numeroDestacado) {
          const tarjeta = document.getElementById(
            `remate-${numeroDestacado}`
          );

          if (tarjeta) {
            tarjeta.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }

          sessionStorage.removeItem("remate-destacado-numero");
          return;
        }

        const scroll = sessionStorage.getItem("scroll-remates");

        if (scroll) {
          window.scrollTo({
            top: Number(scroll),
            behavior: "auto",
          });

          sessionStorage.removeItem("scroll-remates");
        }
      }, 50);
    }

    cargarRemates();
  }, [admin]);

  const barrios = useMemo(() => {
    return [
      ...new Set(
        remates
          .map((remate) => remate.barrio?.trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "es"));
  }, [remates]);

  const rematesVisibles = useMemo(() => {
    const filtrados =
      barrioSeleccionado === "TODOS"
        ? [...remates]
        : remates.filter(
            (remate) => remate.barrio === barrioSeleccionado
          );

    if (orden === "MAS_OFERTAS") {
      return filtrados.sort((a, b) => {
        const ofertasA = cantidadesOfertas[a.id] || 0;
        const ofertasB = cantidadesOfertas[b.id] || 0;

        if (ofertasB !== ofertasA) {
          return ofertasB - ofertasA;
        }

        return Number(a.numero) - Number(b.numero);
      });
    }

    return filtrados.sort(
      (a, b) => Number(a.numero) - Number(b.numero)
    );
  }, [
    remates,
    barrioSeleccionado,
    orden,
    cantidadesOfertas,
  ]);

  return (
    <main className="app">
      <section className="hero">
        <Logo />

        <h1>{admin ? "Remates" : "Remates activos"}</h1>

        <p className="frase">
          Estos son los objetos buscando nuevo hogar.
        </p>

        {admin && (
          <div className="panel-admin">
            <Link to="/nuevo" className="boton-principal">
              ➕ Nuevo remate
            </Link>

            <Link to="/configuracion" className="boton-principal">
              ⚙ Configuración
            </Link>

            <button
              className="boton-secundario"
              onClick={async () => {
                await migrarRematesLocalesASupabase();
                window.location.reload();
              }}
            >
              📤 Migrar remates
            </button>

            <button
              className="boton-secundario"
              onClick={() => {
                salirAdmin();
                window.location.reload();
              }}
            >
              Salir admin
            </button>
          </div>
        )}

        <div className="form-oferta">
          <label className="campo-form">
            <span>Filtrar por barrio</span>

            <select
              value={barrioSeleccionado}
              onChange={(event) =>
                setBarrioSeleccionado(event.target.value)
              }
            >
              <option value="TODOS">Todos los barrios</option>

              {barrios.map((barrio) => (
                <option key={barrio} value={barrio}>
                  {barrio}
                </option>
              ))}
            </select>
          </label>

          <label className="campo-form">
            <span>Ordenar</span>

            <select
              value={orden}
              onChange={(event) => setOrden(event.target.value)}
            >
              <option value="NUMERO">Número de remate</option>
              <option value="MAS_OFERTAS">
                🔥 Más ofertados
              </option>
            </select>
          </label>
        </div>

        {rematesVisibles.length === 0 ? (
          <p>No hay remates disponibles para este barrio.</p>
        ) : (
          rematesVisibles.map((remate) => (
            <div
              key={remate.id}
              id={`remate-${remate.numero}`}
            >
              <TarjetaRemate remate={remate} />
            </div>
          ))
        )}
      </section>
    </main>
  );
}

export default Remates;