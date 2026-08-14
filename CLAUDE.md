# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

PSYEVA: plataforma para que colegios apliquen evaluaciones psicológicas (emociones / bienestar psicológico / aprendizaje) a grupos de estudiantes. Un **admin** configura colegios, evaluaciones, grupos y encuestas desde un dashboard; un **facilitador** (sin cuenta real, solo con un link o una clave) aplica las encuestas en campo y consulta reportes ya publicados.

Stack: **Bun** como runtime + bundler + test runner (no hay Express, Vite, ni Jest) + **React 19** + **react-router-dom v7** + **Tailwind v4** (vía `bun-plugin-tailwind`) + **PostgreSQL** (driver `postgres`) + **ExcelJS** para import/export de `.xlsx`.

## Comandos

```bash
bun install       # instalar dependencias
bun dev           # servidor de desarrollo con HMR (src/index.ts, puerto 3000 por defecto)
bun start         # modo producción (NODE_ENV=production)
bun run build     # build vía build.ts
bun test          # suite completa (bun:test)
bun test tests/admin/colegios.test.ts          # un archivo
bun test tests/admin/colegios.test.ts -t "200"  # un test por nombre (-t es regex sobre el título)
```

No hay lint/typecheck configurado como script. Para chequear tipos manualmente: `bunx -p typescript@5.7 tsc --noEmit -p tsconfig.json` — usar explícitamente la versión 5.7, la que resuelve `bunx tsc` por defecto en este entorno es una preview (TS 7) que rechaza `baseUrl` en `tsconfig.json` y no sirve.

### Base de datos

Postgres corre aparte (no lo levanta `bun dev`). Config en `.env` (`DB_HOST`, `DB_PORT`, `DB_NAME=psyeva1`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`), con defaults `localhost:5432/psyeva1` `postgres/admin` en `src/db.ts` si `.env` falta algo.

- `db/schema.sql` — tablas, enums, índices.
- `db/procedures.sql` — views (`vista_progreso_evaluacion`, `vista_progreso_grupo`, `vista_estado_alumno`) y funciones plpgsql (`iniciar_sesion`, `guardar_respuesta`, `completar_sesion`).
- `db/mock-data.sql` / `db/reset-and-seed.sql` — mismo dataset de prueba; `reset-and-seed.sql` es el que usan los tests y los scripts de reseteo manual (trunca todo con `RESTART IDENTITY CASCADE` y vuelve a insertar). IDs fijos con UUIDs legibles (`11111111-...`, `cccccccc-...`, etc.) — ver `tests/factories.ts` (objeto `mock`) para el mapa completo.

Para aplicar el schema desde cero: correr `schema.sql` y luego `procedures.sql` contra la BD (`psql` o el cliente que uses). No hay migraciones — cualquier cambio de schema se edita a mano en ambos archivos y se reaplica.

## Arquitectura

### Un solo proceso Bun sirve todo

`src/index.ts` llama `Bun.serve({ routes: {...} })`: un objeto literal donde cada key es un path (con `:param`) y el valor es o bien `index.html` (el catch-all `"/*"` que sirve el SPA) o un objeto `{ GET, POST, PATCH, DELETE }` con los handlers. No hay Express ni router aparte — Bun resuelve el matching de rutas nativamente.

**Gotcha de routing:** rutas literales y rutas con `:param` en la misma profundidad de segmentos pueden chocar (p. ej. `/api/admin/grupos/:id` vs. una hipotética `/api/admin/grupos/plantilla`). Por eso rutas "especiales" como la plantilla de import de estudiantes viven en un namespace sin colisión: `/api/admin/plantillas/estudiantes` (3 segmentos fijos, sin ningún `:id` sibling a esa profundidad). Al agregar una ruta nueva, revisar que no comparta profundidad+posición con un `:param` ya registrado para el mismo método HTTP.

Cada archivo de ruta vive en `src/routes/admin/*.ts` o `src/routes/facilitador/*.ts`, se re-exporta desde `src/routes/index.ts`, y se registra a mano en la tabla de `src/index.ts`. Agregar un endpoint siempre son 3 pasos: crear el archivo, exportarlo en `routes/index.ts`, registrar el path en `index.ts`.

`src/routes/admin/reportesPublicar.ts` es código muerto — usa columnas (`reporte.publicado`, `reporte.analisis_id`) que no existen en el schema actual y no está registrado en ningún router. No usarlo como referencia.

### Acceso a datos: postgres.js con transform camelCase

`src/db.ts` exporta una única instancia `sql` (pool con `max: 10`). Todos los routes hacen `import sql from "../../db"` y usan template tags: `` sql`SELECT ... WHERE id = ${id}` ``.

**Gotcha crítico ya resuelto pero fácil de reintroducir:** el driver está configurado con `transform: { column: postgres.camel.column }` (nota el `.column` extra) para convertir snake_case↔camelCase automáticamente. `postgres.camel` por sí solo (sin el `.column`) es un objeto con forma distinta y, si se usa directo, la conversión queda silenciosamente rota (las queries devuelven `nombre_completo` en vez de `nombreCompleto`, sin ningún error). Si algo empieza a devolver snake_case, revisar esta línea primero.

Los conteos (`COUNT(*)`) vuelven como **string**, no `number` (bigint de Postgres) — por eso los tipos en `utils/types.ts` para las vistas (`totalAlumnos`, `sesionesCompletadas`, etc.) son `string`, y el frontend hace `Number(...)` al usarlos.

### Lógica de negocio en la BD, no en JS

Tres operaciones con condiciones de carrera reales (cientos de alumnos respondiendo simultáneamente) están implementadas como funciones `plpgsql` en `db/procedures.sql`, no en TypeScript:

- `iniciar_sesion(estudiante, formulario, evaluacion)` — crea o retoma una sesión, valida que la evaluación acepte respuestas.
- `guardar_respuesta(sesion, pregunta, texto)` — upsert de una respuesta + pasa la sesión a `en_progreso`.
- `completar_sesion(sesion)` — valida que todas las preguntas del formulario tengan respuesta antes de marcar `completada`.

Los routes en `src/routes/facilitador/sesiones.ts` solo llaman `` sql`SELECT * FROM iniciar_sesion(...)` `` y traducen las excepciones (`RAISE EXCEPTION 'sesion_ya_completada'`, etc.) a status codes HTTP. Al cambiar esta lógica, el cambio va en `procedures.sql`, no en el route.

También hay 3 views (`vista_progreso_evaluacion`, `vista_progreso_grupo`, `vista_estado_alumno`) que calculan KPIs agregados (sesiones completadas, estado por categoría, etc.) — se usan tal cual desde varios endpoints admin y facilitador en vez de repetir los mismos `JOIN`/`COUNT` en JS.

**Gap conocido, no arreglado:** `vista_estado_alumno.todo_completado` usa `BOOL_AND(s.estado = 'completada')` sobre las sesiones que *existen*, no sobre las 3 categorías esperadas — un alumno con una sola sesión completada y ninguna otra iniciada da `todo_completado = true` aunque le falten 2 encuestas.

### Frontend: una sola capa de acceso a la API

`src/services/databaseService.ts` es el **único** lugar del frontend que debe hacer `fetch()`. Expone una instancia `databaseService` con dos namespaces, `admin` y `facilitador`, cada método tipado contra `src/utils/types.ts`. Maneja automáticamente:

- El header `X-Colegio-Id` en las llamadas de `facilitador.*` (se guarda en `localStorage` tras `facilitador.verificar()` o `facilitador.entrarPorEvaluacion()`).
- Parseo de la respuesta (`{ data, mensaje? }` en éxito, `{ error, ... }` en fallo → se lanza `ApiError` con `.status` y `.detalle`).
- Descargas de archivo (`exportarEvaluacion`, `descargarPlantillaEstudiantes`) devuelven `{ blob, filename }` en vez de pasar por el parseo JSON normal.

`src/utils/types.ts` son los tipos de dominio en **camelCase** (lo que realmente devuelve la API), no un espejo 1:1 del schema snake_case. Incluye tanto las filas base (`Colegio`, `Evaluacion`, `Grupo`, ...) como las formas "con progreso"/"con contexto" que arma cada vista SQL (`EvaluacionConProgreso`, `GrupoConProgreso`, `EstudianteConEstado`, `ReporteConContexto`).

### Modelo de dominio

```
colegio ──< evaluacion ──< grupo ──< estudiante ──< sesion ──< respuesta
                              │                        │
formulario ──< pregunta ──────┘             (sesion.formulario_id)
```

- Un **colegio** tiene una `clave_acceso` única (la usa el facilitador para autenticarse en ciertos flujos).
- Una **evaluacion** pertenece a un colegio; dos flags controlan su ciclo de vida: `acepta_respuestas` (¿los alumnos pueden responder ahora?) y `reportes_publicados` (¿el facilitador ya puede ver/descargar reportes?). Un endpoint (`PATCH /api/admin/evaluaciones/:id/estado`) bloquea publicar reportes mientras `acepta_respuestas` siga en `true`.
- Un **grupo** pertenece a una evaluación (no al colegio directamente — así el mismo colegio puede tener grupos distintos por semestre) y tiene hasta 3 `formulario` asignados, uno por categoría (`form_emociones_id`, `form_bienpsic_id`, `form_aprendizaje_id`).
- Un **formulario** es un catálogo de `pregunta`s con `opciones_respuesta` (JSONB: `[{ valor, texto }]`).
- Una **sesion** es el intento de un estudiante respondiendo un formulario completo; una **respuesta** es su respuesta a una pregunta puntual (el texto se copia del JSONB al momento de responder, para no perder el histórico si el formulario cambia después).
- Un **reporte** (PDF) es `individual` | `grupal` | `general`; su visibilidad para el facilitador depende de `evaluacion.reportes_publicados`, no de un flag en el reporte mismo.

### Dos flujos de facilitador con seguridad distinta, a propósito

- **`/evaluacion/:id`** (aplicar encuesta): el link *es* el secreto — no pide clave de acceso. `GET /api/facilitador/evaluaciones/:id` es público y resuelve el colegio dueño de esa evaluación directamente.
- **`/reportes/:id`** (ver/descargar reportes, para directores): sí pide clave de acceso, pero **escopeada a esa evaluación puntual** — `POST /api/facilitador/evaluaciones/:id/verificar` valida que la clave pertenezca justo al colegio dueño de esa evaluación (no a cualquier colegio), y solo si `reportes_publicados = true`.

Ambos flujos, al validar, guardan la sesión facilitador (`X-Colegio-Id`) en `databaseService` para las siguientes llamadas (listar grupos, estudiantes, reportes, etc.).

### Archivos subidos

Los PDFs de reportes (`POST /api/admin/reportes`) se suben a un bucket S3-compatible vía `src/services/storageService.ts` (`uploadFile`, wrapper sobre `@aws-sdk/client-s3`) y `archivo_url` guarda la URL pública devuelta por el bucket — no un path servido por la propia app. Configuración por env vars `S3_ENDPOINT` / `S3_BUCKET` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_REGION` / `S3_FORCE_PATH_STYLE` / `S3_PUBLIC_URL` (ver `.env.example`). En local, `docker-compose.yml` levanta un MinIO (mismo protocolo S3 que los buckets de Railway) y crea el bucket ya en modo público de lectura la primera vez (`docker compose up -d`); en producción (Railway) las mismas env vars apuntan al bucket real — el código de `storageService.ts` no cambia entre entornos. No hay ruta propia sirviendo archivos (`src/routes/uploads.ts` se eliminó junto con este cambio) — las URLs de `archivo_url` apuntan directo al bucket.

### Auth del dashboard admin

`src/pages/Login.tsx` acepta cualquier usuario/contraseña no vacíos y no valida nada real; `/admin/*` en `src/App.tsx` **no tiene ninguna guarda de ruta** — son accesibles navegando directo, sin pasar por el login. Es el estado actual real del repo, no un placeholder a medio construir: si se necesita gating real, hay que reconstruirlo (guardar un flag de sesión tras validar credenciales reales o hardcodeadas, y envolver las rutas `/admin/*` en `App.tsx` con un componente que redirija si no hay sesión).

### Importación/exportación de Excel

Todo el manejo de `.xlsx` (import de alumnos, plantilla de ejemplo, export de respuestas) pasa por **ExcelJS del lado del servidor** (`await import("exceljs")` dentro del route handler), nunca en el bundle del cliente — el cliente solo sube/descarga el archivo binario vía `FormData`/`blob`. Ver `src/routes/admin/gruposEstudiantesImportar.ts` (detecta columnas por el texto del encabezado, no por posición fija; inserta fila por fila para que un CURP duplicado no tumbe la carga completa) y `src/routes/admin/plantillasEstudiantes.ts`.

### Frontend: estructura

- `src/pages/*.tsx` — una página por ruta. Todas usan estilos inline + la paleta `src/utils/Colors.tsx` (`COLORS.violeta400`, etc.), no clases de Tailwind sueltas (excepción: `Login.tsx`, que quedó con clases Tailwind de una versión anterior — no lo tomes como el patrón a seguir).
- `src/components/` — UI compartida (`Table`, `Modal`, `Drawer`, `StatCard`, `ActionButton`, `EstadoBadge`, `Sidebar`).
- `src/components/layouts/` — las 3 sub-vistas de `DetalleAnalisis.tsx` (Grupos / Estudiantes / Datos), reciben datos ya adaptados por la página, no llaman a `databaseService` directamente.
- `src/utils/categorias.ts` — único lugar con las etiquetas en español de las 3 categorías de formulario (`emociones` → "Emociones", etc.); reusar en vez de hardcodear el mapeo en cada página.

**Gotcha de z-index:** `Modal` (z-index 130) y `Drawer` (z-index 120) pueden anidarse (p. ej. el modal de "Importar Excel" se abre encima del drawer de edición de grupo) — `Modal` siempre debe quedar por encima de `Drawer`.

## Testing

`tests/` espeja `src/routes/` (`tests/admin/colegios.test.ts` prueba `src/routes/admin/colegios.ts`, etc.) más `tests/db/functions.test.ts` (las 3 funciones plpgsql directo, sin pasar por HTTP).

- **No hay BD de test separada** — los tests corren contra la misma Postgres de `.env` (`psyeva1`). `tests/setup.ts` expone `resetDb()` (trunca + recarga `db/reset-and-seed.sql`) y `createTestServer(routes)` (levanta un `Bun.serve` real en un puerto libre para pegarle con `fetch()`). Cada archivo de test llama `beforeEach(resetDb)`.
- `tests/globalTeardown.ts`, cargado una sola vez vía `bunfig.toml` → `[test].preload` (a diferencia de `setup.ts`, que cada archivo importa por su cuenta), deja la BD limpia después de correr **toda** la suite — sin este archivo, la BD queda con lo que dejó el último test que corrió.
- `tests/factories.ts` expone `mock` (los UUIDs fijos del seed) y funciones `createColegio`/`createEvaluacion`/`createGrupo`/`createEstudiante`/`createFormulario`/`createSesion`/`createReporte` para casos que el seed no cubre.

**Gotcha real de `bun:test`:** `expect(sql\`...\`).rejects.toThrow()` cuelga el proceso indefinidamente — la `Query` de `postgres.js` no es una `Promise` nativa y `expect()` nunca dispara su ejecución. Usar `try/catch` en su lugar (ver el helper `expectRaises` en `tests/db/functions.test.ts`).

**No hay bucket de test separado** — igual que con Postgres, los tests que suben archivos (`tests/admin/reportes.test.ts`) pegan contra el MinIO local real (`S3_*` de `.env`). Requiere `docker compose up -d` corriendo; si no, solo fallan los tests que efectivamente suben un archivo.
