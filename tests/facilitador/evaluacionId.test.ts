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
    const res = await fetch(`${server.url}/api/facilitador/evaluaciones/${mock.codigoEvaluacionSanJose.toLowerCase()}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.evaluacionId).toBe(mock.evaluacionSanJose);
    expect(body.data.nombre).toBe("Evaluación primer semestre 2026");
    expect(body.data.estado).toBe("abierto");
    expect(body.data.colegioNombre).toBe("Colegio San José");
    expect(body.data.colegioId).toBeUndefined();
  });

  test("POST requiere la clave del colegio para verificar el enlace corto", async () => {
    const wrong = await fetch(`${server.url}/api/facilitador/evaluaciones/${mock.codigoEvaluacionSanJose}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claveAcceso: "clave-incorrecta" }),
    });
    expect(wrong.status).toBe(401);

    const valid = await fetch(`${server.url}/api/facilitador/evaluaciones/${mock.codigoEvaluacionSanJose}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claveAcceso: "san-jose-2026" }),
    });
    expect(valid.status).toBe(200);
    const body = await valid.json();
    expect(body.data.estado).toBe("abierto");
    expect(body.data.evaluacionId).toBe(mock.evaluacionSanJose);
  });

  test("200 y refleja estado cerrado", async () => {
    const cerrada = await createEvaluacion({ estado: "cerrado" });
    const res = await fetch(`${server.url}/api/facilitador/evaluaciones/${cerrada.codigoAcceso}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.estado).toBe("cerrado");
  });
});

