const DB_NAME =
  "segunda-vuelta";

const DB_VERSION =
  1;

const STORE_BORRADOR =
  "borrador-publicacion";

const BORRADOR_ID =
  "publicacion-actual";

const MAX_FOTOS =
  5;


/*
  ======================================================
  IDENTIFICADORES
  ======================================================
*/

function generarUuid() {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
      .replace(
        /[xy]/g,
        (caracter) => {
          const aleatorio =
            Math.floor(
              Math.random() * 16
            );

          const valor =
            caracter === "x"
              ? aleatorio
              : (
                  aleatorio &
                  0x3
                ) |
                0x8;

          return valor.toString(
            16
          );
        }
      )
  );
}

function fechaIso() {
  return new Date()
    .toISOString();
}


/*
  ======================================================
  INDEXED DB
  ======================================================
*/

function abrirBase() {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded =
        () => {
          const db =
            request.result;

          if (
            !db.objectStoreNames
              .contains(
                STORE_BORRADOR
              )
          ) {
            db.createObjectStore(
              STORE_BORRADOR,
              {
                keyPath:
                  "id",
              }
            );
          }
        };

      request.onsuccess =
        () => {
          resolve(
            request.result
          );
        };

      request.onerror =
        () => {
          reject(
            request.error
          );
        };
    }
  );
}

function transaccionPromesa(
  transaccion
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      transaccion.oncomplete =
        () =>
          resolve();

      transaccion.onerror =
        () => {
          reject(
            transaccion.error
          );
        };

      transaccion.onabort =
        () => {
          reject(
            transaccion.error
          );
        };
    }
  );
}

async function leerBorradorCrudo() {
  const db =
    await abrirBase();

  try {
    return await new Promise(
      (
        resolve,
        reject
      ) => {
        const transaccion =
          db.transaction(
            STORE_BORRADOR,
            "readonly"
          );

        const store =
          transaccion.objectStore(
            STORE_BORRADOR
          );

        const request =
          store.get(
            BORRADOR_ID
          );

        request.onsuccess =
          () => {
            resolve(
              request.result ||
                null
            );
          };

        request.onerror =
          () => {
            reject(
              request.error
            );
          };
      }
    );
  } finally {
    db.close();
  }
}

async function escribirBorradorCrudo(
  datos
) {
  const db =
    await abrirBase();

  try {
    const transaccion =
      db.transaction(
        STORE_BORRADOR,
        "readwrite"
      );

    transaccion
      .objectStore(
        STORE_BORRADOR
      )
      .put(
        datos
      );

    await transaccionPromesa(
      transaccion
    );

    return datos;
  } finally {
    db.close();
  }
}


/*
  ======================================================
  NORMALIZACIÓN / MIGRACIÓN
  ======================================================
*/

function crearBorradorBase() {
  const ahora =
    fechaIso();

  return {
    id:
      BORRADOR_ID,

    borradorId:
      generarUuid(),

    creadoEn:
      ahora,

    actualizadoEn:
      ahora,

    fotos:
      [],
  };
}

function normalizarFoto(
  foto
) {
  if (!foto) {
    return null;
  }

  return {
    ...foto,

    id:
      foto.id ||
      generarUuid(),

    subidaServidor:
      Boolean(
        foto.subidaServidor
      ),

    estadoSubida:
      foto.estadoSubida ||
      "LOCAL",

    rutaOriginal:
      foto.rutaOriginal ||
      null,

    rutaPublica:
      foto.rutaPublica ||
      null,

    ultimoErrorSubida:
      foto.ultimoErrorSubida ||
      null,
  };
}

function normalizarBorrador(
  borrador
) {
  if (!borrador) {
    return null;
  }

  const fotos =
    Array.isArray(
      borrador.fotos
    )
      ? borrador.fotos
          .map(
            normalizarFoto
          )
          .filter(
            Boolean
          )
          .slice(
            0,
            MAX_FOTOS
          )
      : [];

  return {
    ...borrador,

    id:
      BORRADOR_ID,

    borradorId:
      borrador.borradorId ||
      generarUuid(),

    creadoEn:
      borrador.creadoEn ||
      fechaIso(),

    actualizadoEn:
      borrador.actualizadoEn ||
      fechaIso(),

    fotos,
  };
}


/*
  ======================================================
  BORRADOR
  ======================================================
*/

export async function obtenerBorradorPublicacion() {
  const crudo =
    await leerBorradorCrudo();

  if (!crudo) {
    return null;
  }

  const normalizado =
    normalizarBorrador(
      crudo
    );

  const necesitaMigracion =
    !crudo.borradorId ||
    !Array.isArray(
      crudo.fotos
    ) ||
    crudo.fotos.some(
      (foto) =>
        !foto?.id ||
        foto.estadoSubida ===
          undefined
    );

  if (
    necesitaMigracion
  ) {
    await escribirBorradorCrudo(
      normalizado
    );
  }

  return normalizado;
}

export async function guardarBorradorPublicacion(
  cambios = {}
) {
  const actual =
    (
      await obtenerBorradorPublicacion()
    ) ||
    crearBorradorBase();

  const actualizado =
    normalizarBorrador({
      ...actual,
      ...cambios,

      id:
        BORRADOR_ID,

      borradorId:
        actual.borradorId,

      actualizadoEn:
        fechaIso(),
    });

  await escribirBorradorCrudo(
    actualizado
  );

  return actualizado;
}


/*
  ======================================================
  FOTOS
  ======================================================
*/

export async function guardarFotosBorrador(
  archivos = []
) {
  const fotosNuevas =
    Array.from(
      archivos
    )
      .filter(
        (archivo) =>
          archivo instanceof
          Blob
      )
      .slice(
        0,
        MAX_FOTOS
      );

  const actual =
    (
      await obtenerBorradorPublicacion()
    ) ||
    crearBorradorBase();

  const fotosActuales =
    Array.isArray(
      actual.fotos
    )
      ? actual.fotos
      : [];

  const disponibles =
    Math.max(
      0,
      MAX_FOTOS -
        fotosActuales.length
    );

  const fotosParaAgregar =
    fotosNuevas.slice(
      0,
      disponibles
    );

  const ahora =
    fechaIso();

  const fotosPreparadas =
    fotosParaAgregar.map(
      (
        archivo,
        indice
      ) => ({
        id:
          generarUuid(),

        archivo,

        nombre:
          archivo.name ||
          `foto-${Date.now()}-${indice + 1}.jpg`,

        tipo:
          archivo.type ||
          "image/jpeg",

        tamanio:
          archivo.size ||
          0,

        creadaEn:
          ahora,

        subidaServidor:
          false,

        estadoSubida:
          "LOCAL",

        rutaOriginal:
          null,

        rutaPublica:
          null,

        ultimoErrorSubida:
          null,
      })
    );

  const actualizado =
    normalizarBorrador({
      ...actual,

      id:
        BORRADOR_ID,

      borradorId:
        actual.borradorId,

      fotos: [
        ...fotosActuales,
        ...fotosPreparadas,
      ].slice(
        0,
        MAX_FOTOS
      ),

      actualizadoEn:
        ahora,
    });

  await escribirBorradorCrudo(
    actualizado
  );

  return actualizado;
}

export async function actualizarFotoBorrador(
  fotoId,
  cambios = {}
) {
  const actual =
    await obtenerBorradorPublicacion();

  if (!actual) {
    return null;
  }

  const fotos =
    Array.isArray(
      actual.fotos
    )
      ? actual.fotos
      : [];

  const actualizadas =
    fotos.map(
      (foto) =>
        foto.id === fotoId
          ? {
              ...foto,
              ...cambios,

              id:
                foto.id,
            }
          : foto
    );

  return guardarBorradorPublicacion({
    fotos:
      actualizadas,
  });
}

export async function eliminarFotoBorrador(
  fotoId
) {
  const actual =
    await obtenerBorradorPublicacion();

  if (!actual) {
    return null;
  }

  const fotos =
    Array.isArray(
      actual.fotos
    )
      ? actual.fotos
      : [];

  return guardarBorradorPublicacion({
    fotos:
      fotos.filter(
        (foto) =>
          foto.id !==
          fotoId
      ),
  });
}

export async function reemplazarFotosBorrador(
  fotos = []
) {
  const actual =
    (
      await obtenerBorradorPublicacion()
    ) ||
    crearBorradorBase();

  return guardarBorradorPublicacion({
    borradorId:
      actual.borradorId,

    fotos:
      Array.isArray(
        fotos
      )
        ? fotos
            .map(
              normalizarFoto
            )
            .filter(
              Boolean
            )
            .slice(
              0,
              MAX_FOTOS
            )
        : [],
  });
}


/*
  ======================================================
  BORRADO DEFINITIVO
  ======================================================
*/

export async function borrarBorradorPublicacion() {
  const db =
    await abrirBase();

  try {
    const transaccion =
      db.transaction(
        STORE_BORRADOR,
        "readwrite"
      );

    transaccion
      .objectStore(
        STORE_BORRADOR
      )
      .delete(
        BORRADOR_ID
      );

    await transaccionPromesa(
      transaccion
    );
  } finally {
    db.close();
  }
}