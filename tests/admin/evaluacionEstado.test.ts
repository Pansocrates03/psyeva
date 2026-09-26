import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { evaluacionEstadoRoutes } from "../../src/routes";
import { mock } from "../factories";

let server: ReturnType<typeof createTestServer>;
beforeAll(() => { server = createTestServer({ "/api/admin/evaluaciones/:id/estado": evaluacionEstadoRoutes }); });
afterAll(() => server.stop());
beforeEach(resetDb);

const patch = (id: string, body: unknown) => fetch(`${server.url}/api/admin/evaluaciones/${id}/estado`, {
  method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

describe("PATCH /api/admin/evaluaciones/:id/estado", () => {
  test("400 si el estado no es válido", async () => {
    const res = await patch(mock.evaluacionSanJose, { estado: "otraCosa" });
    expect(res.status).toBe(400);
  });

  test("404 si la evaluación no existe", async () => {
    const res = await patch(crypto.randomUUID(), { estado: "abierto" });
    expect(res.status).toBe(404);
  });

  test("actualiza la evaluación a cerrado, abierto o publico", async () => {
    for (const estado of ["cerrado", "abierto", "publico"] as const) {
      const res = await patch(mock.evaluacionSanJose, { estado });
      expect(res.status).toBe(200);
      const [row] = await sql`SELECT estado FROM evaluacion WHERE id = ${mock.evaluacionSanJose}`;
      expect(row.estado).toBe(estado);
    }
  });
});
