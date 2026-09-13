import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Logo from "../components/Logo";
import NavegacionInferior from "../components/NavegacionInferior";

import "../App.css";

import {
  cerrarSesionUsuario,
  obtenerPerfilActual,
} from "../utils/usuario";

function IconoCaja() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function IconoPropuesta() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 5h14v10H9l-4 4V5Z" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
    </svg>
  );
}

function IconoCompra() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 5h2l2 10h9l2-7H7" />
      <circle cx="10" cy="19" r="1.3" />
      <circle cx="17" cy="19" r="1.3" />
    </svg>
  );
}

function IconoUsuario() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19c.8-3.7 3.1-5.6 6.5-5.6s5.7 1.9 6.5 5.6" />
    </svg>
  );
}

function IconoCandado() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    </svg>
  );
}

function IconoSalir() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 5H5v14h5" />
      <path d="M13 8l4 4-4 4" />
      <path d="M17 12H9" />
    </svg>
  );
}

function MiCuenta() {
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const datos = await obtenerPerfilActual();

      setPerfil(datos);
      setCargando(false);
    }

    cargar();
  }, []);

  async function salir() {
    await cerrarSesionUsuario();
    navigate("/");
  }

  const fondo = "#FDFAF7";

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: fondo,
          color: "#0d5551",
          fontSize: "16px",
        }}
      >
        Cargando tu cuenta...
      </main>
    );
  }

  if (!perfil) {
    return (
      <>
        <main className="sv-pantalla-fondo">
          <section
            className="sv-pantalla-app"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              textAlign: "center",
              paddingTop: "30px",
            }}
          >
            <Logo variant="compact" />

            <h1
              style={{
                margin: "0 0 12px",
                fontSize: "38px",
                lineHeight: 1.08,
                color: "#123f3b",
              }}
            >
              Mi cuenta
            </h1>

            <p
              style={{
                margin: "0 0 22px",
                fontSize: "16px",
                lineHeight: 1.45,
                color: "#6d6258",
              }}
            >
              Iniciá sesión o creá tu cuenta para empezar.
            </p>

            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              <Link
                to="/ingresar"
                style={{
                  minHeight: "54px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 28px",
                  borderRadius: "16px",
                  background: "#075e59",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Ingresar
              </Link>

              <Link
                to="/registro"
                style={{
                  minHeight: "54px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 28px",
                  borderRadius: "16px",
                  background: "transparent",
                  border: "1px solid #075e59",
                  color: "#075e59",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Crear cuenta
              </Link>
            </div>
          </section>
        </main>

        <NavegacionInferior />
      </>
    );
  }

  const iniciales =
    `${perfil.nombre?.[0] || ""}${perfil.apellido?.[0] || ""}`
      .toUpperCase() || "SV";

  const nombreCompleto =
    `${perfil.nombre || ""} ${perfil.apellido || ""}`.trim() ||
    "Mi cuenta";

  const opciones = [
    {
      texto: "Mis publicaciones",
      icono: <IconoCaja />,
      ruta: "/mis-publicaciones",
    },
    {
      texto: "Mis propuestas",
      icono: <IconoPropuesta />,
      ruta: "/mis-propuestas",
    },
    {
      texto: "Mis compras",
      icono: <IconoCompra />,
      ruta: null,
    },
    {
      texto: "Datos personales",
      icono: <IconoUsuario />,
      ruta: null,
    },
    {
      texto: "Seguridad",
      icono: <IconoCandado />,
      ruta: null,
    },
  ];

  function abrirOpcion(opcion) {
    if (opcion.ruta) {
      navigate(opcion.ruta);
      return;
    }

    alert(`${opcion.texto} se habilitará en el próximo bloque.`);
  }

  return (
    <>
      <style>{`
        .sv-mi-cuenta-logueada {
          position: relative;
          text-align: center;
        }

        .sv-mi-cuenta-logo-fijo {
          position: sticky;
          top: 0;
          z-index: 200;
          background: rgba(253, 250, 247, 0.98);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 8px 0 4px;
          margin: 0 0 4px;
        }

        .sv-mi-cuenta-logo-fijo .logo-link {
          margin-bottom: 0;
        }

        .sv-mi-cuenta-logo-fijo .logo {
          max-width: 185px;
        }
      `}</style>

      <main className="sv-pantalla-fondo">
        <section className="sv-pantalla-app sv-mi-cuenta-logueada">
          <div className="sv-mi-cuenta-logo-fijo">
            <Logo variant="compact" />
          </div>

          <header
            style={{
              textAlign: "center",
              marginBottom: "24px",
            }}
          >
            <h1
              style={{
                margin: 0,
                color: "#0d5551",
                fontSize: "38px",
                lineHeight: 1.08,
                fontWeight: 750,
                letterSpacing: "-0.8px",
              }}
            >
              Mi cuenta
            </h1>
          </header>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5dac6",
              borderRadius: "22px",
              padding: "22px 18px",
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(23,79,74,0.06)",
            }}
          >
            <div
              style={{
                width: "82px",
                height: "82px",
                borderRadius: "50%",
                margin: "0 auto 13px",
                display: "grid",
                placeItems: "center",
                background: "#0d605b",
                color: "#ffffff",
                fontSize: "25px",
                fontWeight: 750,
                letterSpacing: "1px",
                boxShadow: "0 7px 18px rgba(13,96,91,0.16)",
              }}
            >
              {iniciales}
            </div>

            <h2
              style={{
                margin: "0 0 4px",
                fontSize: "22px",
                color: "#123f3b",
              }}
            >
              {nombreCompleto}
            </h2>

            <p
              style={{
                margin: 0,
                color: "#6d7475",
                fontSize: "14px",
              }}
            >
              {perfil.email}
            </p>

            <button
              type="button"
              style={{
                marginTop: "13px",
                border: "1px solid #d6ded9",
                background: "#f6faf8",
                color: "#0d605b",
                borderRadius: "999px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 650,
                cursor: "pointer",
              }}
              onClick={() =>
                alert(
                  "La foto o avatar de perfil se habilitará en el bloque de datos personales."
                )
              }
            >
              + Foto o avatar
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            {opciones.map((opcion) => (
              <button
                key={opcion.texto}
                type="button"
                onClick={() =>
                  abrirOpcion(opcion)
                }
                style={{
                  width: "100%",
                  minHeight: "58px",
                  border: "1px solid #ded4c7",
                  borderRadius: "16px",
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "0 17px",
                  color: "#263536",
                  fontSize: "16px",
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    color: "#0d605b",
                    display: "grid",
                    placeItems: "center",
                    width: "28px",
                    flexShrink: 0,
                  }}
                >
                  {opcion.icono}
                </span>

                <span
                  style={{
                    flex: 1,
                  }}
                >
                  {opcion.texto}
                </span>

                <span
                  aria-hidden="true"
                  style={{
                    color: "#9aa3a1",
                    fontSize: "22px",
                  }}
                >
                  ›
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={salir}
            style={{
              width: "100%",
              minHeight: "56px",
              marginTop: "22px",
              border: "1px solid #d9cec0",
              borderRadius: "16px",
              background: "transparent",
              color: "#7b5045",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
              fontSize: "15px",
              fontWeight: 650,
              cursor: "pointer",
            }}
          >
            <IconoSalir />
            Cerrar sesión
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              margin: "28px 0 20px",
            }}
          >
            <div
              style={{
                height: "1px",
                background: "#d8cdbc",
                flex: 1,
              }}
            />

            <div
              style={{
                fontSize: "15px",
                letterSpacing: "5px",
              }}
            >
              <span
                style={{
                  color: "#0d7770",
                }}
              >
                ●
              </span>

              <span
                style={{
                  color: "#ef9f00",
                }}
              >
                ◆
              </span>

              <span
                style={{
                  color: "#f2613c",
                }}
              >
                ●
              </span>
            </div>

            <div
              style={{
                height: "1px",
                background: "#d8cdbc",
                flex: 1,
              }}
            />
          </div>

          <div
            style={{
              textAlign: "center",
            }}
          >
            <Link
              to="/"
              style={{
                color: "#667174",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              ← Volver al inicio
            </Link>
          </div>
        </section>
      </main>

      <NavegacionInferior />
    </>
  );
}

export default MiCuenta;