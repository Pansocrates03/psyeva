import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { estudiantesIdRoutes } from "../../src/routes";
import { mock, createEstudiante } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/estudiantes/:id": estudiantesIdRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const del = (id: string) => fetch(`${server.url}/api/admin/estudiantes/${id}`, { method: "DELETE" });

describe("DELETE /api/admin/estudiantes/:id", () => {
  test("404 si no existe", async () => {
    const res = await del(crypto.randomUUID());
    expect(res.status).toBe(404);
  });

  test("409 si el estudiante ya tiene sesiones registradas", async () => {
    const res = await del(mock.estudianteAna); // tiene sesiones en el mock data
    expect(res.status).toBe(409);

    const [row] = await sql`SELECT id FROM estudiante WHERE id = ${mock.estudianteAna}`;
    expect(row).toBeTruthy();
  });

  test("200 y elimina un estudiante sin sesiones", async () => {
    const estudiante = await createEstudiante();
    const res = await del(estudiante.id);
    expect(res.status).toBe(200);

    const [row] = await sql`SELECT id FROM estudiante WHERE id = ${estudiante.id}`;
    expect(row).toBeUndefined();
  });
});
