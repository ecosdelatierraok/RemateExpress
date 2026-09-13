import { supabase } from "../lib/supabase";

import {
  procesarImagenFondoBlanco,
} from "./procesamientoImagenes";

const TABLA_PUBLICACIONES =
  "publicaciones";

const BUCKET_IMAGENES =
  "publicaciones";

const MAX_FOTOS = 5;

const MAX_LADO_IMAGEN = 1200;

const CALIDAD_WEBP = 0.82;

const CLAVE_INTENTO_PUBLICACION =
  "segunda-vuelta-intento-publicacion";

const DURACION_INTENTO_PUBLICACION =
  24 * 60 * 60 * 1000;

const MAX_REINTENTOS_RED =
  3;

/*
  ======================================================
  TEXTO
  ======================================================
*/

function sanitizarTexto(valor) {
  return String(
    valor ?? ""
  ).trim();
}

function sanitizarDatosEspecificos(
  valor
) {
  if (
    !valor ||
    typeof valor !==
      "object" ||
    Array.isArray(valor)
  ) {
    return {};
  }

  const resultado =
    {};

  Object.entries(
    valor
  ).forEach(
    ([
      claveOriginal,
      dato,
    ]) => {
      const clave =
        sanitizarTexto(
          claveOriginal
        );

      if (!clave) {
        return;
      }

      if (
        dato === null ||
        dato === undefined
      ) {
        return;
      }

      if (
        Array.isArray(
          dato
        )
      ) {
        const lista =
          dato
            .map(
              (item) =>
                sanitizarTexto(
                  item
                )
            )
            .filter(
              Boolean
            );

        if (
          lista.length >
          0
        ) {
          resultado[
            clave
          ] =
            lista;
        }

        return;
      }

      const texto =
        sanitizarTexto(
          dato
        );

      if (texto) {
        resultado[
          clave
        ] =
          texto;
      }
    }
  );

  return resultado;
}

/*
  ======================================================
  FECHA
  ======================================================
*/

function armarFechaCierre(
  fecha,
  hora
) {
  if (
    !fecha ||
    !hora
  ) {
    return null;
  }

  return (
    `${fecha}T${hora}:00-03:00`
  );
}

function fechaCierreEsFutura(
  fechaCierre
) {
  if (!fechaCierre) {
    return false;
  }

  const fecha =
    new Date(
      fechaCierre
    );

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return false;
  }

  return (
    fecha.getTime() >
    Date.now()
  );
}

/*
  ======================================================
  INTENTO ÚNICO DE PUBLICACIÓN
  ======================================================
*/

function generarIdentificador() {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    `${Date.now()}-` +
    Math.random()
      .toString(36)
      .slice(
        2,
        12
      )
  );
}

function datosFotoParaHuella(
  foto
) {
  const archivo =
    foto?.archivo;

  if (
    !(archivo instanceof Blob)
  ) {
    return null;
  }

  return {
    nombre:
      String(
        archivo?.name ||
        ""
      ),

    tipo:
      String(
        archivo?.type ||
        ""
      ),

    tamano:
      Number(
        archivo?.size ||
        0
      ),

    ultimaModificacion:
      Number(
        archivo?.lastModified ||
        0
      ),
  };
}

function generarHuellaBorrador(
  borrador
) {
  const fotos =
    Array.isArray(
      borrador?.fotos
    )
      ? borrador.fotos
          .slice(
            0,
            MAX_FOTOS
          )
          .map(
            datosFotoParaHuella
          )
      : [];

  const datos = {
    titulo:
      sanitizarTexto(
        borrador?.titulo
      ),

    descripcion:
      sanitizarTexto(
        borrador?.descripcion
      ),

    categoria:
      sanitizarTexto(
        borrador?.categoria
      ),

    modalidad:
      sanitizarTexto(
        borrador?.modalidad
      ),

    precio:
      Number(
        borrador?.precio ||
        0
      ),

    valorInicial:
      Number(
        borrador?.valorInicial ||
        0
      ),

    fechaCierre:
      sanitizarTexto(
        borrador?.fechaCierre
      ),

    horaCierre:
      sanitizarTexto(
        borrador?.horaCierre
      ),

    provincia:
      sanitizarTexto(
        borrador?.provincia
      ),

    localidad:
      sanitizarTexto(
        borrador?.localidad
      ),

    barrio:
      sanitizarTexto(
        borrador?.barrio
      ),

    formasEntrega:
      Array.isArray(
        borrador?.formasEntrega
      )
        ? [
            ...borrador.formasEntrega,
          ].sort()
        : [],

    fotos,
  };

  return JSON.stringify(
    datos
  );
}

function leerIntentoGuardado() {
  try {
    const guardado =
      localStorage.getItem(
        CLAVE_INTENTO_PUBLICACION
      );

    if (!guardado) {
      return null;
    }

    const datos =
      JSON.parse(
        guardado
      );

    const creadoEn =
      Number(
        datos?.creadoEn
      );

    const vencido =
      !Number.isFinite(
        creadoEn
      ) ||
      Date.now() -
        creadoEn >
        DURACION_INTENTO_PUBLICACION;

    if (vencido) {
      localStorage.removeItem(
        CLAVE_INTENTO_PUBLICACION
      );

      return null;
    }

    if (
      !datos?.id ||
      !datos?.huella ||
      !datos?.usuarioId
    ) {
      localStorage.removeItem(
        CLAVE_INTENTO_PUBLICACION
      );

      return null;
    }

    return datos;
  } catch {
    return null;
  }
}

function guardarIntento(
  intento
) {
  try {
    localStorage.setItem(
      CLAVE_INTENTO_PUBLICACION,
      JSON.stringify(
        intento
      )
    );
  } catch {
    // No impide publicar.
  }
}

function obtenerOCrearIntento({
  borrador,
  usuarioId,
}) {
  const huella =
    generarHuellaBorrador(
      borrador
    );

  const guardado =
    leerIntentoGuardado();

  if (
    guardado &&
    guardado.usuarioId ===
      usuarioId &&
    guardado.huella ===
      huella
  ) {
    return guardado;
  }

  const nuevo = {
    id:
      generarIdentificador(),

    usuarioId,

    huella,

    creadoEn:
      Date.now(),
  };

  guardarIntento(
    nuevo
  );

  return nuevo;
}

export function borrarIntentoPublicacion() {
  try {
    localStorage.removeItem(
      CLAVE_INTENTO_PUBLICACION
    );
  } catch {
    // No bloquea nada.
  }
}

async function buscarPublicacionPorIntento({
  usuarioId,
  intentoId,
}) {
  if (
    !usuarioId ||
    !intentoId
  ) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLA_PUBLICACIONES
      )
      .select(
        "id, numero, titulo, estado, intento_publicacion_id"
      )
      .eq(
        "creado_por",
        usuarioId
      )
      .eq(
        "intento_publicacion_id",
        intentoId
      )
      .maybeSingle();

  if (error) {
    const mensaje =
      String(
        error?.message ||
        ""
      ).toLowerCase();

    if (
      mensaje.includes(
        "failed to fetch"
      ) ||
      mensaje.includes(
        "network"
      )
    ) {
      return null;
    }

    throw error;
  }

  return data || null;
}

function resultadoDesdePublicacion(
  publicacion
) {
  if (
    !publicacion?.id ||
    !publicacion?.numero
  ) {
    return null;
  }

  return {
    ok: true,

    id:
      publicacion.id,

    numero:
      publicacion.numero,

    publicacion,
  };
}

/*
  ======================================================
  RED / REINTENTOS
  ======================================================
*/

function esperar(
  milisegundos
) {
  return new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        milisegundos
      );
    }
  );
}

function esErrorTransitorio(
  error
) {
  const mensaje =
    String(
      error?.message ||
      ""
    ).toLowerCase();

  const codigo =
    Number(
      error?.status ||
      error?.statusCode ||
      error?.code ||
      0
    );

  return (
    codigo === 0 ||
    codigo === 408 ||
    codigo === 425 ||
    codigo === 429 ||
    codigo === 500 ||
    codigo === 502 ||
    codigo === 503 ||
    codigo === 504 ||
    mensaje.includes(
      "failed to fetch"
    ) ||
    mensaje.includes(
      "network"
    ) ||
    mensaje.includes(
      "timeout"
    ) ||
    mensaje.includes(
      "timed out"
    ) ||
    mensaje.includes(
      "connection"
    )
  );
}

async function ejecutarConReintentos(
  operacion
) {
  let ultimoError =
    null;

  for (
    let intento = 1;
    intento <=
    MAX_REINTENTOS_RED;
    intento += 1
  ) {
    try {
      return await operacion();
    } catch (error) {
      ultimoError =
        error;

      if (
        !esErrorTransitorio(
          error
        ) ||
        intento >=
          MAX_REINTENTOS_RED
      ) {
        throw error;
      }

      await esperar(
        intento *
          700
      );
    }
  }

  throw ultimoError;
}

/*
  ======================================================
  IMÁGENES
  ======================================================
*/

function extensionSegunMime(
  tipo
) {
  const mime =
    String(
      tipo || ""
    ).toLowerCase();

  if (
    mime.includes(
      "png"
    )
  ) {
    return "png";
  }

  if (
    mime.includes(
      "webp"
    )
  ) {
    return "webp";
  }

  if (
    mime.includes(
      "heic"
    )
  ) {
    return "heic";
  }

  if (
    mime.includes(
      "heif"
    )
  ) {
    return "heif";
  }

  return "jpg";
}

function cargarImagenDesdeUrl(
  url
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const imagen =
        new Image();

      imagen.onload =
        () =>
          resolve(
            imagen
          );

      imagen.onerror =
        () =>
          reject(
            new Error(
              "No se pudo abrir una de las fotos."
            )
          );

      imagen.src =
        url;
    }
  );
}

function canvasABlobWebP(
  canvas
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
                "No se pudo preparar una de las fotos."
              )
            );

            return;
          }

          resolve(
            blob
          );
        },

        "image/webp",

        CALIDAD_WEBP
      );
    }
  );
}

async function convertirBlobAWebP(
  blob
) {
  if (
    !(blob instanceof Blob)
  ) {
    throw new Error(
      "Una de las fotos no tiene un formato válido."
    );
  }

  const urlTemporal =
    URL.createObjectURL(
      blob
    );

  try {
    const imagen =
      await cargarImagenDesdeUrl(
        urlTemporal
      );

    let ancho =
      imagen.naturalWidth ||
      imagen.width;

    let alto =
      imagen.naturalHeight ||
      imagen.height;

    if (
      !ancho ||
      !alto
    ) {
      throw new Error(
        "Una de las fotos no tiene dimensiones válidas."
      );
    }

    const ladoMayor =
      Math.max(
        ancho,
        alto
      );

    if (
      ladoMayor >
      MAX_LADO_IMAGEN
    ) {
      const escala =
        MAX_LADO_IMAGEN /
        ladoMayor;

      ancho =
        Math.round(
          ancho *
          escala
        );

      alto =
        Math.round(
          alto *
          escala
        );
    }

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
        "No se pudo preparar una de las fotos."
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

    return await canvasABlobWebP(
      canvas
    );
  } finally {
    URL.revokeObjectURL(
      urlTemporal
    );
  }
}

async function generarVersionPublica(
  archivo
) {
  try {
    const procesada =
      await procesarImagenFondoBlanco(
        archivo,
        {
          modo:
            "automatico",
        }
      );

    if (
      procesada instanceof Blob &&
      procesada.size > 0
    ) {
      return procesada;
    }

    throw new Error(
      "La curaduría devolvió una imagen vacía."
    );
  } catch (error) {
    console.warn(
      "No se pudo aplicar fondo blanco. Usamos la versión normalizada como respaldo:",
      error
    );

    return await convertirBlobAWebP(
      archivo
    );
  }
}

function generarRutaOriginal({
  usuarioId,
  intentoId,
  indice,
  archivo,
}) {
  const extension =
    extensionSegunMime(
      archivo?.type
    );

  return (
    `${usuarioId}/` +
    `intento-${intentoId}/` +
    `originales/` +
    `foto-${indice}.${extension}`
  );
}

function generarRutaProcesada({
  usuarioId,
  intentoId,
  indice,
}) {
  return (
    `${usuarioId}/` +
    `intento-${intentoId}/` +
    `procesadas/` +
    `foto-${indice}.webp`
  );
}

function esErrorRecursoExistente(
  error
) {
  const mensaje =
    String(
      error?.message ||
      ""
    ).toLowerCase();

  const codigo =
    Number(
      error?.statusCode ||
      error?.status ||
      0
    );

  return (
    codigo === 409 ||
    mensaje.includes(
      "resource already exists"
    ) ||
    mensaje.includes(
      "already exists"
    ) ||
    mensaje.includes(
      "duplicate"
    )
  );
}

async function subirArchivo({
  ruta,
  archivo,
  contentType,
}) {
  return await ejecutarConReintentos(
    async () => {
      const {
        error,
      } =
        await supabase.storage
          .from(
            BUCKET_IMAGENES
          )
          .upload(
            ruta,
            archivo,
            {
              contentType,

              cacheControl:
                "31536000",

              upsert:
                false,
            }
          );

      if (!error) {
        return ruta;
      }

      /*
        Si este mismo intento ya alcanzó
        a subir la foto antes, reutilizamos
        exactamente la misma ruta.
      */
      if (
        esErrorRecursoExistente(
          error
        )
      ) {
        return ruta;
      }

      throw error;
    }
  );
}

function obtenerUrlPublica(
  ruta
) {
  const {
    data,
  } =
    supabase.storage
      .from(
        BUCKET_IMAGENES
      )
      .getPublicUrl(
        ruta
      );

  if (
    !data?.publicUrl
  ) {
    throw new Error(
      "No se pudo obtener la dirección pública de una foto."
    );
  }

  return data.publicUrl;
}

async function eliminarArchivosSubidos(
  rutas
) {
  if (
    !Array.isArray(
      rutas
    ) ||
    rutas.length === 0
  ) {
    return;
  }

  const {
    error,
  } =
    await supabase.storage
      .from(
        BUCKET_IMAGENES
      )
      .remove(
        rutas
      );

  if (error) {
    console.error(
      "No se pudieron limpiar archivos de una publicación fallida:",
      error
    );
  }
}

async function prepararYSubirFotos({
  fotos,
  usuarioId,
  intentoId,
}) {
  const fotosValidas =
    Array.isArray(
      fotos
    )
      ? fotos
          .filter(
            (
              foto
            ) =>
              foto?.archivo instanceof
              Blob
          )
          .slice(
            0,
            MAX_FOTOS
          )
      : [];

  if (
    fotosValidas.length ===
    0
  ) {
    throw new Error(
      "La publicación necesita al menos una foto."
    );
  }

  const urlsPublicas =
    [];

  const rutasSubidas =
    [];

  try {
    for (
      let indice = 0;
      indice <
      fotosValidas.length;
      indice += 1
    ) {
      const foto =
        fotosValidas[
          indice
        ];

      const numeroFoto =
        indice + 1;

      const rutaOriginal =
        generarRutaOriginal({
          usuarioId,

          intentoId,

          indice:
            numeroFoto,

          archivo:
            foto.archivo,
        });

      await subirArchivo({
        ruta:
          rutaOriginal,

        archivo:
          foto.archivo,

        contentType:
          foto.archivo.type ||
          "application/octet-stream",
      });

      rutasSubidas.push(
        rutaOriginal
      );

      const versionPublica =
        await generarVersionPublica(
          foto.archivo
        );

      const rutaProcesada =
        generarRutaProcesada({
          usuarioId,

          intentoId,

          indice:
            numeroFoto,
        });

      await subirArchivo({
        ruta:
          rutaProcesada,

        archivo:
          versionPublica,

        contentType:
          "image/webp",
      });

      rutasSubidas.push(
        rutaProcesada
      );

      urlsPublicas.push(
        obtenerUrlPublica(
          rutaProcesada
        )
      );
    }

    return {
      urlsPublicas,
      rutasSubidas,
    };
  } catch (error) {
    throw error;
  }
}

/*
  ======================================================
  NÚMERO DE PUBLICACIÓN
  ======================================================
*/

async function obtenerProximoNumero() {
  const {
    data,
    error,
  } =
    await ejecutarConReintentos(
      async () => {
        const resultado =
          await supabase
            .from(
              TABLA_PUBLICACIONES
            )
            .select(
              "numero"
            )
            .not(
              "numero",
              "is",
              null
            )
            .order(
              "numero",
              {
                ascending:
                  false,
              }
            )
            .limit(
              1
            );

        if (
          resultado.error
        ) {
          throw resultado.error;
        }

        return resultado;
      }
    );

  const ultimo =
    Number(
      data?.[0]?.numero ||
      0
    );

  return ultimo + 1;
}

/*
  ======================================================
  ALTA DESDE BORRADOR
  ======================================================
*/

export async function publicarBorrador(
  borrador
) {
  if (!borrador) {
    throw new Error(
      "No encontramos la publicación que estabas preparando."
    );
  }

  const {
    data: {
      user,
    },

    error:
      errorUsuario,
  } =
    await supabase.auth.getUser();

  if (
    errorUsuario ||
    !user?.id
  ) {
    throw new Error(
      "Tenés que ingresar a tu cuenta para publicar."
    );
  }

  const intento =
    obtenerOCrearIntento({
      borrador,
      usuarioId:
        user.id,
    });

  /*
    Antes de hacer absolutamente nada,
    comprobamos si este mismo intento
    ya terminó anteriormente.
  */
  const existenteAntes =
    await buscarPublicacionPorIntento({
      usuarioId:
        user.id,

      intentoId:
        intento.id,
    });

  if (existenteAntes) {
    const resultado =
      resultadoDesdePublicacion(
        existenteAntes
      );

    if (resultado) {
      return resultado;
    }
  }

  const titulo =
    sanitizarTexto(
      borrador.titulo
    );

  const descripcion =
    sanitizarTexto(
      borrador.descripcion
    );

  const categoria =
    sanitizarTexto(
      borrador.categoria
    );

  const provincia =
    sanitizarTexto(
      borrador.provincia
    );

  const localidad =
    sanitizarTexto(
      borrador.localidad
    );

  const modalidad =
    borrador.modalidad ===
    "PRECIO_FIJO"
      ? "PRECIO_FIJO"
      : "RECIBE_PROPUESTAS";

  if (!titulo) {
    throw new Error(
      "Falta el título de la publicación."
    );
  }

  if (!descripcion) {
    throw new Error(
      "Falta la descripción de la publicación."
    );
  }

  if (!categoria) {
    throw new Error(
      "Falta la categoría."
    );
  }

  if (
    !provincia ||
    !localidad
  ) {
    throw new Error(
      "Falta completar la ubicación."
    );
  }

  const formasEntrega =
    Array.isArray(
      borrador.formasEntrega
    )
      ? borrador.formasEntrega
          .filter(
            Boolean
          )
      : [];

  if (
    formasEntrega.length ===
    0
  ) {
    throw new Error(
      "Elegí al menos una forma de entrega."
    );
  }

  const valor =
    modalidad ===
    "PRECIO_FIJO"
      ? Number(
          borrador.precio ||
          0
        )
      : Number(
          borrador.valorInicial ||
          0
        );

  if (
    !Number.isFinite(
      valor
    ) ||
    valor <= 0
  ) {
    throw new Error(
      modalidad ===
      "PRECIO_FIJO"
        ? "El precio no es válido."
        : "El valor inicial no es válido."
    );
  }

  const fechaCierre =
    modalidad ===
    "RECIBE_PROPUESTAS"
      ? armarFechaCierre(
          borrador.fechaCierre,
          borrador.horaCierre
        )
      : null;

  if (
    modalidad ===
      "RECIBE_PROPUESTAS" &&
    !fechaCierre
  ) {
    throw new Error(
      "Falta la fecha u hora límite para recibir propuestas."
    );
  }

  if (
    modalidad ===
      "RECIBE_PROPUESTAS" &&
    !fechaCierreEsFutura(
      fechaCierre
    )
  ) {
    throw new Error(
      "La fecha y hora límite para recibir propuestas debe ser futura."
    );
  }

  const numero =
    await obtenerProximoNumero();

  let rutasSubidas =
    [];

  try {
    /*
      Volvemos a comprobar justo antes
      del trabajo pesado por si otro proceso
      del mismo intento terminó mientras tanto.
    */
    const existenteAntesFotos =
      await buscarPublicacionPorIntento({
        usuarioId:
          user.id,

        intentoId:
          intento.id,
      });

    if (
      existenteAntesFotos
    ) {
      const resultado =
        resultadoDesdePublicacion(
          existenteAntesFotos
        );

      if (resultado) {
        return resultado;
      }
    }

    const resultadoFotos =
      await prepararYSubirFotos({
        fotos:
          borrador.fotos,

        usuarioId:
          user.id,

        intentoId:
          intento.id,
      });

    const urls =
      resultadoFotos.urlsPublicas;

    rutasSubidas =
      resultadoFotos.rutasSubidas;

    /*
      Antes del INSERT hacemos una tercera
      comprobación. Esto reduce muchísimo
      la posibilidad de carreras.
    */
    const existenteAntesInsert =
      await buscarPublicacionPorIntento({
        usuarioId:
          user.id,

        intentoId:
          intento.id,
      });

    if (
      existenteAntesInsert
    ) {
      const resultado =
        resultadoDesdePublicacion(
          existenteAntesInsert
        );

      if (resultado) {
        return resultado;
      }
    }

    const funcionamiento =
      sanitizarTexto(
        borrador
          ?.respuestasInteligentes
          ?.funcionamiento
      );

    const datosEspecificos =
      sanitizarDatosEspecificos(
        borrador
          ?.datosEspecificos ||
        borrador
          ?.analisisIA
          ?.datosEspecificos
      );

    const datosParaGuardar =
      {
        creado_por:
          user.id,

        intento_publicacion_id:
          intento.id,

        numero,

        modalidad,

        titulo,

        descripcion,

        categoria,

        marca:
          sanitizarTexto(
            borrador.marca
          ),

        modelo:
          sanitizarTexto(
            borrador.modelo
          ),

        datos_especificos:
          datosEspecificos,

        estado_aparente:
          sanitizarTexto(
            borrador.estadoAparente
          ),

        funcionamiento,

        formas_entrega:
          formasEntrega,

        barrio:
          sanitizarTexto(
            borrador.barrio
          ),

        provincia,

        provincia_id:
          sanitizarTexto(
            borrador.provinciaId
          ),

        localidad,

        localidad_id:
          sanitizarTexto(
            borrador.localidadId
          ),

        latitud:
          borrador.latitud ===
            null ||
          borrador.latitud ===
            undefined ||
          borrador.latitud ===
            ""
            ? null
            : Number(
                borrador.latitud
              ),

        longitud:
          borrador.longitud ===
            null ||
          borrador.longitud ===
            undefined ||
          borrador.longitud ===
            ""
            ? null
            : Number(
                borrador.longitud
              ),

        base:
          valor,

        incremento:
          0,

        oferta_actual:
          null,

        fecha_cierre:
          fechaCierre,

        fecha_finalizacion:
          null,

        imagen:
          urls[0] ||
          "",

        imagenes:
          urls,

        frase:
          sanitizarTexto(
            borrador.frase ||
            borrador.fraseCierre
          ),

        activo:
          true,

        estado:
          "ACTIVO",
      };

    const publicacionCreada =
      await ejecutarConReintentos(
        async () => {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                TABLA_PUBLICACIONES
              )
              .insert([
                datosParaGuardar,
              ])
              .select(
                "id, numero, titulo, estado, intento_publicacion_id"
              )
              .single();

          if (error) {
            throw error;
          }

          return data;
        }
      );

    const resultado =
      resultadoDesdePublicacion(
        publicacionCreada
      );

    if (!resultado) {
      throw new Error(
        "No recibimos la confirmación completa de la publicación."
      );
    }

    return resultado;
  } catch (error) {
    /*
      Este es el punto importante:
      puede haber ocurrido que Supabase
      haya creado la publicación pero la
      respuesta no haya llegado al celular.

      Antes de considerar el proceso fallido,
      buscamos el intento único.
    */

    let recuperada =
      null;

    try {
      recuperada =
        await buscarPublicacionPorIntento({
          usuarioId:
            user.id,

          intentoId:
            intento.id,
        });
    } catch (
      errorRecuperacion
    ) {
      console.error(
        "No se pudo comprobar si la publicación había quedado creada:",
        errorRecuperacion
      );
    }

    if (recuperada) {
      const resultado =
        resultadoDesdePublicacion(
          recuperada
        );

      if (resultado) {
        return resultado;
      }
    }

    /*
      Solamente limpiamos las fotos si
      comprobamos que NO hay publicación
      asociada al intento.
    */
    if (
      rutasSubidas.length >
      0
    ) {
      await eliminarArchivosSubidos(
        rutasSubidas
      );
    }

    throw error;
  }
}