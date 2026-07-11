import { useState } from "react";
import { guardarOfertante } from "../utils/ofertante";

function ModalOfertante({ onGuardar }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  function guardar(e) {
    e.preventDefault();

    guardarOfertante({
      nombre,
      telefono,
    });

    onGuardar();
  }

  return (
    <div className="modal">
      <form className="form-oferta" onSubmit={guardar}>
        <h2>Antes de ofertar...</h2>

        <p
          style={{
            fontSize: "0.95rem",
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          Tus datos solo se utilizan para identificar tu oferta.
          <br />
          <strong>Completar este paso no te obliga a ofertar.</strong>
        </p>

        <input
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <input
          placeholder="WhatsApp"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          required
        />

        <button className="boton-principal">
          Continuar
        </button>
      </form>
    </div>
  );
}

export default ModalOfertante;