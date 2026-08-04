import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { gruposRoutes } from "../../src/routes";
import { mock } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/grupos": gruposRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const post = (body: unknown) =>
  fetch(`${server.url}/api/admin/grupos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/admin/grupos", () => {
  test("400 si faltan evaluacionId o nombre", async () => {
    const res = await post({ nombre: "Grupo C" });
    expect(res.status).toBe(400);
  });

  test("404 si la evaluación no existe", async () => {
    const res = await post({ evaluacionId: crypto.randomUUID(), nombre: "Grupo C" });
    expect(res.status).toBe(404);
  });

  test("201 y crea el grupo sin estudiantes", async () => {
    const res = await post({
      evaluacionId: mock.evaluacionSanJose,
      nombre: "Grupo C",
      formEmocionesId: mock.formEmociones,
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.nombre).toBe("Grupo C");
    expect(body.data.estudiantes).toEqual([]);

    const [row] = await sql`SELECT * FROM grupo WHERE id = ${body.data.id}`;
    expect(row.formEmocionesId).toBe(mock.formEmociones);
  });

  test("201 y crea el grupo junto con sus estudiantes iniciales, atómicamente", async () => {
    const res = await post({
      evaluacionId: mock.evaluacionSanJose,
      nombre: "Grupo D",
      estudiantes: [
        { nombreCompleto: "Alumno Uno", curp: "AAAA000101HDFAAA01" },
        { nombreCompleto: "Alumno Dos" },
        { nombreCompleto: "  " }, // se ignora: sin nombre real
      ],
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.estudiantes).toHaveLength(2);

    const estudiantes = await sql`SELECT * FROM estudiante WHERE grupo_id = ${body.data.id}`;
    expect(estudiantes).toHaveLength(2);
  });
});
