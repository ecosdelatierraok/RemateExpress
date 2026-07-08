import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ingresarComoAdmin } from "../utils/admin";

function Logo() {
  const navigate = useNavigate();
  const clickTimer = useRef(null);

  function manejarClick() {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      ingresarComoAdmin();
      return;
    }

    clickTimer.current = setTimeout(() => {
      navigate("/");
      clickTimer.current = null;
    }, 250);
  }

  return (
    <button className="logo-link" onClick={manejarClick} type="button">
      <img
        src="/logo-remate-express.jpg"
        alt="Remate Express"
        className="logo"
      />
    </button>
  );
}

export default Logo;