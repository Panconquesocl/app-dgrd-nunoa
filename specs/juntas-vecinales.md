# Juntas vecinales

Catálogo normalizado `NeighborhoodAssociation` (`neighborhood_association`) con
CRUD, historial de entregas y asociación obligatoria desde `Delivery`.

## Modelo y decisiones

- `id`: CUID estable. Todas las relaciones y métricas usan este identificador.
- `number`: entero positivo único, con índice único y CHECK de PostgreSQL.
- `name`: nombre visible, obligatorio, máximo 200 caracteres. No es único: dos
  juntas pueden compartir nombre si tienen distinto número.
- `active`: disponibilidad para nuevas entregas, por defecto true.
- Timestamps y autoría (`createdBy`) con el patrón del resto del dominio.
- Dirección y otros atributos se pueden incorporar con futuras migraciones.

Se pueden corregir número y nombre sin perder asociaciones: el historial resuelve
la etiqueta actual desde el catálogo. El formulario avisa si existen entregas.

La eliminación física solo se permite si no hay entregas. La FK
`Delivery.neighborhoodAssociation` usa `onDelete: Restrict`. Para retirar una junta
con historial se desactiva; no se eliminan ni desvinculan sus entregas.

Una junta inactiva no puede usarse en altas ni en reasignaciones. Al editar una
entrega existente se permite conservar su propia junta inactiva, incluso si el
formulario vuelve a enviar el mismo id. Un PATCH sin esa propiedad también
conserva la asociación. El servidor verifica estas reglas con un bloqueo
`FOR SHARE`; edición, desactivación y borrado usan `FOR UPDATE`.

## Asociación con entregas

Se reemplaza `Delivery.jv String` por:

```prisma
neighborhoodAssociationId String
neighborhoodAssociation NeighborhoodAssociation @relation(
  fields: [neighborhoodAssociationId], references: [id], onDelete: Restrict
)
```

- La columna tiene un índice para filtros y relaciones.
- El formulario usa un selector con número y nombre. Las juntas inactivas solo
  aparecen si son la asociación original de la entrega editada.
- El listado permite filtrar por `neighborhoodAssociationId`, incluyendo juntas
  inactivas para consultar su historial.
- La búsqueda libre también consulta el nombre y, si se escribe un entero, el
  número de junta.
- El indicador de juntas distintas cuenta ids, no etiquetas.
- Los DTOs devuelven el id y `{ id, number, name, active }` de la junta.
- Mutaciones de entregas invalidan historiales/conteos de juntas. Mutaciones de
  juntas invalidan opciones y datos de entregas.

## Interfaz y contrato

- `/juntas-vecinales`: listado, búsqueda por número/nombre, filtro de estado,
  creación, edición y borrado.
- `/juntas-vecinales/[id]`: entregas asociadas ordenables por fecha, conteo y
  unidades distribuidas, con enlaces a cada entrega.
- Navegación en barra lateral y pestañas de Ayudas primera respuesta.
- Enlaces desde el listado y el detalle de entregas hacia la junta.

```text
GET    /api/neighborhood-associations?q&status=all|active|inactive
POST   /api/neighborhood-associations
GET    /api/neighborhood-associations/:id?order=asc|desc
PATCH  /api/neighborhood-associations/:id
DELETE /api/neighborhood-associations/:id
```

Alta: `{ number, name, active }`. PATCH parcial. Sesión obligatoria; permisos
iguales a los otros módulos. Errores mediante `AppError`, con 409 por número
repetido o borrado de una junta en uso. Fechas de salida ISO.

## Migración

`20261015000000_neighborhood_associations` crea tabla, índice único, restricciones
y FK de entregas, y sustituye `jv` por la referencia obligatoria.

Se verificó que la base de desarrollo configurada no tenía entregas antes de
aplicarla. No se inventan números ni se cargan nombres de juntas de ejemplo.

**Bases con entregas existentes:** la migración aborta explícitamente antes de
modificar datos. Se debe preparar un mapeo revisado entre cada valor antiguo
`jv` y el número/nombre oficial de la junta, y adaptar el backfill antes de
migrar esa base. No se permite deducir números o fusionar juntas automáticamente
por texto parecido. La migración completa es transaccional.

## Verificación

```bash
pnpm prisma migrate deploy
pnpm prisma generate
pnpm test:associations
RUN_ASSOCIATION_INTEGRATION=1 pnpm test:associations
RUN_DELIVERY_INTEGRATION=1 pnpm test:deliveries
RUN_SUPPLY_INTEGRATION=1 pnpm test:supplies
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Las integraciones cubren CRUD, números repetidos y altas concurrentes, historial,
filtros por identidad, juntas inactivas, preservación de asociaciones al corregir
etiquetas y FK de borrado. Se prueba la protección de datos legados ejecutando la
migración contra una tabla temporal en una conexión aislada, sin modificar tablas
públicas. Los fixtures de negocio se eliminan al terminar.
