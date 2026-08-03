import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { gruposIdRoutes } from "../../src/routes";
import { mock, createGrupo } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/grupos/:id": gruposIdRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

describe("GET /api/admin/grupos/:id", () => {
  test("404 si el grupo no existe", async () => {
    const res = await fetch(`${server.url}/api/admin/grupos/${crypto.randomUUID()}`);
    expect(res.status).toBe(404);
  });

  test("200 y devuelve el grupo con sus estudiantes y títulos de formulario", async () => {
    const res = await fetch(`${server.url}/api/admin/grupos/${mock.grupoA}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.grupoId).toBe(mock.grupoA);
    expect(body.data.formEmocionesTitulo).toBe("Bienestar emocional");
    expect(body.data.estudiantes).toHaveLength(2);
    expect(body.data.estudiantes.map((e: { nombreCompleto: string }) => e.nombreCompleto).sort())
      .toEqual(["Ana López García", "Bruno Pérez Cruz"]);
  });
});

describe("PATCH /api/admin/grupos/:id", () => {
  const patch = (id: string, body: unknown) =>
    fetch(`${server.url}/api/admin/grupos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  test("400 si no se envía ningún campo", async () => {
    const res = await patch(mock.grupoA, {});
    expect(res.status).toBe(400);
  });

  test("404 si el grupo no existe", async () => {
    const res = await patch(crypto.randomUUID(), { nombre: "X" });
    expect(res.status).toBe(404);
  });

  test("200 y renombra el grupo", async () => {
    const res = await patch(mock.grupoA, { nombre: "Grupo A - renombrado" });
    expect(res.status).toBe(200);

    const [row] = await sql`SELECT nombre FROM grupo WHERE id = ${mock.grupoA}`;
    expect(row.nombre).toBe("Grupo A - renombrado");
  });
});

describe("DELETE /api/admin/grupos/:id", () => {
  const del = (id: string) => fetch(`${server.url}/api/admin/grupos/${id}`, { method: "DELETE" });

  test("404 si el grupo no existe", async () => {
    const res = await del(crypto.randomUUID());
    expect(res.status).toBe(404);
  });

  test("409 si el grupo tiene sesiones completadas", async () => {
    const res = await del(mock.grupoA);
    expect(res.status).toBe(409);
  });

  test("200 y elimina un grupo sin sesiones completadas", async () => {
    const grupo = await createGrupo();
    const res = await del(grupo.id);
    expect(res.status).toBe(200);

    const [row] = await sql`SELECT id FROM grupo WHERE id = ${grupo.id}`;
    expect(row).toBeUndefined();
  });
});
