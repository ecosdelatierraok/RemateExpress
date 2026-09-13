import { supabase } from "../lib/supabase";
import { sincronizarAdmin } from "./admin";

export function normalizarTelefono(valor) {
  return String(valor ?? "")
    .replace(/\D/g, "")
    .trim();
}

function obtenerUrlIngreso() {
  return `${window.location.origin}/ingresar`;
}

function esErrorEmailNoConfirmado(error) {
  const codigo = String(
    error?.code || ""
  ).toLowerCase();

  const mensaje = String(
    error?.message || ""
  ).toLowerCase();

  return (
    codigo === "email_not_confirmed" ||
    mensaje.includes(
      "email not confirmed"
    ) ||
    mensaje.includes(
      "email_not_confirmed"
    )
  );
}

function esErrorCredencialesInvalidas(error) {
  const codigo = String(
    error?.code || ""
  ).toLowerCase();

  const mensaje = String(
    error?.message || ""
  ).toLowerCase();

  return (
    codigo === "invalid_credentials" ||
    mensaje.includes(
      "invalid login credentials"
    )
  );
}

function describirError(error) {
  const partes = [];

  if (error?.name) {
    partes.push(
      `name=${String(error.name)}`
    );
  }

  if (error?.code) {
    partes.push(
      `code=${String(error.code)}`
    );
  }

  if (error?.status) {
    partes.push(
      `status=${String(error.status)}`
    );
  }

  if (error?.message) {
    partes.push(
      `message=${String(error.message)}`
    );
  }

  if (error?.cause) {
    try {
      partes.push(
        `cause=${JSON.stringify(
          error.cause
        )}`
      );
    } catch {
      partes.push(
        `cause=${String(
          error.cause
        )}`
      );
    }
  }

  try {
    const json =
      JSON.stringify(
        error,
        Object.getOwnPropertyNames(
          error || {}
        )
      );

    if (
      json &&
      json !== "{}"
    ) {
      partes.push(
        `raw=${json}`
      );
    }
  } catch {
    // No bloquea el flujo.
  }

  return partes.join(" | ");
}

function mensajeErrorRegistro(
  error
) {
  const codigo = String(
    error?.code || ""
  ).toLowerCase();

  const mensajeOriginal =
    String(
      error?.message || ""
    ).trim();

  const mensaje =
    mensajeOriginal.toLowerCase();

  if (
    mensaje.includes("already") ||
    mensaje.includes("registered") ||
    mensaje.includes(
      "user already exists"
    )
  ) {
    return "Ya existe una cuenta con ese email.";
  }

  if (
    mensaje.includes(
      "email rate limit"
    ) ||
    mensaje.includes(
      "rate limit"
    ) ||
    codigo.includes(
      "rate_limit"
    )
  ) {
    return "Se hicieron demasiados intentos seguidos. Esperá unos minutos y volvé a intentar.";
  }

  if (
    mensaje.includes(
      "invalid email"
    )
  ) {
    return "Revisá el email ingresado.";
  }

  if (
    mensaje.includes(
      "password"
    ) &&
    (
      mensaje.includes("weak") ||
      mensaje.includes(
        "characters"
      ) ||
      mensaje.includes(
        "least"
      )
    )
  ) {
    return "La contraseña no cumple los requisitos de seguridad.";
  }

  if (
    mensaje.includes(
      "database"
    ) ||
    mensaje.includes(
      "saving new user"
    )
  ) {
    return "La cuenta llegó a Supabase, pero hubo un problema al guardar los datos del perfil.";
  }

  if (import.meta.env.DEV) {
    const detalle =
      describirError(
        error
      );

    return detalle
      ? `No se pudo crear la cuenta: ${detalle}`
      : "No se pudo crear la cuenta: error sin detalle.";
  }

  return "No se pudo crear la cuenta. Intentá nuevamente.";
}

export async function registrarUsuario({
  nombre,
  apellido,
  telefono,
  email,
  password,
}) {
  const nombreLimpio =
    String(nombre || "").trim();

  const apellidoLimpio =
    String(apellido || "").trim();

  const telefonoNormalizado =
    normalizarTelefono(
      telefono
    );

  const emailNormalizado =
    String(email || "")
      .trim()
      .toLowerCase();

  if (!nombreLimpio) {
    return {
      ok: false,
      mensaje:
        "Ingresá tu nombre.",
    };
  }

  if (!apellidoLimpio) {
    return {
      ok: false,
      mensaje:
        "Ingresá tu apellido.",
    };
  }

  if (!telefonoNormalizado) {
    return {
      ok: false,
      mensaje:
        "Ingresá tu teléfono.",
    };
  }

  if (!emailNormalizado) {
    return {
      ok: false,
      mensaje:
        "Ingresá tu email.",
    };
  }

  if (
    !password ||
    password.length < 6
  ) {
    return {
      ok: false,
      mensaje:
        "La contraseña debe tener al menos 6 caracteres.",
    };
  }

  let data;
  let error;

  try {
    const respuesta =
      await supabase.auth.signUp({
        email:
          emailNormalizado,

        password,

        options: {
          emailRedirectTo:
            obtenerUrlIngreso(),

          data: {
            nombre:
              nombreLimpio,

            apellido:
              apellidoLimpio,

            telefono:
              telefonoNormalizado,
          },
        },
      });

    data =
      respuesta?.data ||
      null;

    error =
      respuesta?.error ||
      null;
  } catch (errorInesperado) {
    console.error(
      "Excepción en signUp:",
      errorInesperado
    );

    return {
      ok: false,
      mensaje:
        import.meta.env.DEV
          ? `Excepción al crear cuenta: ${
              describirError(
                errorInesperado
              ) ||
              "sin detalle"
            }`
          : "No se pudo crear la cuenta. Intentá nuevamente.",
    };
  }

  if (error) {
    console.error(
      "Error completo al registrar usuario:",
      error
    );

    console.error(
      "Detalle error registro:",
      describirError(
        error
      )
    );

    return {
      ok: false,
      mensaje:
        mensajeErrorRegistro(
          error
        ),
    };
  }

  try {
    await sincronizarAdmin();
  } catch (errorAdmin) {
    console.error(
      "La cuenta se creó, pero falló sincronizarAdmin:",
      errorAdmin
    );
  }

  return {
    ok: true,

    usuario:
      data?.user ||
      null,

    sesion:
      data?.session ||
      null,

    requiereConfirmacion:
      !data?.session,
  };
}

export async function ingresarUsuario({
  email,
  password,
}) {
  const emailNormalizado =
    String(email || "")
      .trim()
      .toLowerCase();

  if (
    !emailNormalizado ||
    !password
  ) {
    return {
      ok: false,
      mensaje:
        "Ingresá tu email y contraseña.",
    };
  }

  const {
    data,
    error,
  } =
    await supabase.auth.signInWithPassword({
      email:
        emailNormalizado,

      password,
    });

  if (error) {
    console.error(
      "Error al iniciar sesión:",
      error
    );

    if (
      esErrorEmailNoConfirmado(
        error
      )
    ) {
      return {
        ok: false,
        mensaje:
          "Primero confirmá tu email. Revisá tu correo y tocá el enlace de confirmación de Segunda Vuelta.",
      };
    }

    if (
      esErrorCredencialesInvalidas(
        error
      )
    ) {
      return {
        ok: false,
        mensaje:
          "Email o contraseña incorrectos.",
      };
    }

    if (import.meta.env.DEV) {
      const detalle =
        describirError(
          error
        );

      return {
        ok: false,
        mensaje:
          detalle
            ? `No se pudo iniciar sesión: ${detalle}`
            : "No se pudo iniciar sesión: error sin detalle.",
      };
    }

    return {
      ok: false,
      mensaje:
        "No se pudo iniciar sesión. Intentá nuevamente.",
    };
  }

  try {
    await sincronizarAdmin();
  } catch (errorAdmin) {
    console.error(
      "Ingresó correctamente, pero falló sincronizarAdmin:",
      errorAdmin
    );
  }

  return {
    ok: true,

    usuario:
      data?.user ||
      null,
  };
}

export async function cerrarSesionUsuario() {
  const {
    error,
  } =
    await supabase.auth.signOut();

  try {
    await sincronizarAdmin();
  } catch (errorAdmin) {
    console.error(
      "Falló sincronizarAdmin al cerrar sesión:",
      errorAdmin
    );
  }

  if (error) {
    throw error;
  }
}

export async function obtenerUsuarioActual() {
  const {
    data: {
      user,
    },

    error,
  } =
    await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user || null;
}

export async function obtenerPerfilActual() {
  const usuario =
    await obtenerUsuarioActual();

  if (!usuario?.id) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("perfiles")
      .select(
        "id, rol, nombre, apellido, telefono, email"
      )
      .eq(
        "id",
        usuario.id
      )
      .single();

  if (error) {
    console.error(
      "Error al obtener perfil:",
      error
    );

    return null;
  }

  return data;
}