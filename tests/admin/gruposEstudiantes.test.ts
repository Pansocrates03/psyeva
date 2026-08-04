import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { gruposEstudiantesRoutes } from "../../src/routes";
import { mock } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/grupos/:id/estudiantes": gruposEstudiantesRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const post = (grupoId: string, body: unknown) =>
  fetch(`${server.url}/api/admin/grupos/${grupoId}/estudiantes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/admin/grupos/:id/estudiantes", () => {
  test("400 si falta nombreCompleto", async () => {
    const res = await post(mock.grupoA, { curp: "AAAA000101HDFAAA01" });
    expect(res.status).toBe(400);
  });

  test("404 si el grupo no existe", async () => {
    const res = await post(crypto.randomUUID(), { nombreCompleto: "Nuevo Alumno" });
    expect(res.status).toBe(404);
  });

  test("201 y agrega el estudiante al grupo", async () => {
    const res = await post(mock.grupoA, { nombreCompleto: "Nuevo Alumno", curp: "NUAL000101HDFAAA01" });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.grupoId).toBe(mock.grupoA);

    const [row] = await sql`SELECT * FROM estudiante WHERE id = ${body.data.id}`;
    expect(row.nombreCompleto).toBe("Nuevo Alumno");
  });
});
