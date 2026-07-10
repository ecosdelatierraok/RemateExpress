# Bitácora Remate Express Core

## 02/07/2026

- Git instalado.
- Git configurado.
- Primer commit realizado.
- Proyecto publicado en GitHub.
- Definimos que la PWA será el lugar donde viven los remates.
- WhatsApp será puerta de entrada y canal de avisos.
- Decidimos que quien ofrece el objeto hace la carga inicial.
- La Curadora revisa, mejora y activa el remate.
- Definimos la comisión del 10% sobre el valor final adjudicado.
- Nace el concepto Remate Express Core.

03/07/2026

- Se instaló Node.js.
- Se configuró el entorno de desarrollo.
- Se instaló React + Vite.
- Nació oficialmente Remate Express Core.
- Comenzó el desarrollo de la PWA.

05/07/2026

Se implementó React Router y quedó funcionando la primera navegación oficial de Remate Express entre la Home (/) y la pantalla de Remates (/remates). A partir de este punto la aplicación deja de ser un conjunto de pantallas independientes y pasa a comportarse como una PWA con navegación interna.
Bitácora – 5 de julio de 2026

Estado del proyecto: El flujo principal ya existe y es funcional. Se pueden crear remates desde la PWA, almacenarlos localmente y visualizarlos en la lista. La carga de imágenes quedó implementada y el formulario ya contempla los campos principales para la operación real.

Pendiente prioritario: Resolver el acceso al detalle de los remates creados por la Curadora. Los remates iniciales funcionan; los nuevos muestran "Remate no encontrado". La revisión se centrará en DetalleRemate.jsx y en la búsqueda del remate desde obtenerRemates().

Decisión de producto tomada hoy: La frase de neuroventa seguirá siendo redactada por ChatGPT y luego copiada al campo correspondiente. Más adelante se desarrollará un botón para generar automáticamente la publicación completa de WhatsApp con el formato oficial de Remate Express.

📚 Bitácora – 06/07/2026
✅ Funcionalidades implementadas
Registro de ofertante por WhatsApp.
Publicación de remates.
Absorción automática de publicaciones de WhatsApp.
Carga y optimización de imágenes.
Visualización completa del remate.
Sistema de ofertas.
Historial de ofertas.
Edición completa de remates.
Eliminación de remates.
Modo Administradora oculto mediante doble clic sobre el logo.
Protección de pantallas de administración.
URL amigable usando el número de remate.
Formato argentino de fecha y hora.
Incremento y base configurados de $1.000 en $1.000.
Renovación automática de remates sin ofertas (+24 h).
Corrección del título de la pestaña del navegador ("Remate Express").
Etiquetas visibles en todos los campos del formulario.
🚧 Pendiente para la V1
Finalizar remate manualmente.
Marcar ganador.
Bloquear ofertas una vez finalizado.
Revisión completa del flujo como Curadora y como Ofertante.
Publicación en Vercel.
Prueba desde celular.
Compartir el primer enlace público por WhatsApp.
💡 Reservado para V2
Base dinámica (precio variable).
Compartir directamente desde la PWA a WhatsApp.
Generación automática de publicaciones.
Historial de remates finalizados.
Papelera/Archivados.
Roles múltiples de Curadores.
Integración con almacenamiento de imágenes en la nube.

📚 Bitácora – 08/07/2026

✅ Se reemplazó la lógica de activo/inactivo por estados de remate:
- ACTIVO
- FINALIZADO
- ARCHIVADO (preparado)

✅ Se implementó la finalización manual del remate.

✅ Se bloquean las ofertas una vez finalizado.

✅ Se determina automáticamente el ganador por la mejor oferta.

✅ Los teléfonos y datos sensibles sólo son visibles para la Curadora.

✅ La oferta actual quedó sincronizada con Supabase, eliminando la inconsistencia entre la lista de remates y el detalle.

🚧 Próximo paso:
Unificar la representación visual de los estados mediante `estadoRemate.js`, implementar el archivado desde la interfaz y luego migrar el historial completo de ofertas a Supabase.