import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb } from "../setup";
import { facilitadorEvaluacionIdRoutes } from "../../src/routes";
import { mock, createEvaluacion } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/facilitador/evaluaciones/:id": facilitadorEvaluacionIdRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

describe("GET /api/facilitador/evaluaciones/:id", () => {
  test("404 si la evaluación no existe", async () => {
    const res = await fetch(`${server.url}/api/facilitador/evaluaciones/${crypto.randomUUID()}`);
    expect(res.status).toBe(404);
  });

  test("200 sin necesitar clave de acceso ni header X-Colegio-Id", async () => {
    const res = await fetch(`${server.url}/api/facilitador/evaluaciones/${mock.evaluacionSanJose}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.evaluacionId).toBe(mock.evaluacionSanJose);
    expect(body.data.nombre).toBe("Evaluación primer semestre 2026");
    expect(body.data.aceptaRespuestas).toBe(true);
    expect(body.data.reportesPublicados).toBe(false);
    expect(body.data.colegioId).toBe(mock.colegioSanJose);
    expect(body.data.colegioNombre).toBe("Colegio San José");
  });

  test("200 y refleja aceptaRespuestas=false cuando la evaluación está cerrada", async () => {
    const cerrada = await createEvaluacion({ aceptaRespuestas: false });
    const res = await fetch(`${server.url}/api/facilitador/evaluaciones/${cerrada.id}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.aceptaRespuestas).toBe(false);
  });
});
