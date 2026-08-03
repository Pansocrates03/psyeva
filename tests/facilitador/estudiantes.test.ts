import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb } from "../setup";
import { estudiantesRoutes } from "../../src/routes";
import { mock } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/facilitador/estudiantes/:grupoId": estudiantesRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const get = (grupoId: string, params: Record<string, string> = {}, headers: Record<string, string> = {}) =>
  fetch(`${server.url}/api/facilitador/estudiantes/${grupoId}?${new URLSearchParams(params)}`, { headers });

describe("GET /api/facilitador/estudiantes/:grupoId", () => {
  test("401 si falta el header X-Colegio-Id", async () => {
    const res = await get(mock.grupoA, { evaluacionId: mock.evaluacionSanJose });
    expect(res.status).toBe(401);
  });

  test("400 si falta evaluacionId como query param", async () => {
    const res = await get(mock.grupoA, {}, { "X-Colegio-Id": mock.colegioSanJose });
    expect(res.status).toBe(400);
  });

  test("403 si el grupo no pertenece al colegio del header", async () => {
    const res = await get(
      mock.grupoA,
      { evaluacionId: mock.evaluacionSanJose },
      { "X-Colegio-Id": mock.colegioLiceo }
    );
    expect(res.status).toBe(403);
  });

  test("403 si el grupo no pertenece a la evaluación indicada", async () => {
    const res = await get(
      mock.grupoA,
      { evaluacionId: mock.evaluacionLiceo },
      { "X-Colegio-Id": mock.colegioSanJose }
    );
    expect(res.status).toBe(403);
  });

  test("200 y devuelve el estado por categoría de cada estudiante", async () => {
    const res = await get(
      mock.grupoA,
      { evaluacionId: mock.evaluacionSanJose },
      { "X-Colegio-Id": mock.colegioSanJose }
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.grupo.id).toBe(mock.grupoA);

    const ana = body.data.estudiantes.find((e: { estudianteId: string }) => e.estudianteId === mock.estudianteAna);
    expect(ana.estadoEmociones).toBe("completada");
    expect(ana.estadoBienestar).toBe("en_progreso");
    expect(ana.estadoAprendizaje).toBe("pendiente");
    expect(ana.todoCompletado).toBe(false);
  });
});
