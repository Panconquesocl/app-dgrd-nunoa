# Archivos privados con Cloudflare R2

La implementación base quedó integrada mediante PR #45; la carga directa está en revisión local en `feat/carga-directa-r2`. Se activan las fotografías y archivos de entregas, Informe ALFA/fotografías/archivos de eventos y evidencia de actividades. Todos son opcionales. No se incorporan importaciones de datos históricos, mapas ni visualizaciones adicionales.

## Límites y permisos

25 MB por archivo (25 × 1024 × 1024 bytes), hasta 20 por grupo y registro. Informe ALFA admite un solo PDF: para reemplazarlo se elimina primero el anterior con confirmación. Las fotografías se verifican por su contenido real y ALFA exige PDF; no basta la extensión o el MIME enviado por el navegador. Archivos y evidencia admiten otros formatos, que se descargan como archivo si no se pueden previsualizar de forma segura.

Los usuarios normales y administradores consultan y gestionan adjuntos de entregas y actividades de cualquier autor. Solo administradores acceden a los de eventos. Cada petición comprueba sesión y permiso del registro, también al descargar o eliminar mediante un id directo. No se entregan URLs públicas ni credenciales privadas al cliente. La URL firmada solo autoriza escribir el objeto temporal específico durante cinco minutos; la clave del archivo definitivo permanece en el servidor.

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

La carga del binario va directamente del navegador a R2 mediante PUT firmado, para evitar el límite de 4,5 MB de peticiones de Vercel Functions. El servidor recibe únicamente JSON de hasta 4 KB y valida el archivo descargándolo desde R2 antes de publicarlo. La descarga y previsualización siguen pasando por el endpoint autenticado con una respuesta en streaming. Este flujo funciona también en un VPS.

### CORS del bucket

En Cloudflare → R2 → bucket → Settings → CORS Policy, agregar esta regla conservando otras necesarias:

```json
[
  {
    "AllowedOrigins": ["https://app-dgrd-nunoa.vercel.app", "http://localhost:3000", "http://localhost:3102"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Los orígenes no llevan `/` final. CORS permite al navegador usar la URL firmada; el bucket sigue siendo privado. No usar un comodín para todos los dominios de Vercel. Las previews con otro dominio requieren autorizar ese origen explícitamente. Las credenciales limitadas a objetos pueden no permitir modificar CORS: en ese caso se configura desde el panel, sin ampliar permisos de las credenciales de la aplicación.

La migración adicional `20261117090000_direct_r2_uploads` agrega un token y vencimiento de reserva para serializar la validación de una misma carga. No modifica archivos ya guardados. Regenerar Prisma y aplicar las migraciones antes de ejecutar esta versión.

## API e interfaz

- GET `/api/attachments?resource=deliveries|events|activities&recordId=…`: metadatos autorizados.
- POST en la misma ruta con `kind=photo|file|alfa|evidence`: JSON `{ name, size }`, limitado a 4 KB incluso sin Content-Length o con valor falso. Reserva una plaza y devuelve `{ id, uploadUrl, headers, expiresAt }`, sin caché.
- El navegador hace PUT a `uploadUrl` con el archivo y las cabeceras indicadas, sin cookies. La firma vincula Content-Type y Content-Length y vence a los cinco minutos.
- POST `/api/attachments/[id]/complete`: solo quien inició la carga y conserve permiso de edición puede confirmar. Descarga el temporal desde R2 con límite real de bytes, comprueba tamaño y tipo, lo copia a una clave definitiva diferente con condición de ETag y registra el adjunto listo en una transacción auditada. La confirmación repetida de un id listo devuelve éxito sin copiar otra vez.
- DELETE `/api/attachments/[id]/upload`: cancela una carga pendiente del mismo usuario; si ya quedó lista no elimina el archivo. El cliente la invoca cuando falla la carga. Las transferencias siguen siendo secuenciales.
- GET `/api/attachments/[id]/content`: contenido privado; `?download=1` fuerza descarga. Sin caché compartida, con `nosniff` y política de contenido restringida. Solo imágenes de formatos seguros y PDF pueden mostrarse inline.
- DELETE `/api/attachments/[id]`: eliminación individual después de advertencia y previsualización en interfaz.
- DELETE de entrega/actividad agrega `{ attachmentIds: string[] }`; el de evento mantiene `requestIds`/`deliveryIds` y agrega `attachmentIds`. Sin archivos, la lista puede omitirse para compatibilidad. Con archivos debe coincidir exactamente con la lista revisada bajo bloqueo del padre; cambios o cargas pendientes devuelven 409.

Los formularios permiten seleccionar y quitar archivos antes de guardar. Guardan el registro primero y después los archivos; si una carga falla, retienen el id guardado y los pendientes para reintentar sin crear otro registro. Los archivos subidos con éxito ya quedan asociados. Cerrar tras un fallo conserva el registro guardado y sus archivos exitosos; los pendientes locales se pierden al cerrar. Los detalles permiten agregar, previsualizar, descargar y eliminar. Evidencia se activa en el toggle de actividad. Encabezados y botones de formularios siguen fijos y solo los campos se desplazan.

Antes de eliminar un registro, se muestran los archivos que se perderán con acceso a sus previsualizaciones. Borrar un evento conserva solicitudes, entregas y los adjuntos propios de estas entregas. Borrar una actividad conserva su acción estratégica. La auditoría registra actor, nombre, tipo, tamaño y grupo del archivo; no registra contenidos, bucket, clave de objeto ni credenciales.

## Borrado fiable y limpieza periódica

La carga reserva un metadato pendiente bajo bloqueo del padre para respetar límites concurrentes. Las reservas vencen a los 15 minutos. La confirmación usa una reserva exclusiva de cinco minutos para impedir validaciones simultáneas; no mantiene una transacción abierta durante llamadas a R2. Los fallos de tipo/tamaño no publican el archivo y liberan su plaza.

Los temporales usan el prefijo `staging/` y se encolan desde el inicio para borrarse a los 20 minutos, tanto si se confirma la carga como si se interrumpe. No se eliminan antes porque la URL PUT puede reutilizarse mientras no expire. El archivo definitivo nunca recibe una URL de escritura. La copia condicional evita publicar un objeto que haya cambiado después de validarlo. Se recomienda además una regla de ciclo de vida del bucket que expire exclusivamente `staging/` después de un día para recoger transferencias extraordinariamente tardías. No aplicar esa regla a las claves definitivas.

Un trigger SQL en el borrado de `evidence`, también durante cascadas, agrega el objeto a `r2_object_deletion` dentro de la misma transacción. Se intenta eliminar de R2 después del commit; fallos temporales conservan el trabajo con reintentos y espera creciente. Los objetos pendientes se difieren cinco minutos para evitar carreras con una subida interrumpida. Al borrar los metadatos dejan de estar accesibles desde la aplicación aunque R2 esté temporalmente caído.

**Pendiente de despliegue: configurar en producción un trabajo programado cada cinco minutos** que ejecute POST `/api/attachments/cleanup` con `Authorization: Bearer <R2_CLEANUP_SECRET>`. No basta con desplegar el código: el planificador debe instalarse en el servidor. El endpoint vence reservas y procesa hasta 20 objetos por ejecución; trabajos concurrentes usan bloqueo y reserva temporal para no competir. Devuelve `{ processed, deleted }`; una diferencia indica trabajos que se reintentarán. Supervisar tamaño/antigüedad y `attempts` de la cola. Nunca limpiar la cola manualmente sin verificar los objetos correspondientes.

## Verificación

`pnpm test` incluye validación real de formatos, tamaño y JSON de control, permisos antes de leer el cuerpo y protección del endpoint de limpieza. `pnpm test:integration`, con TEST_DATABASE_URL aislada, prueba S3 simulado, PostgreSQL, 21 cargas concurrentes para 20 plazas, reutilización de URL sin sobrescribir archivos listos, confirmación idempotente, ALFA único, permisos por padre, auditoría, confirmación desactualizada, cascadas y reintentos tras caída de almacenamiento. No utiliza R2 real en las pruebas automatizadas habituales.

Referencias: [SDK S3 de Cloudflare R2](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/), [compatibilidad S3](https://developers.cloudflare.com/r2/api/s3/api/).

Verificación de esta rama: 68 pruebas generales y 22 pruebas de integración aprobadas; TypeScript, ESLint y formato correctos. Se comprobó además la carga y descarga real contra el bucket configurado, permisos de ambos roles y sin sesión, miniaturas y previsualización PDF, evidencia de actividad, advertencias y borrado individual/en cascada. En navegador: escritorio, 390×844, 320×640 y 390×500, sin errores JavaScript ni desbordamiento de página. Una carga fallida simulada en navegador conservó el evento y el archivo pendiente; al reintentar se actualizó el mismo id sin duplicarlo. Los registros, cuentas y archivos temporales se retiraron tras la revisión. La migración se verificó en PostgreSQL aislado; su aplicación en el entorno de destino y la programación de limpieza forman parte del despliegue.

La compilación final con Turbopack pasó. Un intento intermedio reprodujo el fallo previo e intermitente de `next/font/google` (`queries have exactly one entry`); al repetir la compilación terminó correctamente sin modificar las fuentes.

## Adaptación a Vercel y estado operativo

La carga directa está integrada en PR #47. La programación de limpieza en Vercel sigue pospuesta por decisión del usuario; el endpoint POST existente permanece disponible para un programador externo o el futuro VPS. Mientras no se programe, los temporales y los borrados fallidos permanecerán en la cola hasta ejecutar la limpieza. No se añade un cron de Vercel ni se asume un plan Hobby o Pro.

Referencias de la adaptación: [URLs firmadas R2](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [CORS de R2](https://developers.cloudflare.com/r2/buckets/cors/) y [límites de Vercel Functions](https://vercel.com/docs/functions/limitations).

Verificación de la carga directa (17 de noviembre): 69 pruebas generales y 22 de integración aprobadas, además de build con Turbopack. Desde Brave con origen localhost autorizado se subió un archivo real de 25 MB a R2; el JSON enviado a la aplicación pesó menos de 4 KB y la descarga coincidió en SHA-256. Reutilizar la URL PUT para otro contenido mantuvo intacto el archivo definitivo. Se comprobó rechazo de imagen falsa, confirmación idempotente, permisos de ambos roles, carga/previsualización móvil y ausencia de errores JavaScript. La configuración CORS del bucket se verificó mediante esa subida real; las credenciales de objetos no permiten consultar o modificar la política. Los objetos, registros y cuentas de revisión se retiraron después de probar.

La recuperación de un PUT fallido también se probó en navegador: libera la reserva, conserva la selección local y permite guardar el mismo evento al reintentar. En edición se mantiene el tipo seleccionado aunque sus opciones terminen de cargarse después de abrir el modal.

## Selector de archivos en español

Integrado en PR #49. Los controles compartidos de entregas, eventos y evidencia de actividades usan el área de carga del spike: borde discontinuo, fondo suave, icono de carga, hover amarillo y mensajes en español. El input nativo queda oculto para evitar «Choose Files» y «No file chosen», que dependen del idioma del navegador.

Se pueden elegir archivos por clic o teclado y arrastrarlos al área. Selección y arrastre aplican el mismo límite de 25 MB, hasta 20 por grupo y un solo PDF ALFA. Los grupos de imágenes/PDF filtran formatos en el selector como ayuda de interfaz; el servidor sigue comprobando el contenido real. El área queda desactivada mientras se guarda o al alcanzar el límite. Se conserva la lista de seleccionados, quitar archivos y la posibilidad de volver a seleccionar el mismo archivo. No cambia el flujo de R2, permisos, API ni base de datos.

Validación del selector: 69 pruebas generales, TypeScript, ESLint, formato y build con Turbopack aprobados. En navegador con idioma inglés se verificaron los textos españoles, clic/Enter/Espacio, arrastre y estado hover, quitar/reseleccionar, rechazo de formato y tamaño, máximo de 20 archivos y PDF ALFA único, y bloqueo dentro de fieldset desactivado. Entregas, Eventos y Actividades se revisaron en 1440×1000, 390×844, 320×640 y 390×500: áreas de carga alcanzables por scroll y pie fijo, sin desbordamiento de página ni errores JavaScript. No requiere migración ni cambios en R2.
