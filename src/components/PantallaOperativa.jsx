import { useNavigate } from "react-router-dom";

import Logo from "./Logo";
import NavegacionInferior from "./NavegacionInferior";

function IconoFlecha() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M19 12H5M11 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoAyuda() {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.75"
      />

      <path
        d="M9.8 9a2.3 2.3 0 1 1 3.8 1.8c-.9.7-1.6 1.1-1.6 2.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      <circle
        cx="12"
        cy="17"
        r="1"
        fill="currentColor"
      />
    </svg>
  );
}

function PantallaOperativa({
  children,
  titulo,
  subtitulo,
  mostrarVolver = true,
  mostrarAyuda = false,
  mostrarNavegacion = true,
  onVolver,
  onAyuda,
  className = "",
}) {
  const navigate =
    useNavigate();

  function volver() {
    if (onVolver) {
      onVolver();
      return;
    }

    navigate(-1);
  }

  function ayuda() {
    if (onAyuda) {
      onAyuda();
    }
  }

  return (
    <>
      <style>{`
        :root {
          --sv-petroleo: #075753;
          --sv-mostaza: #efa900;
          --sv-coral: #f15a24;
          --sv-crema: #fdfaf7;
          --sv-fondo: #f8f5f1;
          --sv-borde: #eadccc;
          --sv-texto: #263536;
        }

        body {
          margin: 0;
          background: var(--sv-fondo);
        }

        .sv-operativa-fondo {
          min-height: 100vh;
          box-sizing: border-box;
          padding: 12px 12px 112px;
          background: var(--sv-fondo);
        }

        .sv-operativa-app {
          position: relative;
          width: min(100%, 430px);
          min-height: calc(100vh - 24px);
          margin: 0 auto;
          box-sizing: border-box;
          padding: 0 18px 108px;
          background: var(--sv-crema);
          border: 1px solid var(--sv-borde);
          border-radius: 22px;
          color: var(--sv-texto);
          box-shadow:
            0 16px 42px
            rgba(
              52,
              42,
              31,
              0.06
            );
        }

        .sv-operativa-header {
          position: sticky;
          top: 0;
          z-index: 200;

          margin: 0 -18px 14px;
          padding: 0 18px 7px;

          box-sizing: border-box;

          background:
            rgba(
              253,
              250,
              247,
              0.98
            );

          backdrop-filter:
            blur(14px);

          -webkit-backdrop-filter:
            blur(14px);

          border-radius:
            21px 21px 0 0;

          text-align: center;
        }

        .sv-operativa-logo-fila {
          position: relative;

          height: 78px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sv-operativa-logo {
          width: 176px;
          height: 78px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin: 0 auto;

          overflow: hidden;
        }

        .sv-operativa-volver,
        .sv-operativa-ayuda {
          position: absolute;

          top: 18px;

          width: 40px;
          height: 40px;

          display: grid;
          place-items: center;

          padding: 0;

          border:
            1px solid
            var(--sv-borde);

          border-radius: 50%;

          background:
            rgba(
              255,
              255,
              255,
              0.96
            );

          color:
            var(--sv-petroleo);

          cursor: pointer;
        }

        .sv-operativa-volver {
          left: 0;
        }

        .sv-operativa-ayuda {
          right: 0;
        }

        .sv-operativa-titulo {
          max-width: 360px;

          margin:
            -2px auto 2px;

          color:
            var(--sv-petroleo);

          text-align: center;

          font-size: 28px;

          line-height: 1.05;

          letter-spacing:
            -0.8px;

          font-weight: 850;
        }

        .sv-operativa-subtitulo {
          max-width: 340px;

          margin:
            9px auto 17px;

          color: #53514e;

          text-align: center;

          font-size: 14.5px;

          line-height: 1.4;
        }

        .sv-operativa-contenido {
          width: 100%;
        }

        @media (
          max-width: 380px
        ) {
          .sv-operativa-app {
            padding-left: 15px;
            padding-right: 15px;
          }

          .sv-operativa-header {
            margin-left: -15px;
            margin-right: -15px;

            padding-left: 15px;
            padding-right: 15px;
          }

          .sv-operativa-logo {
            width: 168px;
          }

          .sv-operativa-titulo {
            font-size: 27px;
          }
        }

        @media (
          min-width: 700px
        ) {
          .sv-operativa-fondo {
            padding:
              22px 12px 104px;
          }

          .sv-operativa-logo {
            width: 190px;
            height: 88px;
          }

          .sv-operativa-logo-fila {
            height: 88px;
          }

          .sv-operativa-titulo {
            font-size: 30px;
          }
        }
      `}</style>

      <main className="sv-operativa-fondo">
        <section
          className={`sv-operativa-app ${className}`}
        >
          <header className="sv-operativa-header">
            <div className="sv-operativa-logo-fila">
              {mostrarVolver && (
                <button
                  type="button"
                  className="sv-operativa-volver"
                  aria-label="Volver"
                  onClick={volver}
                >
                  <IconoFlecha />
                </button>
              )}

              <div className="sv-operativa-logo">
                <Logo variant="compact" />
              </div>

              {mostrarAyuda && (
                <button
                  type="button"
                  className="sv-operativa-ayuda"
                  aria-label="Ayuda"
                  onClick={ayuda}
                >
                  <IconoAyuda />
                </button>
              )}
            </div>

            {titulo && (
              <h1 className="sv-operativa-titulo">
                {titulo}
              </h1>
            )}
          </header>

          {subtitulo && (
            <div className="sv-operativa-subtitulo">
              {subtitulo}
            </div>
          )}

          <div className="sv-operativa-contenido">
            {children}
          </div>

          {mostrarNavegacion && (
            <NavegacionInferior />
          )}
        </section>
      </main>
    </>
  );
}

export default PantallaOperativa;