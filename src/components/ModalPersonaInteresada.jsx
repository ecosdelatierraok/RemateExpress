import { useState } from "react";
import {
  guardarPersonaInteresada,
} from "../utils/personaInteresada";

function ModalPersonaInteresada({ onGuardar }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  function guardar(event) {
    event.preventDefault();

    guardarPersonaInteresada({
      nombre,
      telefono,
    });

    onGuardar();
  }

  return (
    <div className="modal">
      <form
        className="formulario-panel"
        onSubmit={guardar}
      >
        <h2>Antes de enviar una propuesta...</h2>

        <p
          style={{
            fontSize: "0.95rem",
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          Tus datos se utilizan para identificarte
          y poder contactarte si tu propuesta es aceptada.
          <br />
          <strong>
            Completar este paso no te obliga a realizar
            ninguna operación.
          </strong>
        </p>

        <input
          placeholder="Nombre"
          value={nombre}
          onChange={(event) =>
            setNombre(event.target.value)
          }
          required
        />

        <input
          placeholder="WhatsApp"
          value={telefono}
          onChange={(event) =>
            setTelefono(event.target.value)
          }
          required
        />

        <button
          className="boton-principal"
          type="submit"
        >
          Continuar
        </button>
      </form>
    </div>
  );
}

export default ModalPersonaInteresada;