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
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — para PostgreSQL y el bucket S3 local (MinIO)

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

El servicio `postgres` de Docker crea la base y aplica automáticamente el schema y
las funciones al inicializar un volumen nuevo (no hay migraciones; `db/schema.sql`
y `db/procedures.sql` son la fuente de verdad):

```bash
docker compose up -d
bun run db:init
```

`db:init` espera a que PostgreSQL acepte conexiones y aplica `db/schema.sql` y
`db/procedures.sql` en ese orden.

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

Este mismo bucket también guarda el catálogo de ilustraciones predefinidas que el
admin puede elegir para preguntas e instrucciones de sección (ver
`src/components/SelectorImagen.tsx`). Subilas una sola vez:

```bash
bun run seed:imagenes
```

Sube todo `src/assets/form_emociones/**` (instrucciones + preguntas) al bucket bajo
`assets/instrucciones/` y `assets/preguntas/` — planas, sin subcarpeta por set. Es
seguro correrlo de nuevo si se agregan imágenes.

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

## Pruebas de carga (k6)

Simulan el requisito de "hasta 500 alumnos respondiendo a la vez" con dos escenarios
distintos — miden cosas diferentes, correr los dos:

- **`k6/pico.js`** — 500 clicks simultáneos (todos los alumnos tocando "Siguiente" en
  el mismo instante). Mide si el sistema aguanta una ráfaga.
- **`k6/sostenido.js`** — 500 alumnos independientes navegando a ritmos random durante
  ~10 minutos (arranque escalonado, pausas de 20-60s entre pregunta y pregunta). Mide
  fugas de conexiones/memoria y si el autovacuum de Postgres da abasto con volumen
  sostenido — cosas que un pico de segundos no llega a mostrar.

Instalar k6 (una vez): `winget install GrafanaLabs.k6` (o `choco install k6`).

```bash
bun run seed:carga     # crea "Colegio Carga" + 500 estudiantes + sesiones iniciadas
k6 run k6/pico.js      # repetible sin volver a sembrar
k6 run k6/sostenido.js # completa las sesiones — volver a correr seed:carga antes de repetir
```

Contra Railway ya deployado, en vez de local: `k6 run -e BASE_URL=https://tu-app.up.railway.app k6/pico.js`.

**Hallazgo real de la primera corrida (Windows, local):** el pico de 500 conexiones
simultáneas tuvo una tasa de error variable entre corridas (5%-47%) por conexiones TCP
rechazadas por el sistema operativo antes de llegar a la app — no por Postgres ni por
el pool de conexiones (las que sí conectaron respondieron en 45-180ms, rápido). Esto
huele a comportamiento de la cola de aceptación TCP de Windows ante una ráfaga
instantánea, no necesariamente algo que reproduzca igual en el contenedor Linux de
Railway — hay que volver a correr `k6/pico.js` contra Railway ya deployado para
confirmar si el problema persiste ahí o era específico de este entorno de desarrollo.

## Chequeo de tipos (manual, no hay script de lint)

```bash
bunx -p typescript@5.7 tsc --noEmit -p tsconfig.json
```

Usar explícitamente la versión 5.7 — la que resuelve `bunx tsc` por defecto en algunos
entornos es una preview (TS 7) que rechaza `baseUrl` en `tsconfig.json`.

## Más contexto

Ver [CLAUDE.md](CLAUDE.md) para la arquitectura completa (routing, acceso a datos,
lógica en la BD, modelo de dominio, gotchas conocidos).
