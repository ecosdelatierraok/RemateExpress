import { supabase } from "../lib/supabase";

import {
  actualizarFotoBorrador,
  obtenerBorradorPublicacion,
} from "./borradorPublicacion";


const BUCKET =
  "borradores-publicacion";

const MAX_FOTOS =
  5;

const MAX_REINTENTOS =
  4;


/*
  ======================================================
  UTILIDADES
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


function esArchivoYaExistente(
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
      0
    );

  return (
    codigo === 409 ||
    mensaje.includes(
      "already exists"
    ) ||
    mensaje.includes(
      "duplicate"
    ) ||
    mensaje.includes(
      "resource already exists"
    )
  );
}


function esConflictoUnico(
  error
) {
  const mensaje =
    String(
      error?.message ||
      ""
    ).toLowerCase();

  const codigo =
    String(
      error?.code ||
      ""
    ).toLowerCase();

  return (
    codigo === "23505" ||
    mensaje.includes(
      "duplicate key"
    ) ||
    mensaje.includes(
      "unique constraint"
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
    MAX_REINTENTOS;
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
        intento ===
          MAX_REINTENTOS
      ) {
        throw error;
      }

      const demora =
        Math.min(
          5000,
          700 *
            2 **
              (
                intento -
                1
              )
        );

      await esperar(
        demora
      );
    }
  }

  throw ultimoError;
}


/*
  ======================================================
  NORMALIZACIÓN ROBUSTA DE RPC

  Supabase/PostgREST puede devolver:
  - objeto directo;
  - array de una fila;
  - objeto envuelto bajo el nombre de la función;
  - JSON serializado.

  Buscamos siempre la fila real que contenga "id".
  ======================================================
*/

function normalizarFilaRpc(
  valor
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  if (
    typeof valor ===
    "string"
  ) {
    try {
      return normalizarFilaRpc(
        JSON.parse(
          valor
        )
      );
    } catch {
      return null;
    }
  }

  if (
    Array.isArray(
      valor
    )
  ) {
    for (
      const elemento of
      valor
    ) {
      const fila =
        normalizarFilaRpc(
          elemento
        );

      if (
        fila?.id
      ) {
        return fila;
      }
    }

    return null;
  }

  if (
    typeof valor ===
    "object"
  ) {
    if (
      valor.id
    ) {
      return valor;
    }

    /*
      Algunas respuestas RPC pueden venir
      envueltas en una única propiedad.
    */

    const valores =
      Object.values(
        valor
      );

    for (
      const contenido of
      valores
    ) {
      if (
        contenido ===
        valor
      ) {
        continue;
      }

      const fila =
        normalizarFilaRpc(
          contenido
        );

      if (
        fila?.id
      ) {
        return fila;
      }
    }
  }

  return null;
}


async function ejecutarRpcFila(
  nombre,
  parametros
) {
  const respuesta =
    await ejecutarConReintentos(
      async () => {
        const resultado =
          await supabase.rpc(
            nombre,
            parametros
          );

        if (
          resultado.error
        ) {
          throw resultado.error;
        }

        return resultado;
      }
    );

  return normalizarFilaRpc(
    respuesta?.data
  );
}


/*
  ======================================================
  SESIÓN
  ======================================================
*/

async function obtenerUsuarioOpcional() {
  try {
    const {
      data,
      error,
    } =
      await supabase.auth
        .getSession();

    if (error) {
      return null;
    }

    return (
      data?.session?.user ||
      null
    );
  } catch {
    return null;
  }
}


/*
  ======================================================
  BORRADOR TEMPORAL SERVIDOR
  ======================================================
*/

async function obtenerBorradorTemporalServidor(
  tokenPublico
) {
  return ejecutarRpcFila(
    "obtener_borrador_publicacion_temporal",
    {
      p_token_publico:
        tokenPublico,
    }
  );
}


async function crearBorradorTemporalServidor(
  tokenPublico
) {
  try {
    return await ejecutarRpcFila(
      "crear_borrador_publicacion_temporal",
      {
        p_token_publico:
          tokenPublico,

        p_datos:
          {},
      }
    );
  } catch (error) {
    /*
      Dos pestañas pueden intentar crear
      el mismo borrador al mismo tiempo.

      Si una ganó la carrera, recuperamos
      simplemente el que ya existe.
    */

    if (
      esConflictoUnico(
        error
      )
    ) {
      const existente =
        await obtenerBorradorTemporalServidor(
          tokenPublico
        );

      if (existente) {
        return existente;
      }
    }

    throw error;
  }
}


export async function asegurarBorradorTemporalServidor(
  borradorRecibido =
    null
) {
  const borrador =
    borradorRecibido ||
    await obtenerBorradorPublicacion();

  if (!borrador) {
    throw new Error(
      "No encontramos la publicación que estabas preparando."
    );
  }

  if (
    !borrador.borradorId
  ) {
    throw new Error(
      "La publicación no tiene un identificador válido."
    );
  }

  /*
    El borradorId local funciona como token-capacidad
    del borrador temporal.

    Es UUID, persistente y no cambia durante
    toda la preparación.
  */

  const tokenPublico =
    borrador.borradorId;

  let temporal =
    await obtenerBorradorTemporalServidor(
      tokenPublico
    );

  if (!temporal) {
    temporal =
      await crearBorradorTemporalServidor(
        tokenPublico
      );
  }

  if (
    !temporal?.id
  ) {
    throw new Error(
      "No pudimos asegurar el borrador en el servidor."
    );
  }

  const usuario =
    await obtenerUsuarioOpcional();

  /*
    Si ya hay sesión, se reclama inmediatamente.

    Si todavía no hay cuenta, permanece ACTIVO
    y se reclamará después del registro/login.
  */

  if (
    usuario?.id
  ) {
    temporal =
      await reclamarBorradorPublicacionTemporal(
        borrador
      );
  }

  return {
    tokenPublico,

    borradorTemporalId:
      temporal.id,

    estado:
      temporal.estado ||
      null,

    reclamadoPor:
      temporal.reclamado_por ||
      null,
  };
}


export async function reclamarBorradorPublicacionTemporal(
  borradorRecibido =
    null
) {
  const borrador =
    borradorRecibido ||
    await obtenerBorradorPublicacion();

  if (
    !borrador?.borradorId
  ) {
    throw new Error(
      "No encontramos un borrador válido para asociar a tu cuenta."
    );
  }

  const {
    data: {
      user,
    },

    error:
      errorUsuario,
  } =
    await supabase.auth
      .getUser();

  if (
    errorUsuario ||
    !user?.id
  ) {
    throw new Error(
      "Tenés que ingresar a tu cuenta para continuar."
    );
  }

  const temporal =
    await ejecutarRpcFila(
      "reclamar_borrador_publicacion_temporal",
      {
        p_token_publico:
          borrador.borradorId,
      }
    );

  if (
    !temporal?.id
  ) {
    throw new Error(
      "No pudimos asociar el borrador a tu cuenta."
    );
  }

  return temporal;
}


/*
  ======================================================
  STORAGE
  ======================================================
*/

function generarRutaOriginal({
  tokenPublico,
  foto,
  posicion,
}) {
  const extension =
    extensionSegunMime(
      foto?.archivo?.type ||
      foto?.tipo
    );

  return (
    `${tokenPublico}/` +
    `originales/` +
    `foto-${posicion}-${foto.id}.${extension}`
  );
}


async function subirOriginal({
  ruta,
  archivo,
}) {
  await ejecutarConReintentos(
    async () => {
      const {
        error,
      } =
        await supabase.storage
          .from(
            BUCKET
          )
          .upload(
            ruta,
            archivo,
            {
              contentType:
                archivo.type ||
                "application/octet-stream",

              cacheControl:
                "31536000",

              /*
                No usamos upsert.

                Si la red corta después de que
                Supabase recibió el archivo,
                un reintento puede devolver 409.

                Ese 409 significa que el archivo
                ya quedó seguro.
              */
              upsert:
                false,
            }
          );

      if (
        error &&
        !esArchivoYaExistente(
          error
        )
      ) {
        throw error;
      }
    }
  );
}


/*
  ======================================================
  REGISTRO SERVIDOR
  ======================================================
*/

async function registrarOriginal({
  tokenPublico,
  posicion,
  ruta,
  archivo,
}) {
  await ejecutarConReintentos(
    async () => {
      const {
        error,
      } =
        await supabase.rpc(
          "registrar_archivo_borrador_temporal",
          {
            p_token_publico:
              tokenPublico,

            p_posicion:
              posicion,

            p_ruta:
              ruta,

            p_mime_type:
              archivo.type ||
              null,

            p_bytes:
              Number(
                archivo.size ||
                0
              ),
          }
        );

      if (error) {
        throw error;
      }
    }
  );
}


/*
  ======================================================
  UNA FOTO
  ======================================================
*/

async function subirUnaFoto({
  tokenPublico,
  foto,
  posicion,
}) {
  if (
    !foto?.id ||
    !(
      foto?.archivo instanceof
      Blob
    )
  ) {
    throw new Error(
      `La foto ${posicion} no está disponible para subir.`
    );
  }

  const prefijoCorrecto =
    `${tokenPublico}/originales/`;

  /*
    Solo consideramos segura una subida previa
    si pertenece al nuevo bucket temporal.
  */

  if (
    foto.subidaServidor &&
    foto.rutaOriginal &&
    String(
      foto.rutaOriginal
    ).startsWith(
      prefijoCorrecto
    )
  ) {
    return {
      fotoId:
        foto.id,

      posicion,

      rutaOriginal:
        foto.rutaOriginal,

      bucket:
        BUCKET,

      yaEstaba:
        true,
    };
  }

  await actualizarFotoBorrador(
    foto.id,
    {
      estadoSubida:
        "SUBIENDO",

      ultimoErrorSubida:
        null,
    }
  );

  const ruta =
    generarRutaOriginal({
      tokenPublico,
      foto,
      posicion,
    });

  try {
    /*
      Primero Storage.

      Si después falla metadata,
      el siguiente intento encuentra el objeto
      existente y continúa sin duplicarlo.
    */

    await subirOriginal({
      ruta,

      archivo:
        foto.archivo,
    });

    await registrarOriginal({
      tokenPublico,
      posicion,
      ruta,

      archivo:
        foto.archivo,
    });

    await actualizarFotoBorrador(
      foto.id,
      {
        subidaServidor:
          true,

        estadoSubida:
          "SUBIDA",

        rutaOriginal:
          ruta,

        ultimoErrorSubida:
          null,
      }
    );

    return {
      fotoId:
        foto.id,

      posicion,

      rutaOriginal:
        ruta,

      bucket:
        BUCKET,

      yaEstaba:
        false,
    };
  } catch (error) {
    await actualizarFotoBorrador(
      foto.id,
      {
        subidaServidor:
          false,

        estadoSubida:
          "ERROR",

        ultimoErrorSubida:
          error?.message ||
          "No pudimos guardar esta foto.",
      }
    );

    throw error;
  }
}


/*
  ======================================================
  TODAS LAS FOTOS DEL BORRADOR
  ======================================================
*/

export async function subirFotosPendientesPublicacion(
  borradorRecibido =
    null
) {
  const borrador =
    borradorRecibido ||
    await obtenerBorradorPublicacion();

  if (!borrador) {
    throw new Error(
      "No encontramos la publicación que estabas preparando."
    );
  }

  if (
    !borrador.borradorId
  ) {
    throw new Error(
      "La publicación no tiene un identificador válido."
    );
  }

  const fotos =
    Array.isArray(
      borrador.fotos
    )
      ? borrador.fotos
          .slice(
            0,
            MAX_FOTOS
          )
      : [];

  if (
    fotos.length ===
    0
  ) {
    throw new Error(
      "La publicación necesita al menos una foto."
    );
  }

  /*
    Primero garantizamos el borrador-capacidad
    en el servidor.
  */

  const temporal =
    await asegurarBorradorTemporalServidor(
      borrador
    );

  const tokenPublico =
    temporal.tokenPublico;

  const resultados =
    [];

  /*
    Una por una:
    - menor memoria;
    - menor presión de red;
    - cada una queda confirmada;
    - una caída no invalida las anteriores.
  */

  for (
    let indice = 0;
    indice <
    fotos.length;
    indice += 1
  ) {
    const resultado =
      await subirUnaFoto({
        tokenPublico,

        foto:
          fotos[
            indice
          ],

        posicion:
          indice + 1,
      });

    resultados.push(
      resultado
    );
  }

  return {
    ok:
      true,

    borradorId:
      borrador.borradorId,

    tokenPublico,

    borradorTemporalId:
      temporal.borradorTemporalId,

    estado:
      temporal.estado,

    cantidad:
      resultados.length,

    fotos:
      resultados,
  };
}


/*
  ======================================================
  ESTADO LOCAL
  ======================================================
*/

export async function obtenerEstadoSubidaFotos() {
  const borrador =
    await obtenerBorradorPublicacion();

  const fotos =
    Array.isArray(
      borrador?.fotos
    )
      ? borrador.fotos
      : [];

  const tokenPublico =
    borrador?.borradorId ||
    null;

  const prefijoCorrecto =
    tokenPublico
      ? `${tokenPublico}/originales/`
      : null;

  const total =
    fotos.length;

  const subidas =
    fotos.filter(
      (foto) =>
        foto?.subidaServidor &&
        foto?.rutaOriginal &&
        prefijoCorrecto &&
        String(
          foto.rutaOriginal
        ).startsWith(
          prefijoCorrecto
        )
    ).length;

  const conError =
    fotos.filter(
      (foto) =>
        foto?.estadoSubida ===
        "ERROR"
    ).length;

  const subiendo =
    fotos.filter(
      (foto) =>
        foto?.estadoSubida ===
        "SUBIENDO"
    ).length;

  return {
    total,
    subidas,
    conError,
    subiendo,

    completas:
      total > 0 &&
      subidas === total,
  };
}