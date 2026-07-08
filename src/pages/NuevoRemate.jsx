import Logo from "../components/Logo";
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  guardarRemate,
  obtenerRemates,
  editarRemate,
} from "../utils/rematesStorage";
import { esAdmin } from "../utils/admin";
import "../App.css";

function limpiar(linea) {
  return linea.replace(/[🏷️📍🪑✨💰⬆️⏰❤️💚👇•]/g, "").trim();
}

function extraerMonto(texto) {
  const match = texto.match(/\$?\s*([\d.,]+)/);
  if (!match) return "";
  return Number(match[1].replace(/\./g, "").replace(",", "."));
}

function extraerNumero(texto) {
  const match = texto.match(/REMATE\s*#?\s*(\d+)/i);
  return match ? Number(match[1]) : "";
}

function Campo({ label, children }) {
  return (
    <label className="campo-form">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NuevoRemate() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [textoWhatsApp, setTextoWhatsApp] = useState("");
  const [numero, setNumero] = useState("");
  const [titulo, setTitulo] = useState("");
  const [barrio, setBarrio] = useState("");
  const [base, setBase] = useState("");
  const [incremento, setIncremento] = useState(1000);
  const [descripcion, setDescripcion] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");
  const [horaCierre, setHoraCierre] = useState("18:00");
  const [frase, setFrase] = useState("");
  const [imagen, setImagen] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function iniciar() {
      const remates = await obtenerRemates();

      if (id) {
        const encontrado = remates.find(
          (r) => r.id === Number(id) || r.numero === Number(id)
        );

        if (encontrado) {
          setNumero(encontrado.numero || "");
          setTitulo(encontrado.titulo || "");
          setBarrio(encontrado.barrio || "");
          setBase(encontrado.base || "");
          setIncremento(encontrado.incrementoMinimo || 1000);
          setDescripcion(encontrado.descripcion || "");
          setFrase(encontrado.frase || "");
          setImagen(encontrado.imagen || "");
          setFechaCierre(encontrado.fechaCierre || "");
          setHoraCierre(encontrado.horaCierre || "18:00");
        }
      } else {
        const numeros = remates
          .map((r) => Number(r.numero))
          .filter((n) => !Number.isNaN(n));

        const proximoNumero =
          numeros.length > 0 ? Math.max(...numeros) + 1 : 1;

        setNumero(proximoNumero);
      }

      setCargando(false);
    }

    iniciar();
  }, [id]);

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

  if (cargando) {
    return (
      <main className="app">
        <section className="hero">
          <Logo />
          <h1>Cargando...</h1>
        </section>
      </main>
    );
  }

  function absorberDatos() {
    const lineas = textoWhatsApp
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const numeroDetectado = extraerNumero(textoWhatsApp);
    if (numeroDetectado) setNumero(numeroDetectado);

    const lineaUbicacion = lineas.find((l) =>
      /Ubicación de retiro/i.test(l)
    );

    if (lineaUbicacion) {
      setBarrio(
        limpiar(lineaUbicacion.replace(/Ubicación de retiro:?/i, ""))
      );
    }

    const indiceUbicacion = lineas.findIndex((l) =>
      /Ubicación de retiro/i.test(l)
    );

    const posibleTitulo =
      indiceUbicacion !== -1 ? lineas[indiceUbicacion + 1] : null;

    if (posibleTitulo) setTitulo(limpiar(posibleTitulo));

    const lineaBase = lineas.find((l) => /Base de remate/i.test(l));
    if (lineaBase) setBase(extraerMonto(lineaBase));

    const lineaIncremento = lineas.find((l) =>
      /Incremento mínimo/i.test(l)
    );
    if (lineaIncremento) {
      setIncremento(extraerMonto(lineaIncremento) || 1000);
    }

    const lineaCierre = lineas.find((l) => /Cierre/i.test(l));
    if (lineaCierre) {
      const fecha = lineaCierre.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const hora = lineaCierre.match(/(\d{1,2}):(\d{2})/);

      if (fecha) {
        setFechaCierre(
          `${fecha[3]}-${fecha[2].padStart(2, "0")}-${fecha[1].padStart(
            2,
            "0"
          )}`
        );
      }

      if (hora) {
        setHoraCierre(`${hora[1].padStart(2, "0")}:${hora[2]}`);
      }
    }

    const inicioCaracteristicas = lineas.findIndex((l) =>
      /Características/i.test(l)
    );
    const finCaracteristicas = lineas.findIndex((l) =>
      /Base de remate/i.test(l)
    );

    if (inicioCaracteristicas !== -1 && finCaracteristicas !== -1) {
      setDescripcion(
        lineas
          .slice(inicioCaracteristicas + 1, finCaracteristicas)
          .map((l) => limpiar(l))
          .filter(Boolean)
          .join("\n")
      );
    }

    const inicioFrase = lineas.findIndex((l) => /Antes de irte/i.test(l));
    const finFrase = lineas.findIndex((l) =>
      /Las ofertas se colocan/i.test(l)
    );

    if (inicioFrase !== -1) {
      setFrase(
        lineas
          .slice(inicioFrase, finFrase !== -1 ? finFrase : undefined)
          .join("\n")
      );
    }
  }

  function cargarImagen(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const img = new Image();
    const lector = new FileReader();

    lector.onload = (evento) => {
      img.src = evento.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxAncho = 800;

      let ancho = img.width;
      let alto = img.height;

      if (ancho > maxAncho) {
        alto = (alto * maxAncho) / ancho;
        ancho = maxAncho;
      }

      canvas.width = ancho;
      canvas.height = alto;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, ancho, alto);

      setImagen(canvas.toDataURL("image/jpeg", 0.6));
    };

    lector.readAsDataURL(archivo);
  }

  async function publicar(e) {
    e.preventDefault();

    if (!titulo || !base || !imagen) {
      alert("Falta título, base o imagen.");
      return;
    }

    const datosRemate = {
      numero: Number(numero),
      titulo,
      barrio,
      base: Number(base),
      incrementoMinimo: Number(incremento),
      descripcion,
      fechaCierre,
      horaCierre,
      estado: "Activo",
      frase,
      imagen,
    };

    try {
      if (id) {
        await editarRemate(id, datosRemate);
      } else {
        await guardarRemate(datosRemate);
      }

      navigate("/remates");
    } catch (error) {
      console.error("Error al guardar remate:", error);
      alert("No se pudo guardar el remate.");
    }
  }

  return (
    <main className="app">
      <section className="hero">
        <Logo />

        <h1>{id ? "Editar remate" : "Nuevo remate"}</h1>

        {!id && (
          <div className="form-oferta">
            <h2>Pegar publicación WhatsApp</h2>

            <textarea
              placeholder="Pegá acá la publicación generada en ChatGPT..."
              value={textoWhatsApp}
              onChange={(e) => setTextoWhatsApp(e.target.value)}
            />

            <button
              className="boton-secundario"
              type="button"
              onClick={absorberDatos}
            >
              Absorber datos
            </button>
          </div>
        )}

        <form className="form-oferta" onSubmit={publicar}>
          <Campo label="Número de remate">
            <input
              type="number"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </Campo>

          <Campo label="Título del objeto">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </Campo>

          <Campo label="Barrio / ubicación de retiro">
            <input
              value={barrio}
              onChange={(e) => setBarrio(e.target.value)}
            />
          </Campo>

          <Campo label="Base de remate">
            <input
              type="number"
              min="1000"
              step="1000"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            />
          </Campo>

          <Campo label="Incremento mínimo">
            <input
              type="number"
              min="1000"
              step="1000"
              value={incremento}
              onChange={(e) => setIncremento(e.target.value)}
            />
          </Campo>

          <Campo label="Descripción / características">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Campo>

          <Campo label="Frase de cierre">
            <textarea
              value={frase}
              onChange={(e) => setFrase(e.target.value)}
            />
          </Campo>

          <Campo label="Fecha de cierre">
            <input
              type="date"
              value={fechaCierre}
              onChange={(e) => setFechaCierre(e.target.value)}
            />
          </Campo>

          <Campo label="Hora de cierre">
            <input
              type="time"
              value={horaCierre}
              onChange={(e) => setHoraCierre(e.target.value)}
            />
          </Campo>

          <Campo label="Imagen">
            <input type="file" accept="image/*" onChange={cargarImagen} />
          </Campo>

          {imagen && (
            <img src={imagen} alt="Vista previa" className="preview-imagen" />
          )}

          <button className="boton-principal" type="submit">
            {id ? "Guardar cambios" : "Publicar remate"}
          </button>
        </form>

        <Link to="/remates" className="boton-secundario">
          ← Volver a remates
        </Link>
      </section>
    </main>
  );
}

export default NuevoRemate;