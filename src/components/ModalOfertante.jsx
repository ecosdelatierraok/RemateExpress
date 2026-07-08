import { useState } from "react";
import { guardarOfertante } from "../utils/ofertante";

function ModalOfertante({ onGuardar }) {

  const [nombre,setNombre]=useState("");
  const [telefono,setTelefono]=useState("");

  function guardar(e){

    e.preventDefault();

    guardarOfertante({
      nombre,
      telefono
    });

    onGuardar();

  }

  return(

<div className="modal">

<form className="form-oferta" onSubmit={guardar}>

<h2>Antes de ofertar...</h2>

<input
placeholder="Nombre"
value={nombre}
onChange={(e)=>setNombre(e.target.value)}
/>

<input
placeholder="WhatsApp"
value={telefono}
onChange={(e)=>setTelefono(e.target.value)}
/>

<button className="boton-principal">

Continuar

</button>

</form>

</div>

);

}

export default ModalOfertante;