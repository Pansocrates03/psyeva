import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { evaluacionRoutes } from "../../src/routes";
import { mock } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/evaluaciones": evaluacionRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

describe("GET /api/admin/evaluaciones", () => {
  test("200 y devuelve todas las evaluaciones ordenadas por fecha descendente", async () => {
    const res = await fetch(`${server.url}/api/admin/evaluaciones`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].evaluacionId).toBe(mock.evaluacionLiceo); // fecha más reciente
    expect(body.data[1].evaluacionId).toBe(mock.evaluacionSanJose);
  });

  test("incluye los KPIs calculados por la vista", async () => {
    const res = await fetch(`${server.url}/api/admin/evaluaciones`);
    const body = await res.json();

    const sanJose = body.data.find((e: { evaluacionId: string }) => e.evaluacionId === mock.evaluacionSanJose);
    expect(Number(sanJose.totalGrupos)).toBe(2);
    expect(Number(sanJose.totalAlumnos)).toBe(3);
    expect(Number(sanJose.sesionesCompletadas)).toBe(2);
  });
});

describe("POST /api/admin/evaluaciones", () => {
  test("400 si faltan campos requeridos", async () => {
    const res = await fetch(`${server.url}/api/admin/evaluaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Nueva evaluación" }),
    });
    expect(res.status).toBe(400);
  });

  test("404 si el colegio no existe", async () => {
    const res = await fetch(`${server.url}/api/admin/evaluaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colegioId: crypto.randomUUID(), nombre: "X", fecha: "2026-09-01" }),
    });
    expect(res.status).toBe(404);
  });

  test("201 y crea la evaluación cerrada por defecto", async () => {
    const res = await fetch(`${server.url}/api/admin/evaluaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colegioId: mock.colegioSanJose, nombre: "Evaluación otoño", fecha: "2026-09-01" }),
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.aceptaRespuestas).toBe(false);
    expect(body.data.reportesPublicados).toBe(false);

    const [row] = await sql`SELECT * FROM evaluacion WHERE id = ${body.data.id}`;
    expect(row.nombre).toBe("Evaluación otoño");
  });
});
