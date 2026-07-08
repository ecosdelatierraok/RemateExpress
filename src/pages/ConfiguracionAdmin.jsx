import Logo from "../components/Logo";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cambiarClaveAdmin, esAdmin } from "../utils/admin";
import "../App.css";

function ConfiguracionAdmin() {
  const [nuevaClave, setNuevaClave] = useState("");
  const [repetirClave, setRepetirClave] = useState("");

  if (!esAdmin()) {
    return (
      <main className="app">
        <section className="hero">

            <Logo />
          
          <h1>Acceso restringido</h1>
          <p>Esta sección es solo para Curadora.</p>
        </section>
      </main>
    );
  }

  function guardar(e) {
    e.preventDefault();

    if (!nuevaClave || nuevaClave.length < 4) {
      alert("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    if (nuevaClave !== repetirClave) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    cambiarClaveAdmin(nuevaClave);
    alert("Contraseña actualizada.");
    setNuevaClave("");
    setRepetirClave("");
  }

  return (
    <main className="app">
      <section className="hero">
        <h1>Configuración</h1>

        <form className="form-oferta" onSubmit={guardar}>
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={nuevaClave}
            onChange={(e) => setNuevaClave(e.target.value)}
          />

          <input
            type="password"
            placeholder="Repetir contraseña"
            value={repetirClave}
            onChange={(e) => setRepetirClave(e.target.value)}
          />

          <button className="boton-principal" type="submit">
            Guardar contraseña
          </button>
        </form>

        <Link to="/remates" className="boton-secundario">
          ← Volver
        </Link>
      </section>
    </main>
  );
}

export default ConfiguracionAdmin;