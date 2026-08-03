import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { facilitadorGruposRoutes } from "../../src/routes";
import { mock, createEvaluacion } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/facilitador/grupos": facilitadorGruposRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const get = (params: Record<string, string>, headers: Record<string, string> = {}) =>
  fetch(`${server.url}/api/facilitador/grupos?${new URLSearchParams(params)}`, { headers });

describe("GET /api/facilitador/grupos", () => {
  test("400 si falta evaluacionId", async () => {
    const res = await get({}, { "X-Colegio-Id": mock.colegioSanJose });
    expect(res.status).toBe(400);
  });

  test("401 si falta el header X-Colegio-Id", async () => {
    const res = await get({ evaluacionId: mock.evaluacionSanJose });
    expect(res.status).toBe(401);
  });

  test("403 si la evaluación no pertenece al colegio del header", async () => {
    const res = await get(
      { evaluacionId: mock.evaluacionSanJose },
      { "X-Colegio-Id": mock.colegioLiceo }
    );
    expect(res.status).toBe(403);
  });

  test("403 si la evaluación no está aceptando respuestas", async () => {
    const evaluacion = await createEvaluacion({ colegioId: mock.colegioSanJose, aceptaRespuestas: false });
    const res = await get(
      { evaluacionId: evaluacion.id },
      { "X-Colegio-Id": mock.colegioSanJose }
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/aceptando respuestas/);
  });

  test("200 y devuelve los grupos con su progreso", async () => {
    const res = await get(
      { evaluacionId: mock.evaluacionSanJose },
      { "X-Colegio-Id": mock.colegioSanJose }
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.evaluacion.id).toBe(mock.evaluacionSanJose);

    const grupoA = body.data.grupos.find((g: { grupoId: string }) => g.grupoId === mock.grupoA);
    expect(grupoA).toBeTruthy();
    expect(Number(grupoA.totalAlumnos)).toBe(2);
    // Grupo A: Ana (1 sesión completada de 3) + Bruno (1 sesión completada de 3)
    expect(Number(grupoA.sesionesCompletadas)).toBe(2);
  });

  test("refleja en tiempo real cambios de estado (sesión recién completada)", async () => {
    await sql`
      UPDATE sesion SET estado = 'completada', completada_at = NOW()
      WHERE id = ${mock.sesionAnaBienpsicEnProgreso}
    `;

    const res = await get(
      { evaluacionId: mock.evaluacionSanJose },
      { "X-Colegio-Id": mock.colegioSanJose }
    );
    const body = await res.json();
    const grupoA = body.data.grupos.find((g: { grupoId: string }) => g.grupoId === mock.grupoA);
    expect(Number(grupoA.sesionesCompletadas)).toBe(3);
  });
});
