# Solicitudes

## Alcance de esta feature

Implementada desde `main`, tomando únicamente `spike/test-mockup` como referencia funcional. Se mantiene la arquitectura REST, TanStack Query y permisos actuales: solo administradores gestionan solicitudes.

- Descripción opcional de lo solicitado, hasta 2000 caracteres. Visible en formulario y detalle; incluida en la búsqueda. Un texto vacío se guarda como `null`; PATCH conserva campos omitidos.
- Una solicitud con entrega vinculada no puede eliminarse. El servicio responde 409 y la clave foránea utiliza `ON DELETE RESTRICT`. La interfaz explica el bloqueo y deshabilita la confirmación.
- Al crear o editar una solicitud, el estado Atendida requiere respuesta no vacía o entrega vinculada. La validación usa el estado final de la edición parcial. Una entrega no cambia automáticamente el estado de la solicitud.
- Folios anuales `SOL-AAAA-NNN`, con año de America/Santiago y contador persistente. Borrar solicitudes no libera números. La reserva y el alta se confirman en la misma transacción; un alta fallida no consume folio.
- Se conserva una entrega como máximo por solicitud y la propagación transaccional del evento hacia esa entrega.
- Desde el detalle (página o panel lateral), «Registrar entrega» abre el formulario habitual con la solicitud fija y el evento heredado. Solo aparece si no existe entrega y el usuario tiene permiso para crearla. Cancelar conserva el detalle abierto; guardar refresca el vínculo sin cambiar automáticamente el estado. Los datos del beneficiario y los insumos se completan manualmente.
- Si la solicitud deja de estar disponible o ya tiene una entrega, el formulario contextual bloquea el registro. El servicio también rechaza duplicados concurrentes; ante un conflicto se actualizan las solicitudes y las opciones del formulario.

## Migración

`20261115160000_request_rules` agrega `description`, sustituye el borrado en cascada por Restrict y crea `request_folio_counter`. Inicializa cada año con el mayor sufijo numérico existente e ignora folios legados no correlativos. No modifica estados ni respuestas históricos.

Los folios borrados antes de aplicar la migración no se pueden reconstruir a partir de los registros actuales. La garantía de no reutilización comienza desde el máximo existente al migrar. Las importaciones futuras deben preservar también el contador.

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

Aplicar en un entorno de revisión antes de producción. No se requiere reset ni borrado de datos.

## API

| Método | Ruta                    | Comportamiento                                                                                                     |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/requests`         | Filtros `q` (folio, medio, descripción, respuesta), `event`, `status`.                                             |
| POST   | `/api/requests`         | Alta; asigna folio, fecha y autor.                                                                                 |
| GET    | `/api/requests/[id]`    | Detalle con autor, evento y entrega vinculada.                                                                     |
| PATCH  | `/api/requests/[id]`    | Edición parcial y validación del estado resultante.                                                                |
| DELETE | `/api/requests/[id]`    | 409 si tiene entrega. Conserva `expectedDeliveryId` para detectar vistas desactualizadas; nunca autoriza cascadas. |
| GET    | `/api/requests/options` | Eventos disponibles para el selector.                                                                              |

Edición y borrado bloquean la solicitud con `FOR UPDATE`, igual que el alta de una entrega vinculada. Los folios se serializan por año y el contador persiste aunque no queden solicitudes.

La condición de Atendida se comprueba al guardar la solicitud. Esta feature no agrega cambios automáticos de estado ni nuevas restricciones al borrado o desvinculación de entregas desde su propio módulo.

## Verificación manual

1. Crear una solicitud sin descripción; editarla, agregar descripción y buscarla por ese texto.
2. Intentar guardar Atendida sin respuesta ni entrega: debe mostrar error. Agregar respuesta y guardar: debe permitirlo.
3. Vincular una entrega a una solicitud Pendiente: debe seguir Pendiente. Marcarla Atendida sin respuesta: debe permitirlo.
4. Intentar borrar esa solicitud: debe bloquearlo y conservar entrega e insumos.
5. Crear una solicitud sin entrega, borrarla y crear otra: el folio debe avanzar.
6. Repetir formulario y diálogo en móvil; comprobar acceso restringido al usuario normal.

## Pruebas

`pnpm test:requests` ejecuta validaciones; la integración requiere `RUN_REQUEST_INTEGRATION=1` y una `DATABASE_URL` de pruebas aislada con las migraciones aplicadas. Nunca usar una base operativa.
