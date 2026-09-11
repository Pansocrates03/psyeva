# Pruebas de carga — hallazgos

**Fecha:** 2026-08-30
**Objetivo:** validar que el sistema soporta hasta 500 alumnos respondiendo encuestas al mismo tiempo, tanto en un pico instantáneo (todos tocan "Siguiente" a la vez) como en uso sostenido durante ~10 minutos (cada alumno a su propio ritmo).

## Resumen ejecutivo

- **Pico (500 clicks simultáneos):** tasa de error variable entre corridas (5%–47%), causada por conexiones TCP rechazadas por el sistema operativo antes de llegar a la aplicación — no por Postgres, no por la lógica de negocio.
- **Sostenido (uso a lo largo del tiempo):** validado con un smoke test a escala reducida — **100% de éxito**, incluido el flujo completo (iniciar → responder → completar). La corrida real de 500 VUs / 10 minutos todavía no se ejecutó.
- **No está confirmado que el problema del pico reproduzca en producción** — Railway corre en Linux, con un comportamiento de red distinto al de esta laptop con Windows donde se corrió la prueba. Es el próximo paso pendiente.

## Metodología

- **Herramienta:** [k6](https://k6.io) (Grafana), instalado vía `winget install GrafanaLabs.k6`.
- **Entorno de esta corrida:** local — Windows, Postgres local, MinIO local (Docker), servidor Bun corriendo tanto en modo dev (`bun dev`) como en modo producción (`NODE_ENV=production bun run src/index.ts`, equivalente a `bun start`).
- **Datos de prueba:** [`scripts/seed-carga.ts`](../scripts/seed-carga.ts) — crea un colegio aislado ("Colegio Carga", `clave_acceso = carga-2026`) con:
  - 1 formulario de prueba (2 secciones, 10 preguntas en total)
  - 500 estudiantes reales
  - 500 sesiones ya iniciadas vía la función `iniciar_sesion()` de Postgres (no simuladas — el mismo código que usa el flujo real del facilitador)
- **Escenarios de k6:**
  - [`k6/pico.js`](../k6/pico.js) — 500 VUs, 1 iteración cada uno, arrancando todos juntos, todos respondiendo la misma pregunta al mismo tiempo.
  - [`k6/sostenido.js`](../k6/sostenido.js) — 500 VUs con arranque escalonado en el primer minuto; cada uno recorre el flujo completo (iniciar sesión → responder 10 preguntas con pausa random de 20-60s entre cada una → completar sesión).

## Hallazgo 1 — Rechazo de conexión TCP bajo ráfaga instantánea (`pico.js`)

### Datos de 4 corridas consecutivas

| Corrida | Modo del servidor       | Fallidas | %     |
|---------|--------------------------|----------|-------|
| 1       | dev (`bun dev`)          | 73/500   | 14.6% |
| 2       | dev                      | 76/500   | 15.2% |
| 3       | producción (`bun start`) | 235/500  | 47.0% |
| 4       | producción               | 26/500   | 5.2%  |

### Naturaleza del error

Todas las fallas fueron el mismo error de red, no un error de la aplicación:

```
dial tcp 127.0.0.1:3000: connectex: No connection could be made because the target machine actively refused it.
```

La conexión TCP fue rechazada **antes** de llegar a la aplicación — no hubo ningún status HTTP (ni 500, ni 429, ni ninguno). La request nunca se llegó a ejecutar del lado del servidor.

### Lo que esto descarta

- **No es el pool de conexiones de Postgres** (`max: 10` en [`src/db.ts`](../src/db.ts)) — las requests que sí lograron conectar respondieron rápido (45–180ms), sin señales de contención o cola.
- **No es un bug de `guardar_respuesta` ni de la lógica de negocio** — cero errores de aplicación; el 100% de las fallas fueron a nivel de conexión de red, antes de que el código de la ruta se ejecutara.

### Diagnóstico más probable

La cola de aceptación de conexiones TCP del sistema operativo (Windows, en esta máquina de desarrollo) se satura cuando ~500 conexiones llegan en una ventana de milisegundos, más rápido de lo que el proceso puede aceptarlas. La variabilidad entre corridas (5%–47%, sin relación clara con el modo dev/producción) es consistente con una condición de carrera a nivel de sistema operativo — depende del estado exacto de la pila de red en ese instante (sockets en `TIME_WAIT` de corridas anteriores, scheduling del proceso, etc.), no de la lógica de la aplicación.

### Por qué esto no está confirmado como un problema de producción

Railway corre los contenedores en Linux, cuyo manejo de la cola de aceptación TCP es distinto — y en general más generoso ante ráfagas — que el de Windows. Es razonablemente probable que esta misma prueba, corrida contra la app ya deployada en Railway, dé 0% de error. **No se pudo confirmar en esta sesión** porque todavía no hay una instancia de Railway desplegada.

## Hallazgo 2 — El flujo completo funciona correctamente (`sostenido.js`, smoke test)

Se corrió una versión reducida del escenario sostenido (10 VUs, pausas de 1–2s en vez de 500 VUs / 20–60s) para validar la lógica del flujo completo sin esperar los ~10 minutos reales:

- 110 requests, **0 fallidas** (0.00% `http_req_failed`)
- Los 3 checks — iniciar sesión, guardar respuesta, completar sesión — en **100%**
- Latencias bajas y estables (avg 3.8ms, p95 10ms) — esperable al no haber ráfaga instantánea

**Pendiente:** correr la versión real (500 VUs, ~10-12 minutos) tanto local como contra Railway. El smoke test confirma que la lógica del escenario es correcta, pero no reemplaza medir el comportamiento sostenido real (fugas de conexiones, memoria del proceso, autovacuum de Postgres bajo volumen sostenido) — ver "Próximos pasos".

## Bug encontrado y arreglado de paso (no relacionado con las pruebas de carga)

`src/services/storageService.ts` había sido migrado a URLs firmadas (usa `@aws-sdk/s3-request-presigner`), y la dependencia ya estaba declarada en `package.json`, pero nunca se había corrido `bun install` después de agregarla — el servidor no arrancaba (`Cannot find module '@aws-sdk/s3-request-presigner'`). Se corrigió corriendo `bun install`. No tiene relación con los hallazgos de carga; se documenta acá solo porque bloqueaba poder correr las pruebas.

## Próximos pasos recomendados

1. **Deployar a Railway y repetir `k6/pico.js` contra esa URL** — es el único dato que falta para saber si el hallazgo 1 es un problema real de producción o un artefacto de este entorno de desarrollo Windows.
   ```bash
   k6 run -e BASE_URL=https://<tu-app>.up.railway.app k6/pico.js
   ```
2. **Si el problema persiste en Railway:** investigar si el runtime expone un backlog de conexiones configurable, o si conviene un proxy/load balancer adelante que absorba la ráfaga (confirmar primero si Railway ya provee algo así a nivel de plataforma).
3. **Correr `k6/sostenido.js` completo** (500 VUs, ~10-12 minutos reales), tanto local como en Railway, monitoreando durante la corrida — no solo el resumen final de k6 — la memoria del proceso Bun y las conexiones activas de Postgres.
4. **Revisar el tamaño del pool de Postgres** (`max: 10` en `src/db.ts`) específicamente con los resultados del sostenido completo — no fue el cuello de botella en la prueba de pico, pero con 500 usuarios escribiendo de forma sostenida (aunque a ritmo moderado) puede volverse relevante. No subirlo a ciegas: medir antes y después.

## Cómo reproducir

```bash
bun run seed:carga        # crea "Colegio Carga" + 500 estudiantes + sesiones iniciadas
k6 run k6/pico.js         # repetible sin volver a sembrar (hace upsert sobre la misma pregunta)
k6 run k6/sostenido.js    # completa las sesiones — correr seed:carga de nuevo antes de repetir
```

Contra Railway en vez de local, agregar `-e BASE_URL=https://tu-app.up.railway.app` a cualquiera de los dos comandos de `k6 run`.
