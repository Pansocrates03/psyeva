import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb } from "../setup";
import { facilitadorEvaluacionVerificarRoutes } from "../../src/routes";
import { mock } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/facilitador/evaluaciones/:id/verificar": facilitadorEvaluacionVerificarRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const post = (evaluacionId: string, body: unknown) =>
  fetch(`${server.url}/api/facilitador/evaluaciones/${evaluacionId}/verificar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/facilitador/evaluaciones/:id/verificar", () => {
  test("400 si falta claveAcceso", async () => {
    const res = await post(mock.evaluacionLiceo, {});
    expect(res.status).toBe(400);
  });

  test("404 si la evaluación no existe", async () => {
    const res = await post(crypto.randomUUID(), { claveAcceso: "cualquiera" });
    expect(res.status).toBe(404);
  });

  test("403 si los reportes de esa evaluación todavía no están publicados", async () => {
    // evaluacionSanJose: reportes_publicados = false en el mock data
    const res = await post(mock.evaluacionSanJose, { claveAcceso: "san-jose-2026" });
    expect(res.status).toBe(403);
  });

  test("401 con una clave incorrecta", async () => {
    const res = await post(mock.evaluacionLiceo, { claveAcceso: "no-es-la-clave" });
    expect(res.status).toBe(401);
  });

  test("401 con la clave correcta de OTRO colegio", async () => {
    // san-jose-2026 es válida, pero no para la evaluación del Liceo
    const res = await post(mock.evaluacionLiceo, { claveAcceso: "san-jose-2026" });
    expect(res.status).toBe(401);
  });

  test("200 con la clave correcta, sin importar mayúsculas/espacios", async () => {
    const res = await post(mock.evaluacionLiceo, { claveAcceso: "  LICEO-ARTES-2026  " });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.colegio.id).toBe(mock.colegioLiceo);
    expect(body.data.colegio.nombre).toBe("Liceo de las Artes");
    expect(body.data.evaluacion.id).toBe(mock.evaluacionLiceo);
    expect(body.data.token).toBe(Buffer.from(mock.colegioLiceo).toString("base64"));
  });
});
