import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import BotonPrincipal from "../components/BotonPrincipal";
import { activarAdmin } from "../utils/admin";
import "../App.css";

function Home() {
  const navigate = useNavigate();

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [clave, setClave] = useState("");

  function ingresarAdmin() {
    if (activarAdmin(clave)) {
      setMostrarLogin(false);
      navigate("/remates");
    } else {
      alert("Contraseña incorrecta.");
    }
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

        <BotonPrincipal>
          Ver remates activos
        </BotonPrincipal>

        {mostrarLogin && (
          <div className="modal-admin">

            <h2>Administrador</h2>

            <input
              type="password"
              placeholder="Contraseña"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />

            <button
              className="boton-principal"
              onClick={ingresarAdmin}
            >
              Ingresar
            </button>

          </div>
        )}

      </section>
    </main>
  );
}

export default Home;