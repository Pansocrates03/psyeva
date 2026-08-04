import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { colegiosIdRoutes } from "../../src/routes";
import { mock } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/colegios/:id": colegiosIdRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const patch = (id: string, body: unknown) =>
  fetch(`${server.url}/api/admin/colegios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("PATCH /api/admin/colegios/:id", () => {
  test("400 si no se envía ningún campo", async () => {
    const res = await patch(mock.colegioSanJose, {});
    expect(res.status).toBe(400);
  });

  test("404 si el colegio no existe", async () => {
    const res = await patch(crypto.randomUUID(), { nombre: "X" });
    expect(res.status).toBe(404);
  });

  test("200 y renombra el colegio", async () => {
    const res = await patch(mock.colegioSanJose, { nombre: "Colegio San José (renombrado)" });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.nombre).toBe("Colegio San José (renombrado)");

    const [row] = await sql`SELECT nombre, clave_acceso FROM colegio WHERE id = ${mock.colegioSanJose}`;
    expect(row.nombre).toBe("Colegio San José (renombrado)");
    expect(row.claveAcceso).toBe("san-jose-2026"); // no se tocó
  });

  test("409 si la nueva clave de acceso ya la usa otro colegio", async () => {
    const res = await patch(mock.colegioSanJose, { claveAcceso: "liceo-artes-2026" });
    expect(res.status).toBe(409);
  });

  test("200 al cambiar la clave de acceso a una libre", async () => {
    const res = await patch(mock.colegioSanJose, { claveAcceso: "san-jose-2027" });
    expect(res.status).toBe(200);

    const [row] = await sql`SELECT clave_acceso FROM colegio WHERE id = ${mock.colegioSanJose}`;
    expect(row.claveAcceso).toBe("san-jose-2027");
  });
});
