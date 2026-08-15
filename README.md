# PSYEVA

Plataforma para que colegios apliquen evaluaciones psicológicas (emociones / bienestar
psicológico / aprendizaje) a grupos de estudiantes. Un **admin** configura colegios,
evaluaciones, grupos y encuestas desde un dashboard; un **facilitador** (sin cuenta
real, solo con un link o una clave) aplica las encuestas en campo y consulta reportes
ya publicados.

Stack: **Bun** (runtime + bundler + test runner) + **React 19** + **react-router-dom v7**
+ **Tailwind v4** + **PostgreSQL** + **ExcelJS** (import/export `.xlsx`) + almacenamiento
de PDFs en un bucket **S3-compatible** (MinIO en local, bucket de Railway en producción).

## Requisitos

- [Bun](https://bun.com) ≥ 1.3
- PostgreSQL corriendo localmente (no lo levanta `bun dev`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — para el bucket S3 local (MinIO)

## 1. Instalar dependencias

```bash
bun install
```

## 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Los valores por defecto de `.env.example` ya están pensados para correr todo
localmente (Postgres `psyeva1` / `postgres` / `admin`, y el MinIO del paso 4).
Ajustalos solo si tu Postgres local tiene otro usuario/puerto.

## 3. Base de datos

Postgres corre aparte — hay que crear la base y aplicar el schema a mano (no hay
migraciones, `db/schema.sql` y `db/procedures.sql` son la fuente de verdad):

```bash
createdb -U postgres psyeva1
psql -U postgres -d psyeva1 -f db/schema.sql
psql -U postgres -d psyeva1 -f db/procedures.sql
```

Para tener datos de prueba (colegios, evaluaciones, grupos, estudiantes, reportes de
ejemplo con IDs fijos — ver `tests/factories.ts`):

```bash
psql -U postgres -d psyeva1 -f db/reset-and-seed.sql
```

Ese mismo script es el que usan los tests para resetear la base entre cada test; podés
volver a correrlo en cualquier momento para dejar la BD en un estado limpio conocido.

## 4. Storage: bucket S3 local (MinIO)

```bash
docker compose up -d
```

Esto levanta MinIO y crea automáticamente el bucket `psyeva-reportes` en modo público
de lectura (no hay que tocar la consola de MinIO a mano). Para confirmar que quedó
listo:

```bash
docker compose logs init
```

Deberías ver `Bucket listo: psyeva-reportes (lectura pública)` al final. Consola web
de MinIO (opcional, para inspeccionar archivos subidos): http://localhost:9001
(`minioadmin` / `minioadmin`).

En producción (Railway) no se usa este `docker-compose.yml` — se reemplazan las
variables `S3_*` de `.env` por las del bucket S3-compatible de Railway; el código
(`src/services/storageService.ts`) no cambia.

## 5. Correr el servidor

```bash
bun dev
```

Abre http://localhost:3000 — dashboard admin en `/admin/evaluaciones`, `/admin/colegios`,
etc. `bun dev` corre con hot reload; `bun start` corre en modo producción
(`NODE_ENV=production`, sin HMR).

## 6. Probar que todo el flujo funciona (Postgres + bucket)

Con el seed del paso 3 cargado, subí un PDF de prueba a un reporte real vía `curl`
(usa el mismo endpoint que usa el dashboard admin):

```bash
curl -X POST http://localhost:3000/api/admin/reportes \
  -F "archivo=@ruta/a/un/archivo.pdf" \
  -F "tipo=general" \
  -F "evaluacionId=dddddddd-dddd-dddd-dddd-dddddddddddd"
```

La respuesta trae `archivoUrl` apuntando directo al bucket
(`http://localhost:9000/psyeva-reportes/reportes/...`) — abrila en el navegador y
debería descargar el PDF real, sin pasar por la propia app.

## Tests

```bash
bun test                                        # suite completa
bun test tests/admin/reportes.test.ts           # un archivo
bun test tests/admin/reportes.test.ts -t "201"  # un test por nombre (regex sobre el título)
```

Los tests corren contra la misma Postgres y el mismo bucket de MinIO configurados en
`.env` (no hay entornos de test separados) — necesitás los pasos 3 y 4 hechos antes de
correrlos. Cada archivo resetea la BD a un estado conocido en `beforeEach`.

## Chequeo de tipos (manual, no hay script de lint)

```bash
bunx -p typescript@5.7 tsc --noEmit -p tsconfig.json
```

Usar explícitamente la versión 5.7 — la que resuelve `bunx tsc` por defecto en algunos
entornos es una preview (TS 7) que rechaza `baseUrl` en `tsconfig.json`.

## Más contexto

Ver [CLAUDE.md](CLAUDE.md) para la arquitectura completa (routing, acceso a datos,
lógica en la BD, modelo de dominio, gotchas conocidos).
