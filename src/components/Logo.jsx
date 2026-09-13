import { useNavigate } from "react-router-dom";

const ANCHO_LOGO = {
  compact: "220px",
  full: "390px",
};

function Logo({
  variant = "full",
  maxWidth,
}) {
  const navigate = useNavigate();

  function irAlInicio() {
    navigate("/");
  }

  const esCompacto =
    variant === "compact";

  const src = esCompacto
    ? "/logo-segunda-vuelta-compacto.png"
    : "/logo-segunda-vuelta.png";

  const anchoMaximo =
    maxWidth ||
    (esCompacto
      ? ANCHO_LOGO.compact
      : ANCHO_LOGO.full);

  return (
    <button
      type="button"
      onClick={irAlInicio}
      aria-label="Ir al inicio de Segunda Vuelta"
      style={{
        display: "block",
        width: "100%",
        maxWidth: anchoMaximo,
        margin: "0 auto",
        padding: 0,
        border: "none",
        outline: "none",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      <img
        src={src}
        alt="Segunda Vuelta"
        draggable="false"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          margin: 0,
          padding: 0,
          border: "none",
          objectFit: "contain",
          userSelect: "none",
        }}
      />
    </button>
  );
}

export default Logo;