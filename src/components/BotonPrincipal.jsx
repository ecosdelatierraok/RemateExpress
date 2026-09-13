import { Link } from "react-router-dom";

function BotonPrincipal() {
  return (
    <Link
      to="/publicaciones"
      className="boton-principal"
    >
      Ver oportunidades activas
    </Link>
  );
}

export default BotonPrincipal;