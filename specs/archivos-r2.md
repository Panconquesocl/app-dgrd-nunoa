# Archivos privados con Cloudflare R2

Implementación en revisión local en `feat/archivos-cloudflare-r2`. Se activan las fotografías y archivos de entregas, Informe ALFA/fotografías/archivos de eventos y evidencia de actividades. Todos son opcionales. No se incorporan importaciones de datos históricos, mapas ni visualizaciones adicionales.

## Límites y permisos

25 MB por archivo (25 × 1024 × 1024 bytes), hasta 20 por grupo y registro. Informe ALFA admite un solo PDF: para reemplazarlo se elimina primero el anterior con confirmación. Las fotografías se verifican por su contenido real y ALFA exige PDF; no basta la extensión o el MIME enviado por el navegador. Archivos y evidencia admiten otros formatos, que se descargan como archivo si no se pueden previsualizar de forma segura.

Los usuarios normales y administradores consultan y gestionan adjuntos de entregas y actividades de cualquier autor. Solo administradores acceden a los de eventos. Cada petición comprueba sesión y permiso del registro, también al descargar o eliminar mediante un id directo. No se entregan claves de objetos ni URLs públicas al cliente.

## Configuración

Mantener privado el bucket: desactivar el dominio público de desarrollo `r2.dev` y no conectar un dominio público al bucket. Crear un token de API R2 limitado a lectura/escritura de objetos de ese bucket. Configurar en `.env` local y en las variables del servidor de producción:

```dotenv
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_CLEANUP_SECRET=""
# Opcional para buckets con endpoint específico de jurisdicción:
# R2_ENDPOINT="https://ACCOUNT_ID.r2.cloudflarestorage.com"
```

`R2_CLEANUP_SECRET` debe ser un token aleatorio largo, independiente de las credenciales R2. Nunca usar `NEXT_PUBLIC_*`, guardar valores privados en `.env.example` ni incluirlos en commits. El SDK usa región `auto`. La configuración es diferida: sin credenciales se puede compilar y consultar registros, pero las cargas responden 503 con un mensaje de configuración pendiente.

Aplicar `pnpm exec prisma migrate deploy` y `pnpm exec prisma generate` antes de ejecutar esta versión. `20261116180000_r2_attachments` extiende `evidence` para un único padre (entrega, evento o actividad), crea los grupos y estados, conserva las evidencias anteriores y añade la cola de borrado. No mueve archivos históricos ni supone que sus claves existan en R2. Los metadatos históricos sin bucket se muestran como no disponibles y bloquean su borrado y el de su padre hasta revisión.

La carga y descarga pasan por el servidor autenticado; no requieren CORS en el bucket. El proxy/reverse proxy del despliegue debe aceptar al menos 26 MiB por petición multipart y permitir el tiempo de subida. No se usa Server Actions ni se carga a través del proxy de páginas de Next. Probar con un archivo cercano al límite después del despliegue.

## API e interfaz

- GET `/api/attachments?resource=deliveries|events|activities&recordId=…`: metadatos autorizados.
- POST en la misma ruta con `kind=photo|file|alfa|evidence`: multipart con un único campo `file`. El servidor limita el cuerpo incluso si falta o es falso Content-Length. Las cargas son secuenciales en la interfaz.
- GET `/api/attachments/[id]/content`: contenido privado; `?download=1` fuerza descarga. Sin caché compartida, con `nosniff` y política de contenido restringida. Solo imágenes de formatos seguros y PDF pueden mostrarse inline.
- DELETE `/api/attachments/[id]`: eliminación individual después de advertencia y previsualización en interfaz.
- DELETE de entrega/actividad agrega `{ attachmentIds: string[] }`; el de evento mantiene `requestIds`/`deliveryIds` y agrega `attachmentIds`. Sin archivos, la lista puede omitirse para compatibilidad. Con archivos debe coincidir exactamente con la lista revisada bajo bloqueo del padre; cambios o cargas pendientes devuelven 409.

Los formularios permiten seleccionar y quitar archivos antes de guardar. Guardan el registro primero y después los archivos; si una carga falla, retienen el id guardado y los pendientes para reintentar sin crear otro registro. Los archivos subidos con éxito ya quedan asociados. Cerrar tras un fallo conserva el registro guardado y sus archivos exitosos; los pendientes locales se pierden al cerrar. Los detalles permiten agregar, previsualizar, descargar y eliminar. Evidencia se activa en el toggle de actividad. Encabezados y botones de formularios siguen fijos y solo los campos se desplazan.

Antes de eliminar un registro, se muestran los archivos que se perderán con acceso a sus previsualizaciones. Borrar un evento conserva solicitudes, entregas y los adjuntos propios de estas entregas. Borrar una actividad conserva su acción estratégica. La auditoría registra actor, nombre, tipo, tamaño y grupo del archivo; no registra contenidos, bucket, clave de objeto ni credenciales.

## Borrado fiable y limpieza periódica

La carga reserva un metadato pendiente bajo bloqueo del padre para respetar límites concurrentes. Al completarse R2, pasa a listo en una transacción auditada. Las reservas vencen a los 15 minutos. Una carga fallida o interrumpida deja su objeto en la cola para limpieza, sin perder la referencia.

Un trigger SQL en el borrado de `evidence`, también durante cascadas, agrega el objeto a `r2_object_deletion` dentro de la misma transacción. Se intenta eliminar de R2 después del commit; fallos temporales conservan el trabajo con reintentos y espera creciente. Los objetos pendientes se difieren cinco minutos para evitar carreras con una subida interrumpida. Al borrar los metadatos dejan de estar accesibles desde la aplicación aunque R2 esté temporalmente caído.

**Configurar en producción un trabajo programado cada cinco minutos** que ejecute POST `/api/attachments/cleanup` con `Authorization: Bearer <R2_CLEANUP_SECRET>`. No basta con desplegar el código: el planificador debe instalarse en el servidor. El endpoint vence reservas y procesa hasta 20 objetos por ejecución; trabajos concurrentes usan bloqueo y reserva temporal para no competir. Devuelve `{ processed, deleted }`; una diferencia indica trabajos que se reintentarán. Supervisar tamaño/antigüedad y `attempts` de la cola. Nunca limpiar la cola manualmente sin verificar los objetos correspondientes.

## Verificación

`pnpm test` incluye validación real de formatos, tamaño y multipart, permisos antes de leer el cuerpo y protección del endpoint de limpieza. `pnpm test:integration`, con TEST_DATABASE_URL aislada, prueba S3 simulado, PostgreSQL, 21 cargas concurrentes para 20 plazas, ALFA único, permisos por padre, auditoría, confirmación desactualizada, cascadas y reintentos tras caída de almacenamiento. No utiliza R2 real en las pruebas automatizadas habituales.

Referencias: [SDK S3 de Cloudflare R2](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/), [compatibilidad S3](https://developers.cloudflare.com/r2/api/s3/api/).

Verificación de esta rama: 68 pruebas generales y 22 pruebas de integración aprobadas; TypeScript, ESLint y formato correctos. Se comprobó además la carga y descarga real contra el bucket configurado, permisos de ambos roles y sin sesión, miniaturas y previsualización PDF, evidencia de actividad, advertencias y borrado individual/en cascada. En navegador: escritorio, 390×844, 320×640 y 390×500, sin errores JavaScript ni desbordamiento de página. Una carga fallida simulada en navegador conservó el evento y el archivo pendiente; al reintentar se actualizó el mismo id sin duplicarlo. Los registros, cuentas y archivos temporales se retiraron tras la revisión. La migración se verificó en PostgreSQL aislado; su aplicación en el entorno de destino y la programación de limpieza forman parte del despliegue.

La compilación final con Turbopack pasó. Un intento intermedio reprodujo el fallo previo e intermitente de `next/font/google` (`queries have exactly one entry`); al repetir la compilación terminó correctamente sin modificar las fuentes.
