import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import PantallaOperativa from "../components/PantallaOperativa";

import {
  borrarBorradorPublicacion,
  guardarFotosBorrador,
  obtenerBorradorPublicacion,
} from "../utils/borradorPublicacion";

import {
  subirFotosPendientesPublicacion,
} from "../utils/subidaFotosPublicacion";


const MAX_FOTOS = 5;

const MAX_LADO = 1920;

const CALIDAD_WEBP = 0.86;

const CALIDAD_CAPTURA = 0.9;


/*
  ======================================================
  ICONOS
  ======================================================
*/

function IconoCamara() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="13"
        r="4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}


function IconoGaleria() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <circle
        cx="9"
        cy="9"
        r="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="m5 17 4.2-4.2 3 3L15 13l4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


/*
  ======================================================
  GUÍA VISUAL
  ======================================================
*/

function MiniObjeto({
  tipo,
}) {
  if (
    tipo === "frente"
  ) {
    return (
      <div className="sv-miniobjeto frente">
        <div className="sv-mini-puerta" />
        <div className="sv-mini-linea" />
      </div>
    );
  }

  if (
    tipo === "angulo"
  ) {
    return (
      <div className="sv-miniobjeto angulo">
        <div className="sv-mini-cara-a" />
        <div className="sv-mini-cara-b" />
      </div>
    );
  }

  if (
    tipo === "trasera"
  ) {
    return (
      <div className="sv-miniobjeto trasera">
        <div className="sv-mini-rejilla r1" />
        <div className="sv-mini-rejilla r2" />
        <div className="sv-mini-rejilla r3" />
        <div className="sv-mini-rejilla r4" />
      </div>
    );
  }

  if (
    tipo === "detalle"
  ) {
    return (
      <div className="sv-miniobjeto detalle">
        <span />
      </div>
    );
  }

  return (
    <div className="sv-miniobjeto etiqueta">
      <div className="sv-etiqueta-linea larga" />
      <div className="sv-etiqueta-linea" />
      <div className="sv-etiqueta-linea corta" />
      <div className="sv-etiqueta-codigo" />
    </div>
  );
}


const GUIA = [
  {
    numero: 1,
    tipo: "frente",
    titulo: "De frente",
    texto:
      "Sacá una foto clara del frente del objeto.",
  },

  {
    numero: 2,
    tipo: "angulo",
    titulo: "De otro ángulo",
    texto:
      "Mostralo desde otro costado.",
  },

  {
    numero: 3,
    tipo: "trasera",
    titulo:
      "Parte trasera o inferior",
    texto:
      "Si tiene algo importante atrás o abajo, mostralo.",
  },

  {
    numero: 4,
    tipo: "detalle",
    titulo:
      "Detalles, marcas o defectos",
    texto:
      "Mostrá rayones, golpes o detalles relevantes.",
  },

  {
    numero: 5,
    tipo: "etiqueta",
    titulo:
      "Etiqueta, modelo o características",
    texto:
      "Si tiene etiqueta, modelo o datos visibles, mostralos.",
  },
];


/*
  ======================================================
  ARCHIVOS / IMÁGENES
  ======================================================
*/

function cargarImagenDesdeArchivo(
  archivo
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const url =
        URL.createObjectURL(
          archivo
        );

      const imagen =
        new Image();

      imagen.onload =
        () => {
          URL.revokeObjectURL(
            url
          );

          resolve(
            imagen
          );
        };

      imagen.onerror =
        () => {
          URL.revokeObjectURL(
            url
          );

          reject(
            new Error(
              "No pudimos leer una de las fotos."
            )
          );
        };

      imagen.src =
        url;
    }
  );
}


function canvasAWebp(
  canvas,
  calidad =
    CALIDAD_WEBP
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      canvas.toBlob(
        (
          blob
        ) => {
          if (!blob) {
            reject(
              new Error(
                "No pudimos preparar una de las fotos."
              )
            );

            return;
          }

          resolve(
            blob
          );
        },

        "image/webp",

        calidad
      );
    }
  );
}


async function convertirAWebp(
  archivo,
  indice
) {
  if (
    !archivo
      ?.type
      ?.startsWith(
        "image/"
      )
  ) {
    throw new Error(
      "Uno de los archivos elegidos no es una imagen."
    );
  }

  const imagen =
    await cargarImagenDesdeArchivo(
      archivo
    );

  const anchoOriginal =
    imagen.naturalWidth ||
    imagen.width;

  const altoOriginal =
    imagen.naturalHeight ||
    imagen.height;

  if (
    !anchoOriginal ||
    !altoOriginal
  ) {
    throw new Error(
      "No pudimos leer el tamaño de una de las fotos."
    );
  }

  const escala =
    Math.min(
      1,

      MAX_LADO /
        Math.max(
          anchoOriginal,
          altoOriginal
        )
    );

  const ancho =
    Math.max(
      1,

      Math.round(
        anchoOriginal *
          escala
      )
    );

  const alto =
    Math.max(
      1,

      Math.round(
        altoOriginal *
          escala
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    ancho;

  canvas.height =
    alto;

  const contexto =
    canvas.getContext(
      "2d"
    );

  if (!contexto) {
    throw new Error(
      "No pudimos preparar la imagen."
    );
  }

  contexto.imageSmoothingEnabled =
    true;

  contexto.imageSmoothingQuality =
    "high";

  contexto.drawImage(
    imagen,
    0,
    0,
    ancho,
    alto
  );

  const blob =
    await canvasAWebp(
      canvas
    );

  const nombreBase =
    (
      archivo.name ||
      `foto-${indice + 1}`
    ).replace(
      /\.[^.]+$/,
      ""
    );

  return new File(
    [
      blob,
    ],

    `${nombreBase}.webp`,

    {
      type:
        "image/webp",

      lastModified:
        Date.now(),
    }
  );
}


/*
  ======================================================
  BORRADOR
  ======================================================
*/

function obtenerRutaContinuacion(
  borrador
) {
  const fotos =
    Array.isArray(
      borrador?.fotos
    )
      ? borrador.fotos
      : [];

  const tieneUbicacion =
    Boolean(
      borrador?.provincia &&
      borrador?.localidad
    );

  const tieneEntrega =
    Array.isArray(
      borrador
        ?.formasEntrega
    ) &&
    borrador
      .formasEntrega
      .length > 0;

  if (
    borrador?.titulo &&
    borrador?.descripcion &&
    borrador?.modalidad &&
    tieneUbicacion &&
    tieneEntrega
  ) {
    return (
      "/publicar/confirmar"
    );
  }

  if (
    borrador?.titulo &&
    borrador?.descripcion &&
    borrador?.modalidad
  ) {
    return (
      "/publicar/revision"
    );
  }

  if (
    borrador?.analisisIA &&
    !borrador?.modalidad
  ) {
    return (
      "/publicar/valor"
    );
  }

  if (
    borrador?.analisisIA
  ) {
    return (
      "/publicar/revision"
    );
  }

  if (
    fotos.length > 0
  ) {
    return (
      "/publicar/captura"
    );
  }

  return null;
}


/*
  ======================================================
  PANTALLA
  ======================================================
*/

function PublicarFotos() {
  const navigate =
    useNavigate();

  const videoRef =
    useRef(
      null
    );

  const streamRef =
    useRef(
      null
    );

  const inputCamaraRef =
    useRef(
      null
    );

  const inputGaleriaRef =
    useRef(
      null
    );

  const resguardandoRef =
    useRef(
      new Set()
    );

  const [
    cargandoBorrador,
    setCargandoBorrador,
  ] = useState(
    true
  );

  const [
    borradorPendiente,
    setBorradorPendiente,
  ] = useState(
    null
  );

  const [
    guardando,
    setGuardando,
  ] = useState(
    false
  );

  const [
    error,
    setError,
  ] = useState(
    ""
  );

  const [
    camaraAbierta,
    setCamaraAbierta,
  ] = useState(
    false
  );

  const [
    iniciandoCamara,
    setIniciandoCamara,
  ] = useState(
    false
  );

  const [
    capturando,
    setCapturando,
  ] = useState(
    false
  );

  const [
    fotosCamara,
    setFotosCamara,
  ] = useState(
    []
  );


  /*
    ------------------------------------------------------
    RESGUARDO TEMPRANO EN SERVIDOR

    No bloquea la navegación.

    La foto primero queda guardada en IndexedDB y,
    apenas existe el borrador local, iniciamos el
    resguardo en el bucket privado.

    Si la persona sigue navegando dentro de la PWA,
    la subida continúa.

    Si la app se interrumpe, al volver a esta pantalla
    el borrador pendiente vuelve a disparar el resguardo.
    ------------------------------------------------------
  */

  function iniciarResguardoServidor(
    borrador
  ) {
    if (
      !borrador?.borradorId ||
      !Array.isArray(
        borrador?.fotos
      ) ||
      borrador.fotos.length ===
        0
    ) {
      return;
    }

    const clave =
      borrador.borradorId;

    if (
      resguardandoRef.current.has(
        clave
      )
    ) {
      return;
    }

    resguardandoRef.current.add(
      clave
    );

    subirFotosPendientesPublicacion(
      borrador
    )
      .catch(
        (
          err
        ) => {
          console.error(
            "No se pudo completar el resguardo temprano de fotos:",
            err
          );
        }
      )
      .finally(
        () => {
          resguardandoRef.current.delete(
            clave
          );
        }
      );
  }


  async function guardarFotosYResguardar(
    fotos
  ) {
    await guardarFotosBorrador(
      fotos
    );

    const borradorActualizado =
      await obtenerBorradorPublicacion();

    iniciarResguardoServidor(
      borradorActualizado
    );

    return borradorActualizado;
  }


  /*
    ------------------------------------------------------
    PREVIEWS TEMPORALES DE LAS CAPTURAS
    ------------------------------------------------------
  */

  const previewsCamara =
    useMemo(
      () =>
        fotosCamara.map(
          (
            archivo
          ) => ({
            archivo,

            url:
              URL
                .createObjectURL(
                  archivo
                ),
          })
        ),

      [
        fotosCamara,
      ]
    );


  useEffect(
    () => {
      return () => {
        previewsCamara.forEach(
          (
            item
          ) => {
            URL.revokeObjectURL(
              item.url
            );
          }
        );
      };
    },

    [
      previewsCamara,
    ]
  );


  /*
    ------------------------------------------------------
    BORRADOR EXISTENTE
    ------------------------------------------------------
  */

  useEffect(
    () => {
      let activo =
        true;

      async function revisarBorrador() {
        try {
          const borrador =
            await obtenerBorradorPublicacion();

          if (!activo) {
            return;
          }

          if (
            Array.isArray(
              borrador?.fotos
            ) &&
            borrador.fotos.length >
              0
          ) {
            iniciarResguardoServidor(
              borrador
            );
          }

          const ruta =
            obtenerRutaContinuacion(
              borrador
            );

          if (ruta) {
            setBorradorPendiente({
              ...borrador,

              rutaContinuacion:
                ruta,
            });
          }
        } catch (err) {
          console.error(
            "Error revisando borrador pendiente:",
            err
          );
        } finally {
          if (activo) {
            setCargandoBorrador(
              false
            );
          }
        }
      }

      revisarBorrador();

      return () => {
        activo =
          false;
      };
    },

    []
  );


  /*
    ------------------------------------------------------
    APAGADO SEGURO DE CÁMARA
    ------------------------------------------------------
  */

  function detenerCamara() {
    const stream =
      streamRef.current;

    if (stream) {
      stream
        .getTracks()
        .forEach(
          (
            track
          ) => {
            try {
              track.stop();
            } catch {
              // No bloquea.
            }
          }
        );
    }

    streamRef.current =
      null;

    if (
      videoRef.current
    ) {
      videoRef.current.srcObject =
        null;
    }
  }


  useEffect(
    () => {
      return () => {
        detenerCamara();
      };
    },

    []
  );


  /*
    ------------------------------------------------------
    CONTINUAR / NUEVA
    ------------------------------------------------------
  */

  function continuarPublicacion() {
    if (
      !borradorPendiente
        ?.rutaContinuacion
    ) {
      return;
    }

    iniciarResguardoServidor(
      borradorPendiente
    );

    navigate(
      borradorPendiente
        .rutaContinuacion
    );
  }


  async function empezarNueva() {
    try {
      setGuardando(
        true
      );

      setError(
        ""
      );

      detenerCamara();

      setCamaraAbierta(
        false
      );

      setFotosCamara(
        []
      );

      await borrarBorradorPublicacion();

      setBorradorPendiente(
        null
      );
    } catch (err) {
      console.error(
        "Error al borrar borrador:",
        err
      );

      setError(
        "No pudimos empezar una publicación nueva."
      );
    } finally {
      setGuardando(
        false
      );
    }
  }


  /*
    ======================================================
    CÁMARA CONTINUA
    ======================================================
  */

  async function iniciarCamara() {
    if (
      guardando ||
      borradorPendiente ||
      iniciandoCamara
    ) {
      return;
    }

    setError(
      ""
    );

    setIniciandoCamara(
      true
    );

    setFotosCamara(
      []
    );

    try {
      if (
        !navigator
          ?.mediaDevices
          ?.getUserMedia
      ) {
        throw new Error(
          "CAMARA_INTERNA_NO_DISPONIBLE"
        );
      }

      detenerCamara();

      const stream =
        await navigator
          .mediaDevices
          .getUserMedia({
            audio:
              false,

            video: {
              facingMode: {
                ideal:
                  "environment",
              },

              width: {
                ideal:
                  1920,
              },

              height: {
                ideal:
                  1920,
              },

              aspectRatio: {
                ideal:
                  1,
              },
            },
          });

      streamRef.current =
        stream;

      setCamaraAbierta(
        true
      );

      await new Promise(
        (
          resolve
        ) => {
          requestAnimationFrame(
            resolve
          );
        }
      );

      const video =
        videoRef.current;

      if (!video) {
        throw new Error(
          "No pudimos iniciar la cámara."
        );
      }

      video.srcObject =
        stream;

      await video.play();
    } catch (err) {
      console.error(
        "No se pudo abrir cámara interna:",
        err
      );

      detenerCamara();

      setCamaraAbierta(
        false
      );

      /*
        Fallback:
        si el navegador / dispositivo no permite
        getUserMedia, usamos la cámara nativa.
      */

      inputCamaraRef
        .current
        ?.click();
    } finally {
      setIniciandoCamara(
        false
      );
    }
  }


  function cerrarCamara() {
    if (
      capturando ||
      guardando
    ) {
      return;
    }

    detenerCamara();

    setCamaraAbierta(
      false
    );

    setFotosCamara(
      []
    );
  }


  async function capturarFoto() {
    if (
      capturando ||
      guardando ||
      fotosCamara.length >=
        MAX_FOTOS
    ) {
      return;
    }

    const video =
      videoRef.current;

    if (
      !video ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setError(
        "La cámara todavía se está preparando."
      );

      return;
    }

    setCapturando(
      true
    );

    setError(
      ""
    );

    try {
      const anchoVideo =
        video.videoWidth;

      const altoVideo =
        video.videoHeight;

      /*
        Recortamos el CENTRO en formato 1:1.
        Esto coincide con el cuadrado que la
        persona está viendo en pantalla.
      */

      const ladoFuente =
        Math.min(
          anchoVideo,
          altoVideo
        );

      const origenX =
        (
          anchoVideo -
          ladoFuente
        ) / 2;

      const origenY =
        (
          altoVideo -
          ladoFuente
        ) / 2;

      const ladoSalida =
        Math.max(
          1,

          Math.min(
            MAX_LADO,
            ladoFuente
          )
        );

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        ladoSalida;

      canvas.height =
        ladoSalida;

      const contexto =
        canvas.getContext(
          "2d"
        );

      if (!contexto) {
        throw new Error(
          "No pudimos preparar la fotografía."
        );
      }

      contexto.imageSmoothingEnabled =
        true;

      contexto.imageSmoothingQuality =
        "high";

      contexto.drawImage(
        video,

        origenX,
        origenY,
        ladoFuente,
        ladoFuente,

        0,
        0,
        ladoSalida,
        ladoSalida
      );

      const blob =
        await canvasAWebp(
          canvas,
          CALIDAD_CAPTURA
        );

      const numeroFoto =
        fotosCamara.length +
        1;

      const archivo =
        new File(
          [
            blob,
          ],

          `foto-${Date.now()}-${numeroFoto}.webp`,

          {
            type:
              "image/webp",

            lastModified:
              Date.now(),
          }
        );

      const siguientes = [
        ...fotosCamara,
        archivo,
      ].slice(
        0,
        MAX_FOTOS
      );

      setFotosCamara(
        siguientes
      );

      /*
        Llegó a cinco:
        no obligamos a tocar otro botón.
        Guardamos las cinco juntas.
      */

      if (
        siguientes.length ===
        MAX_FOTOS
      ) {
        await finalizarFotosCamara(
          siguientes
        );
      }
    } catch (err) {
      console.error(
        "Error capturando foto:",
        err
      );

      setError(
        err?.message ||
        "No pudimos sacar la foto. Probá de nuevo."
      );
    } finally {
      setCapturando(
        false
      );
    }
  }


  function descartarUltimaFoto() {
    if (
      capturando ||
      guardando ||
      fotosCamara.length ===
        0
    ) {
      return;
    }

    setFotosCamara(
      (
        actuales
      ) =>
        actuales.slice(
          0,
          -1
        )
    );
  }


  async function finalizarFotosCamara(
    fotos =
      fotosCamara
  ) {
    if (
      guardando ||
      !Array.isArray(
        fotos
      ) ||
      fotos.length === 0
    ) {
      return;
    }

    try {
      setGuardando(
        true
      );

      setError(
        ""
      );

      await guardarFotosYResguardar(
        fotos
      );

      detenerCamara();

      setCamaraAbierta(
        false
      );

      setFotosCamara(
        []
      );

      navigate(
        "/publicar/captura"
      );
    } catch (err) {
      console.error(
        "Error guardando capturas:",
        err
      );

      setError(
        err?.message ||
        "No pudimos guardar las fotos. Probá de nuevo."
      );
    } finally {
      setGuardando(
        false
      );
    }
  }


  /*
    ======================================================
    GALERÍA / CÁMARA NATIVA FALLBACK
    ======================================================
  */

  function abrirGaleria() {
    if (
      guardando ||
      borradorPendiente
    ) {
      return;
    }

    inputGaleriaRef
      .current
      ?.click();
  }


  async function recibirFotos(
    event
  ) {
    const input =
      event.target;

    const elegidas =
      Array.from(
        input.files ||
        []
      );

    input.value =
      "";

    if (
      elegidas.length ===
      0
    ) {
      return;
    }

    setError(
      ""
    );

    setGuardando(
      true
    );

    try {
      const borrador =
        await obtenerBorradorPublicacion();

      const fotosActuales =
        Array.isArray(
          borrador?.fotos
        )
          ? borrador.fotos
          : [];

      const disponibles =
        Math.max(
          0,

          MAX_FOTOS -
            fotosActuales.length
        );

      if (
        disponibles ===
        0
      ) {
        iniciarResguardoServidor(
          borrador
        );

        navigate(
          "/publicar/captura"
        );

        return;
      }

      const seleccionadas =
        elegidas.slice(
          0,
          disponibles
        );

      const fotosWebp =
        [];

      for (
        let indice = 0;
        indice <
        seleccionadas.length;
        indice += 1
      ) {
        const webp =
          await convertirAWebp(
            seleccionadas[
              indice
            ],

            indice
          );

        fotosWebp.push(
          webp
        );
      }

      await guardarFotosYResguardar(
        fotosWebp
      );

      navigate(
        "/publicar/captura"
      );
    } catch (err) {
      console.error(
        "Error al preparar las fotos:",
        err
      );

      setError(
        err?.message ||
        "No pudimos guardar las fotos. Probá de nuevo."
      );
    } finally {
      setGuardando(
        false
      );
    }
  }


  /*
    ======================================================
    CARGANDO
    ======================================================
  */

  if (
    cargandoBorrador
  ) {
    return (
      <main
        style={{
          minHeight:
            "100vh",

          display:
            "grid",

          placeItems:
            "center",

          background:
            "#f8f5f1",

          color:
            "#075753",

          fontWeight:
            800,
        }}
      >
        Revisando tu publicación...
      </main>
    );
  }


  /*
    ======================================================
    CÁMARA ABIERTA
    ======================================================
  */

  if (
    camaraAbierta
  ) {
    return (
      <>
        <style>{`
          .sv-camara-pantalla {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            background: #111;
            color: #fff;
          }

          .sv-camara-cabecera {
            min-height: 74px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 14px 17px;
            background: #111;
          }

          .sv-camara-titulo {
            font-size: 15px;
            font-weight: 850;
          }

          .sv-camara-contador {
            color: #f4be32;
            font-size: 13px;
            font-weight: 850;
          }

          .sv-camara-cerrar {
            min-width: 66px;
            min-height: 38px;
            border: 1px solid rgba(255,255,255,.4);
            border-radius: 12px;
            background: transparent;
            color: #fff;
            font: inherit;
            font-size: 12px;
            font-weight: 800;
          }

          .sv-camara-centro {
            flex: 1;
            display: grid;
            place-items: center;
            min-height: 0;
            padding: 8px 12px 14px;
          }

          .sv-camara-area {
            position: relative;
            width: min(100%, 520px);
            aspect-ratio: 1 / 1;
            overflow: hidden;
            border-radius: 18px;
            background: #000;
          }

          .sv-camara-video {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
          }

          .sv-camara-oscuro {
            position: absolute;
            inset: 0;
            pointer-events: none;
            box-shadow:
              inset 0 0 0 1px
              rgba(255,255,255,.1);
          }

          .sv-camara-marco {
            position: absolute;
            left: 7%;
            top: 7%;
            width: 86%;
            height: 86%;
            border: 2px solid rgba(255,255,255,.94);
            border-radius: 12px;
            pointer-events: none;
            box-shadow:
              0 0 0 999px
              rgba(0,0,0,.14);
          }

          .sv-camara-ayuda {
            position: absolute;
            left: 50%;
            bottom: 18px;
            width: calc(100% - 44px);
            transform: translateX(-50%);
            padding: 8px 10px;
            border-radius: 12px;
            background: rgba(0,0,0,.56);
            color: #fff;
            text-align: center;
            font-size: 12px;
            line-height: 1.35;
            pointer-events: none;
          }

          .sv-camara-miniaturas {
            min-height: 66px;
            display: flex;
            justify-content: center;
            gap: 6px;
            padding: 7px 12px 4px;
            background: #111;
          }

          .sv-camara-miniatura {
            width: 50px;
            height: 50px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,.35);
            border-radius: 8px;
            background: #222;
          }

          .sv-camara-miniatura img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
          }

          .sv-camara-controles {
            padding:
              9px
              15px
              max(18px, env(safe-area-inset-bottom));
            background: #111;
          }

          .sv-camara-disparador-fila {
            display: grid;
            grid-template-columns: 1fr 86px 1fr;
            gap: 12px;
            align-items: center;
          }

          .sv-camara-disparador {
            width: 76px;
            height: 76px;
            justify-self: center;
            border: 6px solid #fff;
            border-radius: 50%;
            background: #f4be32;
            box-shadow:
              0 0 0 2px
              rgba(255,255,255,.35);
            cursor: pointer;
          }

          .sv-camara-disparador:disabled {
            opacity: .55;
          }

          .sv-camara-accion {
            min-height: 42px;
            border: 0;
            border-radius: 12px;
            background: transparent;
            color: #fff;
            font: inherit;
            font-size: 12px;
            font-weight: 800;
          }

          .sv-camara-listo {
            width: 100%;
            min-height: 48px;
            margin-top: 10px;
            border: 0;
            border-radius: 15px;
            background: var(--sv-mostaza);
            color: #fff;
            font: inherit;
            font-size: 14px;
            font-weight: 900;
          }

          .sv-camara-listo:disabled {
            opacity: .45;
          }

          .sv-camara-error {
            padding: 8px 14px 0;
            color: #ffd3c4;
            text-align: center;
            font-size: 12px;
          }
        `}</style>

        <main className="sv-camara-pantalla">
          <header className="sv-camara-cabecera">
            <button
              type="button"
              className="sv-camara-cerrar"
              onClick={
                cerrarCamara
              }
              disabled={
                capturando ||
                guardando
              }
            >
              Salir
            </button>

            <div className="sv-camara-titulo">
              Fotos del objeto
            </div>

            <div className="sv-camara-contador">
              {fotosCamara.length}
              {" / "}
              {MAX_FOTOS}
            </div>
          </header>

          <section className="sv-camara-centro">
            <div className="sv-camara-area">
              <video
                ref={
                  videoRef
                }
                className="sv-camara-video"
                autoPlay
                playsInline
                muted
              />

              <div className="sv-camara-oscuro" />

              <div className="sv-camara-marco" />

              <div className="sv-camara-ayuda">
                Tratá de que el objeto entre dentro del cuadrado.
              </div>
            </div>
          </section>

          <div className="sv-camara-miniaturas">
            {previewsCamara.map(
              (
                item,
                indice
              ) => (
                <div
                  className="sv-camara-miniatura"
                  key={`${item.archivo.name}-${indice}`}
                >
                  <img
                    src={
                      item.url
                    }
                    alt={`Foto ${indice + 1}`}
                  />
                </div>
              )
            )}
          </div>

          {error && (
            <div className="sv-camara-error">
              {error}
            </div>
          )}

          <footer className="sv-camara-controles">
            <div className="sv-camara-disparador-fila">
              <button
                type="button"
                className="sv-camara-accion"
                onClick={
                  descartarUltimaFoto
                }
                disabled={
                  capturando ||
                  guardando ||
                  fotosCamara.length ===
                    0
                }
              >
                Descartar última
              </button>

              <button
                type="button"
                className="sv-camara-disparador"
                aria-label="Sacar foto"
                onClick={
                  capturarFoto
                }
                disabled={
                  capturando ||
                  guardando ||
                  fotosCamara.length >=
                    MAX_FOTOS
                }
              />

              <div />
            </div>

            <button
              type="button"
              className="sv-camara-listo"
              disabled={
                fotosCamara.length ===
                  0 ||
                capturando ||
                guardando
              }
              onClick={() =>
                finalizarFotosCamara()
              }
            >
              {guardando
                ? "Guardando fotos..."
                : `Listo · usar ${
                    fotosCamara.length
                  } ${
                    fotosCamara.length ===
                    1
                      ? "foto"
                      : "fotos"
                  }`}
            </button>
          </footer>
        </main>
      </>
    );
  }


  /*
    ======================================================
    PANTALLA NORMAL
    ======================================================
  */

  return (
    <>
      <style>{`
        .sv-borrador-pendiente {
          margin-bottom: 18px;
          padding: 18px;
          border: 1px solid #d7e6d6;
          border-radius: 18px;
          background: #f3f9f2;
        }

        .sv-borrador-pendiente h2 {
          margin: 0 0 6px;
          color: var(--sv-petroleo);
          font-size: 20px;
          line-height: 1.2;
        }

        .sv-borrador-pendiente p {
          margin: 0;
          color: #5d5a55;
          font-size: 13px;
          line-height: 1.4;
        }

        .sv-borrador-nombre {
          margin-top: 8px !important;
          color: var(--sv-petroleo) !important;
          font-weight: 850;
        }

        .sv-borrador-acciones {
          display: grid;
          gap: 9px;
          margin-top: 15px;
        }

        .sv-borrador-continuar,
        .sv-borrador-nueva {
          width: 100%;
          min-height: 50px;
          border-radius: 16px;
          font: inherit;
          font-size: 14px;
          font-weight: 850;
          cursor: pointer;
        }

        .sv-borrador-continuar {
          border: 0;
          background: var(--sv-petroleo);
          color: #fff;
        }

        .sv-borrador-nueva {
          border: 1.4px solid var(--sv-petroleo);
          background: transparent;
          color: var(--sv-petroleo);
        }

        .sv-guia {
          display: grid;
          gap: 8px;
        }

        .sv-guia-card {
          min-height: 88px;
          display: grid;
          grid-template-columns: 87px 1fr;
          overflow: hidden;
          border: 1px solid var(--sv-borde);
          border-radius: 16px;
          background: #fff;
          box-shadow:
            0 5px 15px
            rgba(38, 53, 54, 0.025);
        }

        .sv-guia-visual {
          display: grid;
          place-items: center;
          border-right: 1px solid #eee4d9;
          background:
            linear-gradient(
              145deg,
              #fbfaf7 0%,
              #f4f1ec 100%
            );
        }

        .sv-guia-contenido {
          display: grid;
          grid-template-columns: 31px 1fr;
          gap: 9px;
          align-items: center;
          padding: 10px 12px;
        }

        .sv-guia-numero {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          align-self: start;
          margin-top: 1px;
          border-radius: 50%;
          background: var(--sv-petroleo);
          color: #fff;
          font-size: 13px;
          font-weight: 850;
        }

        .sv-guia-texto h2 {
          margin: 0 0 3px;
          color: var(--sv-petroleo);
          font-size: 15.5px;
          line-height: 1.18;
          font-weight: 850;
        }

        .sv-guia-texto p {
          margin: 0;
          color: #4f504e;
          font-size: 13.2px;
          line-height: 1.28;
        }

        .sv-miniobjeto {
          position: relative;
          box-sizing: border-box;
          color: #525957;
        }

        .sv-miniobjeto.frente {
          width: 43px;
          height: 58px;
          border: 2px solid #59605e;
          border-radius: 4px;
          background: #f7f7f5;
        }

        .sv-mini-puerta {
          position: absolute;
          left: 5px;
          top: 8px;
          width: 3px;
          height: 17px;
          border-radius: 4px;
          background: #59605e;
        }

        .sv-mini-linea {
          position: absolute;
          left: 0;
          right: 0;
          top: 25px;
          height: 1.5px;
          background: #59605e;
        }

        .sv-miniobjeto.angulo {
          width: 48px;
          height: 58px;
          transform:
            perspective(100px)
            rotateY(-8deg);
        }

        .sv-mini-cara-a {
          position: absolute;
          left: 5px;
          top: 2px;
          width: 30px;
          height: 53px;
          border: 2px solid #59605e;
          border-radius: 4px 0 0 4px;
          background: #fafaf8;
        }

        .sv-mini-cara-b {
          position: absolute;
          right: 2px;
          top: 5px;
          width: 15px;
          height: 48px;
          border: 2px solid #59605e;
          border-left: 0;
          border-radius: 0 4px 4px 0;
          background: #eeeeeb;
          transform: skewY(12deg);
        }

        .sv-miniobjeto.trasera {
          width: 44px;
          height: 58px;
          border: 2px solid #59605e;
          border-radius: 4px;
          background: #f3f3f1;
        }

        .sv-mini-rejilla {
          position: absolute;
          left: 6px;
          right: 6px;
          height: 4px;
          border-radius: 4px;
          background: #737977;
        }

        .sv-mini-rejilla.r1 {
          top: 12px;
        }

        .sv-mini-rejilla.r2 {
          top: 21px;
        }

        .sv-mini-rejilla.r3 {
          top: 30px;
        }

        .sv-mini-rejilla.r4 {
          top: 39px;
        }

        .sv-miniobjeto.detalle {
          width: 52px;
          height: 52px;
          overflow: hidden;
          border-radius: 9px;
          background:
            linear-gradient(
              135deg,
              #dedfdd 0%,
              #f1f1ef 100%
            );
        }

        .sv-miniobjeto.detalle::before {
          content: "";
          position: absolute;
          top: -6px;
          right: -8px;
          width: 42px;
          height: 42px;
          border: 2px solid #676d6b;
          border-radius: 8px;
        }

        .sv-miniobjeto.detalle span {
          position: absolute;
          left: 22px;
          top: 23px;
          width: 16px;
          height: 2px;
          background: #686d6b;
          transform: rotate(-47deg);
        }

        .sv-miniobjeto.detalle span::after {
          content: "";
          position: absolute;
          left: 6px;
          top: -4px;
          width: 8px;
          height: 2px;
          background: #686d6b;
          transform: rotate(75deg);
        }

        .sv-miniobjeto.etiqueta {
          width: 52px;
          height: 46px;
          padding: 7px 6px;
          border: 2px solid #5c6360;
          border-radius: 7px;
          background: #f7f7f5;
        }

        .sv-etiqueta-linea {
          width: 27px;
          height: 2px;
          margin-bottom: 4px;
          border-radius: 2px;
          background: #68706d;
        }

        .sv-etiqueta-linea.larga {
          width: 36px;
        }

        .sv-etiqueta-linea.corta {
          width: 19px;
        }

        .sv-etiqueta-codigo {
          position: absolute;
          right: 6px;
          bottom: 6px;
          width: 13px;
          height: 10px;
          background:
            repeating-linear-gradient(
              90deg,
              #5c6360 0,
              #5c6360 1px,
              transparent 1px,
              transparent 3px
            );
        }

        .sv-acciones {
          margin-top: 16px;
        }

        .sv-accion-principal,
        .sv-accion-secundaria {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          font: inherit;
          font-weight: 850;
          cursor: pointer;
        }

        .sv-accion-principal {
          min-height: 54px;
          padding: 11px 18px;
          border: 0;
          border-radius: 18px;
          background: var(--sv-petroleo);
          color: #fff;
          font-size: 16.5px;
          box-shadow:
            0 9px 19px
            rgba(7, 87, 83, 0.14);
        }

        .sv-accion-secundaria {
          min-height: 50px;
          margin-top: 9px;
          padding: 10px 18px;
          border: 1.4px solid var(--sv-petroleo);
          border-radius: 18px;
          background: transparent;
          color: var(--sv-petroleo);
          font-size: 15.5px;
        }

        .sv-accion-principal:disabled,
        .sv-accion-secundaria:disabled {
          opacity: 0.58;
          cursor: wait;
        }

        .sv-estado-fotos {
          margin-top: 12px;
          padding: 11px 13px;
          border-radius: 14px;
          text-align: center;
          font-size: 12.8px;
          line-height: 1.35;
        }

        .sv-estado-fotos.error {
          border: 1px solid #efcabb;
          background: #fff3ee;
          color: #a84422;
        }

        .sv-recomendacion {
          margin: 12px 5px 0;
          color: #68635e;
          text-align: center;
          font-size: 12.7px;
          line-height: 1.35;
        }

        .sv-recomendacion strong {
          color: var(--sv-petroleo);
        }

        .sv-input-oculto {
          display: none;
        }

        @media (
          max-width: 380px
        ) {
          .sv-guia-card {
            grid-template-columns:
              78px 1fr;
          }

          .sv-guia-texto h2 {
            font-size: 14.5px;
          }
        }
      `}</style>

      <PantallaOperativa
        titulo="Mostranos bien el objeto"
        subtitulo={
          borradorPendiente
            ? "Tenés una publicación sin terminar."
            : (
              <>
                Podés cargar hasta 5 fotos.
                <br />
                Cuanto mejor se vea, mejor podemos ayudarte.
              </>
            )
        }
        mostrarAyuda={
          !borradorPendiente
        }
      >
        {borradorPendiente ? (
          <section className="sv-borrador-pendiente">
            <h2>
              Tenés una publicación pendiente
            </h2>

            <p>
              Podés seguir exactamente desde donde la dejaste.
            </p>

            {(borradorPendiente.titulo ||
              borradorPendiente
                ?.analisisIA
                ?.tituloSugerido) && (
              <p className="sv-borrador-nombre">
                {borradorPendiente.titulo ||
                  borradorPendiente
                    ?.analisisIA
                    ?.tituloSugerido}
              </p>
            )}

            <div className="sv-borrador-acciones">
              <button
                type="button"
                className="sv-borrador-continuar"
                onClick={
                  continuarPublicacion
                }
                disabled={
                  guardando
                }
              >
                Continuar publicación
              </button>

              <button
                type="button"
                className="sv-borrador-nueva"
                onClick={
                  empezarNueva
                }
                disabled={
                  guardando
                }
              >
                {guardando
                  ? "Preparando..."
                  : "Empezar una nueva"}
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className="sv-guia">
              {GUIA.map(
                (
                  item
                ) => (
                  <article
                    className="sv-guia-card"
                    key={
                      item.numero
                    }
                  >
                    <div className="sv-guia-visual">
                      <MiniObjeto
                        tipo={
                          item.tipo
                        }
                      />
                    </div>

                    <div className="sv-guia-contenido">
                      <span className="sv-guia-numero">
                        {
                          item.numero
                        }
                      </span>

                      <div className="sv-guia-texto">
                        <h2>
                          {
                            item.titulo
                          }
                        </h2>

                        <p>
                          {
                            item.texto
                          }
                        </p>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>

            <div className="sv-acciones">
              <button
                type="button"
                className="sv-accion-principal"
                onClick={
                  iniciarCamara
                }
                disabled={
                  guardando ||
                  iniciandoCamara
                }
              >
                <IconoCamara />

                {iniciandoCamara
                  ? "Abriendo cámara..."
                  : "Sacar fotos"}
              </button>

              <button
                type="button"
                className="sv-accion-secundaria"
                onClick={
                  abrirGaleria
                }
                disabled={
                  guardando ||
                  iniciandoCamara
                }
              >
                <IconoGaleria />

                Elegir fotos de mi galería
              </button>

              <input
                ref={
                  inputCamaraRef
                }
                className="sv-input-oculto"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={
                  recibirFotos
                }
              />

              <input
                ref={
                  inputGaleriaRef
                }
                className="sv-input-oculto"
                type="file"
                accept="image/*"
                multiple
                onChange={
                  recibirFotos
                }
              />
            </div>

            <p className="sv-recomendacion">
              Podés avanzar con{" "}
              <strong>
                1 foto
              </strong>
              , pero te recomendamos al menos{" "}
              <strong>
                3
              </strong>
              .
            </p>
          </>
        )}

        {error && (
          <div className="sv-estado-fotos error">
            {error}
          </div>
        )}
      </PantallaOperativa>
    </>
  );
}


export default PublicarFotos;