
import { useEffect, useState } from "react";
import Logo from "../components/Logo";
import { Link } from "react-router-dom";
import {
  obtenerRemates,
  migrarRematesLocalesASupabase,
} from "../utils/rematesStorage";
import { esAdmin, salirAdmin } from "../utils/admin";
import TarjetaRemate from "../components/TarjetaRemate";
import "../App.css";

function Remates() {
  const [remates, setRemates] = useState([]);

useEffect(() => {
  async function cargarRemates() {
    const datos = await obtenerRemates();
    setRemates(datos);

    setTimeout(() => {
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
}, []);

  const admin = esAdmin();

  return (
    <main className="app">
      <section className="hero">

        <Logo />

        <h1>Remates activos</h1>

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

        {remates.map((remate) => (
          <TarjetaRemate key={remate.id} remate={remate} />
        ))}
      </section>
    </main>
  );
}

export default Remates;