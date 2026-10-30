# Insumos — catálogo sin stock

Implementación del catálogo del spike `origin/spike/test-mockup` en `feat/entregas`.
Mantiene la arquitectura `schemas → service → rutas REST → api/queries → components`
y el estilo visual de entregas. No añade existencias, movimientos ni inventario.

## Decisiones confirmadas

- **Identidad: nombre + unidad.** El índice funcional único
  `supply_type_unit_normalized_key` compara `lower(btrim(type))` y
  `lower(btrim(unit))`. Ignora mayúsculas y espacios externos sin alterar cómo se
  presenta el nombre. Se admite el mismo nombre con distintas unidades.
- **Validación de duplicados en dos capas.** El servidor comprueba previamente
  para dar errores por campo; el índice de PostgreSQL evita carreras entre dos
  altas o ediciones. Un conflicto devuelve 409 y `fieldErrors.type`.
- **Unidades fijas:** unidad, par, rollo, corte, kg, litro y caja. Se validan con
  Zod en formulario y servidor. La columna sigue siendo String: la lista puede
  ampliarse sin migrar un enum de PostgreSQL.
- **Insumos en uso:** se permite renombrar con aviso, porque las entregas resuelven
  el nombre desde el catálogo. La unidad se bloquea si hay referencias: no debe
  reinterpretarse una cantidad histórica de kg como cajas.
- **Borrado:** solo si no hay entregas que usen el insumo. La FK `onDelete: Restrict`
  sigue siendo la última defensa; los errores de negocio devuelven 409 con conteo.
- **Concurrencia:** edición y borrado bloquean la fila del insumo con `FOR UPDATE`.
  Las entregas adquieren `FOR SHARE` sobre sus insumos, en orden de id. Así el
  control de referencias no puede quedar obsoleto mientras se cambia la unidad.
- **Permisos:** administradores y usuarios normales pueden gestionar el catálogo de
  cualquier autor. Ver [permisos por rol](./permisos.md).

## Interfaz

- `/insumos`: búsqueda por nombre, tabla con tipo, unidad y número de entregas;
  alta, edición y borrado mediante diálogos.
- `/insumos/[id]`: historial ordenable por fecha, número de entregas y total
  distribuido en la unidad del insumo, con enlaces a cada entrega.
- Estado vacío, carga, error con reintento y confirmaciones de borrado.
- Acceso desde la barra lateral y pestañas de Ayudas primera respuesta.
- Desde el detalle de una entrega, el nombre del insumo lleva a su historial.
- Las mutaciones invalidan las cachés relacionadas: insumos actualiza las
  opciones y datos de entregas; entregas actualiza conteos e historiales de insumos.

## Contrato

```text
GET    /api/supplies?q
POST   /api/supplies
GET    /api/supplies/:id?order=asc|desc
PATCH  /api/supplies/:id
DELETE /api/supplies/:id
```

Alta: `{ type, unit }`. PATCH parcial; el servicio combina los campos con el
registro existente antes de comprobar duplicados. Fechas de salida como ISO.
Identificadores CUID. El historial cuenta entregas, no cantidades: el modelo
permite un único ítem por insumo en cada entrega.

## Migración

`20261014230000_supply_type_unit_unique` solo crea el índice único; no fusiona ni
elimina registros. Antes de aplicarla, se verificó que la base configurada no
contenía duplicados ni unidades fuera de la lista (el catálogo estaba vacío).
En otras bases debe revisarse lo mismo: si hay duplicados, resolverlos con el
responsable de los datos antes de migrar. No se corrigen automáticamente.

El índice funcional se mantiene en SQL y está documentado en `schema.prisma`,
porque Prisma no representa índices de expresión con `@@unique`.

```bash
pnpm prisma migrate deploy
```

## Verificación

```bash
pnpm test:supplies
RUN_SUPPLY_INTEGRATION=1 pnpm test:supplies
RUN_DELIVERY_INTEGRATION=1 pnpm test:deliveries
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Las integraciones usan la base de desarrollo configurada en `.env`, crean sus
propios fixtures y los eliminan al terminar. Cubren el índice real (también
escrituras directas), altas concurrentes, PATCH parcial, historial, agregados,
renombrado, edición de unidad y borrado mientras se registra una entrega.
