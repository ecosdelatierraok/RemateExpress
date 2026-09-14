import io
import os
import signal
import socket
import sys
import time
import traceback
from pathlib import Path
from threading import Event

from dotenv import load_dotenv
from PIL import Image, ImageFilter, ImageOps
from rembg import remove, new_session
from supabase import create_client


# ======================================================
# VARIABLES DE ENTORNO
# ======================================================

CARPETA_WORKER = Path(
    __file__
).resolve().parent

ARCHIVO_ENV = (
    CARPETA_WORKER
    / ".env"
)

load_dotenv(
    dotenv_path=ARCHIVO_ENV,
    override=False,
)


def normalizar_supabase_url(
    valor,
):
    url = str(
        valor or ""
    ).strip()

    url = url.rstrip(
        "/"
    )

    if url.endswith(
        "/rest/v1"
    ):
        url = url[
            :-len(
                "/rest/v1"
            )
        ]

    return url.rstrip(
        "/"
    )


def entero_entorno(
    nombre,
    predeterminado,
    minimo,
    maximo,
):
    try:
        valor = int(
            os.getenv(
                nombre,
                str(
                    predeterminado
                ),
            )
        )
    except (
        TypeError,
        ValueError,
    ):
        valor = predeterminado

    return max(
        minimo,
        min(
            valor,
            maximo,
        ),
    )


def flotante_entorno(
    nombre,
    predeterminado,
    minimo,
    maximo,
):
    try:
        valor = float(
            os.getenv(
                nombre,
                str(
                    predeterminado
                ),
            )
        )
    except (
        TypeError,
        ValueError,
    ):
        valor = predeterminado

    return max(
        minimo,
        min(
            valor,
            maximo,
        ),
    )


def booleano_entorno(
    nombre,
    predeterminado=False,
):
    valor = str(
        os.getenv(
            nombre,
            "",
        )
    ).strip().lower()

    if not valor:
        return predeterminado

    return valor in {
        "1",
        "true",
        "yes",
        "si",
        "sí",
        "on",
    }


# ======================================================
# CONFIGURACIÓN
# ======================================================

TAMANIO_FINAL = 1200
MARGEN = 110
CALIDAD_WEBP = 90
MODELO = "u2net"

UMBRAL_ALPHA = 8
PADDING_RELATIVO = 0.05
PADDING_MINIMO = 18
MAX_LADO_UTIL = TAMANIO_FINAL - (MARGEN * 2)

BATCH_SIZE = entero_entorno(
    "SV_IMAGE_BATCH_SIZE",
    5,
    1,
    25,
)

POLL_SECONDS = flotante_entorno(
    "SV_IMAGE_POLL_SECONDS",
    5,
    1,
    300,
)

ERROR_SLEEP_SECONDS = (
    flotante_entorno(
        "SV_IMAGE_ERROR_SLEEP_SECONDS",
        15,
        2,
        600,
    )
)

HEARTBEAT_SECONDS = (
    flotante_entorno(
        "SV_IMAGE_HEARTBEAT_SECONDS",
        60,
        15,
        3600,
    )
)

RUN_ONCE = booleano_entorno(
    "SV_IMAGE_RUN_ONCE",
    False,
)

SUPABASE_URL = (
    normalizar_supabase_url(
        os.getenv(
            "SUPABASE_URL",
            "",
        )
    )
)

SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "",
).strip()

WORKER_ID = os.getenv(
    "SV_IMAGE_WORKER_ID",
    "",
).strip()

if not WORKER_ID:
    WORKER_ID = (
        f"curadoria-"
        f"{socket.gethostname()}-"
        f"{os.getpid()}"
    )


def validar_configuracion():
    if not SUPABASE_URL:
        raise RuntimeError(
            "Falta SUPABASE_URL."
        )

    if not SUPABASE_URL.startswith(
        (
            "https://",
            "http://",
        )
    ):
        raise RuntimeError(
            "SUPABASE_URL no tiene un formato válido."
        )

    if not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "Falta SUPABASE_SERVICE_ROLE_KEY."
        )


validar_configuracion()

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)


_sesion_modelo = None

evento_detencion = Event()


# ======================================================
# APAGADO LIMPIO
# ======================================================

def solicitar_detencion(
    numero_senal,
    _frame,
):
    print("")
    print(
        f"[{WORKER_ID}] "
        f"Señal {numero_senal} recibida. "
        "Finalizando de forma segura..."
    )

    evento_detencion.set()


def configurar_senales():
    try:
        signal.signal(
            signal.SIGINT,
            solicitar_detencion,
        )
    except Exception:
        pass

    try:
        signal.signal(
            signal.SIGTERM,
            solicitar_detencion,
        )
    except Exception:
        pass


configurar_senales()


# ======================================================
# MODELO
# ======================================================

def obtener_sesion_modelo():
    global _sesion_modelo

    if _sesion_modelo is None:
        print(
            f"[{WORKER_ID}] "
            f"Cargando modelo {MODELO}..."
        )

        _sesion_modelo = new_session(
            MODELO
        )

        print(
            f"[{WORKER_ID}] "
            "Modelo cargado."
        )

    return _sesion_modelo


# ======================================================
# PROCESAMIENTO DE IMAGEN
# ======================================================

def abrir_imagen_desde_bytes(
    datos_entrada,
    modo="RGBA",
):
    imagen = Image.open(
        io.BytesIO(
            datos_entrada
        )
    )

    imagen = ImageOps.exif_transpose(
        imagen
    )

    return imagen.convert(
        modo
    )


def limpiar_canal_alpha(
    alfa,
):
    alfa = alfa.point(
        lambda valor: 0 if valor <= UMBRAL_ALPHA else valor
    )

    alfa = alfa.filter(
        ImageFilter.MedianFilter(
            size=3
        )
    )

    return alfa


def expandir_caja(
    caja,
    ancho_total,
    alto_total,
):
    x1, y1, x2, y2 = caja

    ancho = max(
        1,
        x2 - x1,
    )

    alto = max(
        1,
        y2 - y1,
    )

    pad_x = max(
        PADDING_MINIMO,
        round(
            ancho * PADDING_RELATIVO
        ),
    )

    pad_y = max(
        PADDING_MINIMO,
        round(
            alto * PADDING_RELATIVO
        ),
    )

    return (
        max(
            0,
            x1 - pad_x,
        ),
        max(
            0,
            y1 - pad_y,
        ),
        min(
            ancho_total,
            x2 + pad_x,
        ),
        min(
            alto_total,
            y2 + pad_y,
        ),
    )


def preparar_objeto_sin_fondo(
    datos_entrada,
):
    imagen_origen = abrir_imagen_desde_bytes(
        datos_entrada,
        modo="RGBA",
    )

    buffer_entrada = io.BytesIO()

    imagen_origen.save(
        buffer_entrada,
        format="PNG",
    )

    datos_salida = remove(
        buffer_entrada.getvalue(),
        session=obtener_sesion_modelo(),
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=8,
    )

    imagen = abrir_imagen_desde_bytes(
        datos_salida,
        modo="RGBA",
    )

    alfa = limpiar_canal_alpha(
        imagen.getchannel(
            "A"
        )
    )

    imagen.putalpha(
        alfa
    )

    return imagen


def componer_objeto_en_blanco(
    imagen,
):
    alfa = limpiar_canal_alpha(
        imagen.getchannel(
            "A"
        )
    )

    caja_objeto = alfa.getbbox()

    if caja_objeto is None:
        raise ValueError(
            "No se encontró ningún objeto visible."
        )

    caja_objeto = expandir_caja(
        caja_objeto,
        imagen.width,
        imagen.height,
    )

    objeto = imagen.crop(
        caja_objeto
    )

    ancho, alto = objeto.size

    if (
        ancho <= 0
        or alto <= 0
    ):
        raise ValueError(
            "El objeto detectado no tiene dimensiones válidas."
        )

    escala = min(
        MAX_LADO_UTIL / ancho,
        MAX_LADO_UTIL / alto,
    )

    nuevo_ancho = max(
        1,
        round(
            ancho * escala
        ),
    )

    nuevo_alto = max(
        1,
        round(
            alto * escala
        ),
    )

    objeto = objeto.resize(
        (
            nuevo_ancho,
            nuevo_alto,
        ),
        Image.Resampling.LANCZOS,
    )

    objeto = objeto.filter(
        ImageFilter.UnsharpMask(
            radius=1.3,
            percent=130,
            threshold=2,
        )
    )

    lienzo = Image.new(
        "RGB",
        (
            TAMANIO_FINAL,
            TAMANIO_FINAL,
        ),
        "white",
    )

    x = (
        TAMANIO_FINAL
        - nuevo_ancho
    ) // 2

    y = (
        TAMANIO_FINAL
        - nuevo_alto
    ) // 2

    lienzo.paste(
        objeto,
        (x, y),
        objeto,
    )

    return lienzo


def crear_fallback_seguro(
    datos_entrada,
):
    imagen = abrir_imagen_desde_bytes(
        datos_entrada,
        modo="RGB",
    )

    imagen.thumbnail(
        (
            MAX_LADO_UTIL,
            MAX_LADO_UTIL,
        ),
        Image.Resampling.LANCZOS,
    )

    imagen = imagen.filter(
        ImageFilter.UnsharpMask(
            radius=1.2,
            percent=120,
            threshold=2,
        )
    )

    lienzo = Image.new(
        "RGB",
        (
            TAMANIO_FINAL,
            TAMANIO_FINAL,
        ),
        "white",
    )

    x = (
        TAMANIO_FINAL
        - imagen.width
    ) // 2

    y = (
        TAMANIO_FINAL
        - imagen.height
    ) // 2

    lienzo.paste(
        imagen,
        (x, y),
    )

    return lienzo


def imagen_a_webp(
    imagen,
):
    salida = io.BytesIO()

    imagen.save(
        salida,
        format="WEBP",
        quality=CALIDAD_WEBP,
        method=6,
    )

    return salida.getvalue()


def procesar_imagen(
    datos_entrada,
):
    try:
        final = (
            componer_objeto_en_blanco(
                preparar_objeto_sin_fondo(
                    datos_entrada
                )
            )
        )

        return {
            "datos":
                imagen_a_webp(
                    final
                ),

            "modo":
                "CURADA",
        }

    except Exception as error:
        print(
            f"[{WORKER_ID}] "
            "Curaduría IA falló. "
            "Usando fallback seguro: "
            f"{error}"
        )

        final = (
            crear_fallback_seguro(
                datos_entrada
            )
        )

        return {
            "datos":
                imagen_a_webp(
                    final
                ),

            "modo":
                "FALLBACK",
        }


# ======================================================
# STORAGE
# ======================================================

def descargar_original(
    bucket,
    ruta,
):
    print(
        f"[{WORKER_ID}] "
        f"Descargando "
        f"{bucket}/{ruta}"
    )

    datos = (
        supabase.storage
        .from_(
            bucket
        )
        .download(
            ruta
        )
    )

    if not datos:
        raise RuntimeError(
            "Storage devolvió una imagen vacía."
        )

    return datos


def subir_procesada(
    bucket,
    ruta,
    datos,
):
    print(
        f"[{WORKER_ID}] "
        f"Subiendo "
        f"{bucket}/{ruta}"
    )

    opciones = {
        "content-type":
            "image/webp",

        "cache-control":
            "31536000",

        "upsert":
            "true",
    }

    (
        supabase.storage
        .from_(
            bucket
        )
        .upload(
            ruta,
            datos,
            opciones,
        )
    )


# ======================================================
# COLA ANTERIOR
# public.archivos_publicacion
# ======================================================

def tomar_trabajos_legacy(
    limite,
):
    if limite <= 0:
        return []

    respuesta = (
        supabase.rpc(
            "tomar_archivos_publicacion_para_procesar",
            {
                "p_worker_id":
                    WORKER_ID,

                "p_limite":
                    limite,
            },
        )
        .execute()
    )

    trabajos = (
        respuesta.data
        or []
    )

    for trabajo in trabajos:
        trabajo["_origen_cola"] = (
            "LEGACY"
        )

    return trabajos


def ruta_publica_legacy_para(
    archivo,
):
    usuario_id = str(
        archivo[
            "creado_por"
        ]
    )

    borrador_id = str(
        archivo[
            "borrador_id"
        ]
    )

    posicion = int(
        archivo[
            "posicion"
        ]
    )

    return (
        f"{usuario_id}/"
        f"borradores/"
        f"{borrador_id}/"
        f"procesadas/"
        f"foto-{posicion}.webp"
    )


def registrar_archivo_publico_legacy(
    archivo_original,
    ruta_publica,
    bytes_salida,
):
    usuario_id = (
        archivo_original[
            "creado_por"
        ]
    )

    borrador_id = (
        archivo_original[
            "borrador_id"
        ]
    )

    posicion = int(
        archivo_original[
            "posicion"
        ]
    )

    existente = (
        supabase.table(
            "archivos_publicacion"
        )
        .select(
            "id"
        )
        .eq(
            "creado_por",
            usuario_id,
        )
        .eq(
            "borrador_id",
            borrador_id,
        )
        .eq(
            "posicion",
            posicion,
        )
        .eq(
            "tipo",
            "PUBLICA",
        )
        .limit(
            1
        )
        .execute()
    )

    datos = {
        "creado_por":
            usuario_id,

        "borrador_id":
            borrador_id,

        "posicion":
            posicion,

        "tipo":
            "PUBLICA",

        "bucket":
            "publicaciones",

        "ruta":
            ruta_publica,

        "mime_type":
            "image/webp",

        "bytes":
            int(
                bytes_salida
            ),

        "estado":
            "LISTO",

        "intentos":
            0,

        "ultimo_error":
            None,

        "proximo_intento_at":
            None,

        "bloqueado_at":
            None,

        "bloqueado_por":
            None,
    }

    if existente.data:
        archivo_id = (
            existente.data[0][
                "id"
            ]
        )

        (
            supabase.table(
                "archivos_publicacion"
            )
            .update(
                datos
            )
            .eq(
                "id",
                archivo_id,
            )
            .execute()
        )

        return archivo_id

    respuesta = (
        supabase.table(
            "archivos_publicacion"
        )
        .insert(
            datos
        )
        .execute()
    )

    if (
        not respuesta.data
        or not respuesta.data[0].get(
            "id"
        )
    ):
        raise RuntimeError(
            "No se pudo registrar la imagen pública."
        )

    return (
        respuesta.data[0][
            "id"
        ]
    )


def marcar_original_legacy_listo(
    archivo_id,
):
    (
        supabase.rpc(
            "marcar_archivo_publicacion_listo",
            {
                "p_archivo_id":
                    archivo_id,
            },
        )
        .execute()
    )


def marcar_original_legacy_error(
    archivo_id,
    mensaje,
):
    (
        supabase.rpc(
            "marcar_archivo_publicacion_error",
            {
                "p_archivo_id":
                    archivo_id,

                "p_error":
                    mensaje,
            },
        )
        .execute()
    )


# ======================================================
# COLA TEMPORAL
# public.archivos_borrador_temporal
# ======================================================

def tomar_trabajos_temporales(
    limite,
):
    if limite <= 0:
        return []

    respuesta = (
        supabase.rpc(
            "tomar_archivos_borrador_temporal_para_procesar",
            {
                "p_worker_id":
                    WORKER_ID,

                "p_limite":
                    limite,
            },
        )
        .execute()
    )

    trabajos = (
        respuesta.data
        or []
    )

    for trabajo in trabajos:
        trabajo["_origen_cola"] = (
            "TEMPORAL"
        )

    return trabajos


def obtener_borrador_temporal(
    borrador_temporal_id,
):
    respuesta = (
        supabase.table(
            "borradores_publicacion_temporales"
        )
        .select(
            "id,"
            "token_publico,"
            "estado,"
            "creado_por,"
            "reclamado_por"
        )
        .eq(
            "id",
            borrador_temporal_id,
        )
        .limit(
            1
        )
        .execute()
    )

    if not respuesta.data:
        raise RuntimeError(
            "No se encontró el borrador temporal asociado."
        )

    return (
        respuesta.data[0]
    )


def ruta_procesada_temporal_para(
    archivo,
):
    borrador_temporal_id = (
        archivo[
            "borrador_temporal_id"
        ]
    )

    posicion = int(
        archivo[
            "posicion"
        ]
    )

    borrador = (
        obtener_borrador_temporal(
            borrador_temporal_id
        )
    )

    token_publico = str(
        borrador[
            "token_publico"
        ]
    )

    return (
        f"{token_publico}/"
        f"procesadas/"
        f"foto-{posicion}.webp"
    )


def registrar_archivo_procesado_temporal(
    archivo_original,
    ruta_procesada,
    bytes_salida,
):
    borrador_temporal_id = (
        archivo_original[
            "borrador_temporal_id"
        ]
    )

    posicion = int(
        archivo_original[
            "posicion"
        ]
    )

    existente = (
        supabase.table(
            "archivos_borrador_temporal"
        )
        .select(
            "id"
        )
        .eq(
            "borrador_temporal_id",
            borrador_temporal_id,
        )
        .eq(
            "posicion",
            posicion,
        )
        .eq(
            "tipo",
            "PROCESADA",
        )
        .limit(
            1
        )
        .execute()
    )

    datos = {
        "borrador_temporal_id":
            borrador_temporal_id,

        "posicion":
            posicion,

        "tipo":
            "PROCESADA",

        "bucket":
            "borradores-publicacion",

        "ruta":
            ruta_procesada,

        "mime_type":
            "image/webp",

        "bytes":
            int(
                bytes_salida
            ),

        "estado":
            "LISTO",

        "intentos":
            0,

        "max_intentos":
            5,

        "ultimo_error":
            None,

        "proximo_intento_at":
            None,

        "bloqueado_at":
            None,

        "bloqueado_por":
            None,
    }

    if existente.data:
        archivo_id = (
            existente.data[0][
                "id"
            ]
        )

        (
            supabase.table(
                "archivos_borrador_temporal"
            )
            .update(
                datos
            )
            .eq(
                "id",
                archivo_id,
            )
            .execute()
        )

        return archivo_id

    respuesta = (
        supabase.table(
            "archivos_borrador_temporal"
        )
        .insert(
            datos
        )
        .execute()
    )

    if (
        not respuesta.data
        or not respuesta.data[0].get(
            "id"
        )
    ):
        raise RuntimeError(
            "No se pudo registrar la imagen procesada temporal."
        )

    return (
        respuesta.data[0][
            "id"
        ]
    )


def marcar_original_temporal_listo(
    archivo_id,
):
    (
        supabase.rpc(
            "marcar_archivo_borrador_temporal_listo",
            {
                "p_archivo_id":
                    archivo_id,
            },
        )
        .execute()
    )


def marcar_original_temporal_error(
    archivo_id,
    mensaje,
):
    (
        supabase.rpc(
            "marcar_archivo_borrador_temporal_error",
            {
                "p_archivo_id":
                    archivo_id,

                "p_error":
                    mensaje,
            },
        )
        .execute()
    )


# ======================================================
# PROCESAR COLA ANTERIOR
# ======================================================

def procesar_trabajo_legacy(
    archivo,
):
    archivo_id = str(
        archivo[
            "id"
        ]
    )

    bucket = (
        archivo.get(
            "bucket"
        )
        or "publicaciones"
    )

    ruta_original = (
        archivo.get(
            "ruta"
        )
        or ""
    ).strip()

    if not ruta_original:
        raise RuntimeError(
            "El archivo original no tiene ruta."
        )

    print("")

    print(
        f"[{WORKER_ID}] "
        f"Procesando LEGACY "
        f"{archivo_id}"
    )

    datos_originales = (
        descargar_original(
            bucket,
            ruta_original,
        )
    )

    resultado = (
        procesar_imagen(
            datos_originales
        )
    )

    datos_webp = (
        resultado[
            "datos"
        ]
    )

    modo = (
        resultado[
            "modo"
        ]
    )

    ruta_publica = (
        ruta_publica_legacy_para(
            archivo
        )
    )

    subir_procesada(
        "publicaciones",
        ruta_publica,
        datos_webp,
    )

    registrar_archivo_publico_legacy(
        archivo,
        ruta_publica,
        len(
            datos_webp
        ),
    )

    marcar_original_legacy_listo(
        archivo_id
    )

    print(
        f"[{WORKER_ID}] "
        f"OK LEGACY "
        f"{archivo_id} "
        f"modo={modo}"
    )


# ======================================================
# PROCESAR COLA TEMPORAL
# ======================================================

def procesar_trabajo_temporal(
    archivo,
):
    archivo_id = str(
        archivo[
            "id"
        ]
    )

    bucket = (
        archivo.get(
            "bucket"
        )
        or "borradores-publicacion"
    )

    ruta_original = (
        archivo.get(
            "ruta"
        )
        or ""
    ).strip()

    if not ruta_original:
        raise RuntimeError(
            "El archivo temporal original no tiene ruta."
        )

    print("")

    print(
        f"[{WORKER_ID}] "
        f"Procesando TEMPORAL "
        f"{archivo_id}"
    )

    datos_originales = (
        descargar_original(
            bucket,
            ruta_original,
        )
    )

    resultado = (
        procesar_imagen(
            datos_originales
        )
    )

    datos_webp = (
        resultado[
            "datos"
        ]
    )

    modo = (
        resultado[
            "modo"
        ]
    )

    ruta_procesada = (
        ruta_procesada_temporal_para(
            archivo
        )
    )

    subir_procesada(
        "borradores-publicacion",
        ruta_procesada,
        datos_webp,
    )

    registrar_archivo_procesado_temporal(
        archivo,
        ruta_procesada,
        len(
            datos_webp
        ),
    )

    marcar_original_temporal_listo(
        archivo_id
    )

    print(
        f"[{WORKER_ID}] "
        f"OK TEMPORAL "
        f"{archivo_id} "
        f"modo={modo}"
    )


# ======================================================
# TOMAR TRABAJOS DE AMBAS COLAS
# ======================================================

def tomar_trabajos():
    limite_temporal = max(
        1,
        (
            BATCH_SIZE
            + 1
        ) // 2,
    )

    limite_legacy = max(
        0,
        BATCH_SIZE
        - limite_temporal,
    )

    temporales = (
        tomar_trabajos_temporales(
            limite_temporal
        )
    )

    legacy = (
        tomar_trabajos_legacy(
            limite_legacy
        )
    )

    usados = (
        len(
            temporales
        )
        +
        len(
            legacy
        )
    )

    faltantes = (
        BATCH_SIZE
        - usados
    )

    if faltantes > 0:
        if (
            len(
                temporales
            )
            <
            limite_temporal
        ):
            extra_legacy = (
                tomar_trabajos_legacy(
                    faltantes
                )
            )

            legacy.extend(
                extra_legacy
            )

        else:
            extra_temporales = (
                tomar_trabajos_temporales(
                    faltantes
                )
            )

            temporales.extend(
                extra_temporales
            )

    return (
        temporales
        +
        legacy
    )


# ======================================================
# DESPACHO
# ======================================================

def procesar_trabajo(
    archivo,
):
    origen = (
        archivo.get(
            "_origen_cola"
        )
        or ""
    )

    if origen == "TEMPORAL":
        procesar_trabajo_temporal(
            archivo
        )

        return

    if origen == "LEGACY":
        procesar_trabajo_legacy(
            archivo
        )

        return

    raise RuntimeError(
        "El trabajo no informa una cola de origen válida."
    )


def marcar_error_segun_origen(
    archivo,
    mensaje,
):
    archivo_id = str(
        archivo.get(
            "id"
        )
    )

    origen = (
        archivo.get(
            "_origen_cola"
        )
        or ""
    )

    if origen == "TEMPORAL":
        marcar_original_temporal_error(
            archivo_id,
            mensaje,
        )

        return

    if origen == "LEGACY":
        marcar_original_legacy_error(
            archivo_id,
            mensaje,
        )

        return

    raise RuntimeError(
        "No se pudo determinar dónde registrar el error."
    )


# ======================================================
# EJECUTAR UN LOTE
# ======================================================

def ejecutar_lote():
    trabajos = (
        tomar_trabajos()
    )

    if not trabajos:
        return {
            "tomados":
                0,

            "exitos":
                0,

            "errores":
                0,
        }

    cantidad_temporales = sum(
        1
        for trabajo in trabajos
        if (
            trabajo.get(
                "_origen_cola"
            )
            ==
            "TEMPORAL"
        )
    )

    cantidad_legacy = sum(
        1
        for trabajo in trabajos
        if (
            trabajo.get(
                "_origen_cola"
            )
            ==
            "LEGACY"
        )
    )

    print(
        f"[{WORKER_ID}] "
        f"Trabajos tomados: "
        f"{len(trabajos)} "
        f"(TEMPORAL={cantidad_temporales}, "
        f"LEGACY={cantidad_legacy})"
    )

    exitos = 0
    errores = 0

    for archivo in trabajos:
        if evento_detencion.is_set():
            break

        archivo_id = str(
            archivo.get(
                "id"
            )
        )

        origen = (
            archivo.get(
                "_origen_cola"
            )
            or "DESCONOCIDA"
        )

        try:
            procesar_trabajo(
                archivo
            )

            exitos += 1

        except Exception as error:
            errores += 1

            mensaje = (
                f"{type(error).__name__}: "
                f"{error}"
            )

            print(
                f"[{WORKER_ID}] "
                f"ERROR {origen} "
                f"{archivo_id}: "
                f"{mensaje}"
            )

            traceback.print_exc()

            try:
                marcar_error_segun_origen(
                    archivo,
                    mensaje,
                )

            except Exception as error_estado:
                print(
                    f"[{WORKER_ID}] "
                    "ERROR CRÍTICO marcando estado: "
                    f"{error_estado}"
                )

    print(
        f"[{WORKER_ID}] "
        "Lote terminado. "
        f"OK={exitos} "
        f"ERROR={errores}"
    )

    return {
        "tomados":
            len(
                trabajos
            ),

        "exitos":
            exitos,

        "errores":
            errores,
    }


# ======================================================
# WORKER CONTINUO
# ======================================================

def ejecutar_continuo():
    print("")
    print(
        "============================================"
    )
    print(
        "SEGUNDA VUELTA · WORKER CURADURÍA"
    )
    print(
        f"Worker: "
        f"{WORKER_ID}"
    )
    print(
        f"Lote máximo: "
        f"{BATCH_SIZE}"
    )
    print(
        "Colas: TEMPORAL + LEGACY"
    )
    print(
        f"Consulta cada: "
        f"{POLL_SECONDS:g} s"
    )
    print(
        f"Modo: "
        f"{'UNA EJECUCIÓN' if RUN_ONCE else 'CONTINUO'}"
    )
    print(
        "============================================"
    )

    ultimo_heartbeat = 0.0
    ciclos_vacios = 0

    while not evento_detencion.is_set():
        try:
            resultado = (
                ejecutar_lote()
            )

            tomados = int(
                resultado[
                    "tomados"
                ]
            )

            if RUN_ONCE:
                return int(
                    resultado[
                        "errores"
                    ]
                )

            if tomados > 0:
                ciclos_vacios = 0
                ultimo_heartbeat = (
                    time.monotonic()
                )

                continue

            ciclos_vacios += 1

            ahora = (
                time.monotonic()
            )

            if (
                ultimo_heartbeat == 0
                or
                ahora -
                ultimo_heartbeat >=
                HEARTBEAT_SECONDS
            ):
                print(
                    f"[{WORKER_ID}] "
                    "Activo · "
                    "sin imágenes pendientes."
                )

                ultimo_heartbeat = (
                    ahora
                )

            evento_detencion.wait(
                POLL_SECONDS
            )

        except KeyboardInterrupt:
            evento_detencion.set()

        except Exception as error:
            print(
                f"[{WORKER_ID}] "
                "ERROR DE CICLO: "
                f"{type(error).__name__}: "
                f"{error}"
            )

            traceback.print_exc()

            if RUN_ONCE:
                return 1

            print(
                f"[{WORKER_ID}] "
                "El worker sigue vivo. "
                f"Nuevo intento en "
                f"{ERROR_SLEEP_SECONDS:g} s."
            )

            evento_detencion.wait(
                ERROR_SLEEP_SECONDS
            )

    print(
        f"[{WORKER_ID}] "
        "Worker detenido correctamente."
    )

    return 0


# ======================================================
# ENTRADA
# ======================================================

if __name__ == "__main__":
    try:
        codigo_salida = (
            ejecutar_continuo()
        )

        sys.exit(
            1
            if codigo_salida > 0
            else 0
        )

    except Exception as error:
        print(
            f"[{WORKER_ID}] "
            f"ERROR FATAL: "
            f"{error}"
        )

        traceback.print_exc()

        sys.exit(
            1
        )