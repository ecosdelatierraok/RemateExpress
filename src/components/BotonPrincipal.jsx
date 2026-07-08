import { Link } from "react-router-dom";

function BotonPrincipal() {
  return (
    <Link to="/remates" className="boton-principal">
      Ver remates activos
    </Link>
  );
}

export default BotonPrincipal;