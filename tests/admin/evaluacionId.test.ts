import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { evaluacionIdRoutes } from "../../src/routes";
import { mock, createEvaluacion } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/evaluaciones/:id": evaluacionIdRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

describe("GET /api/admin/evaluaciones/:id", () => {
  test("404 si la evaluación no existe", async () => {
    const res = await fetch(`${server.url}/api/admin/evaluaciones/${crypto.randomUUID()}`);
    expect(res.status).toBe(404);
  });

  test("200 y devuelve el detalle con los grupos y su progreso", async () => {
    const res = await fetch(`${server.url}/api/admin/evaluaciones/${mock.evaluacionSanJose}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.evaluacionId).toBe(mock.evaluacionSanJose);
    expect(body.data.grupos).toHaveLength(2);
    expect(body.data.grupos.map((g: { grupoId: string }) => g.grupoId).sort())
      .toEqual([mock.grupoA, mock.grupoB].sort());

    const grupoA = body.data.grupos.find((g: { grupoId: string }) => g.grupoId === mock.grupoA);
    expect(grupoA.formEmocionesTitulo).toBe("Bienestar emocional");
  });
});

describe("PATCH /api/admin/evaluaciones/:id", () => {
  const patch = (id: string, body: unknown) =>
    fetch(`${server.url}/api/admin/evaluaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  test("400 si no se envía ningún campo", async () => {
    const res = await patch(mock.evaluacionSanJose, {});
    expect(res.status).toBe(400);
  });

  test("404 si la evaluación no existe", async () => {
    const res = await patch(crypto.randomUUID(), { nombre: "X" });
    expect(res.status).toBe(404);
  });

  test("200 y actualiza solo los campos enviados", async () => {
    const res = await patch(mock.evaluacionSanJose, { nombre: "Renombrada" });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.nombre).toBe("Renombrada");
    expect(body.data.aceptaRespuestas).toBe(true); // no se tocó

    const [row] = await sql`SELECT nombre, acepta_respuestas FROM evaluacion WHERE id = ${mock.evaluacionSanJose}`;
    expect(row.nombre).toBe("Renombrada");
    expect(row.aceptaRespuestas).toBe(true);
  });
});

describe("DELETE /api/admin/evaluaciones/:id", () => {
  const del = (id: string) => fetch(`${server.url}/api/admin/evaluaciones/${id}`, { method: "DELETE" });

  test("404 si la evaluación no existe", async () => {
    const res = await del(crypto.randomUUID());
    expect(res.status).toBe(404);
  });

  test("409 si la evaluación tiene sesiones completadas", async () => {
    const res = await del(mock.evaluacionSanJose);
    expect(res.status).toBe(409);

    const [row] = await sql`SELECT id FROM evaluacion WHERE id = ${mock.evaluacionSanJose}`;
    expect(row).toBeTruthy(); // no se borró
  });

  test("200 y elimina una evaluación sin sesiones completadas", async () => {
    const evaluacion = await createEvaluacion();
    const res = await del(evaluacion.id);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.eliminado).toBe(true);

    const [row] = await sql`SELECT id FROM evaluacion WHERE id = ${evaluacion.id}`;
    expect(row).toBeUndefined();
  });
});
