import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { evaluacionEstadoRoutes } from "../../src/routes";
import { mock, createEvaluacion } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/evaluaciones/:id/estado": evaluacionEstadoRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const patch = (id: string, body: unknown) =>
  fetch(`${server.url}/api/admin/evaluaciones/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("PATCH /api/admin/evaluaciones/:id/estado", () => {
  test("400 si campo no es uno de los permitidos", async () => {
    const res = await patch(mock.evaluacionSanJose, { campo: "otraCosa" });
    expect(res.status).toBe(400);
  });

  test("404 si la evaluación no existe", async () => {
    const res = await patch(crypto.randomUUID(), { campo: "aceptaRespuestas" });
    expect(res.status).toBe(404);
  });

  test("hace toggle cuando no se envía 'valor'", async () => {
    // evaluacionSanJose empieza con acepta_respuestas = true
    const res = await patch(mock.evaluacionSanJose, { campo: "aceptaRespuestas" });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.aceptaRespuestas).toBe(false);
  });

  test("fuerza el valor enviado explícitamente", async () => {
    const res = await patch(mock.evaluacionSanJose, { campo: "aceptaRespuestas", valor: true });
    expect(res.status).toBe(200);

    const [row] = await sql`SELECT acepta_respuestas FROM evaluacion WHERE id = ${mock.evaluacionSanJose}`;
    expect(row.aceptaRespuestas).toBe(true);
  });

  test("409 al intentar publicar reportes mientras la evaluación sigue aceptando respuestas", async () => {
    // evaluacionSanJose: acepta_respuestas = true, reportes_publicados = false
    const res = await patch(mock.evaluacionSanJose, { campo: "reportesPublicados", valor: true });
    expect(res.status).toBe(409);

    const [row] = await sql`SELECT reportes_publicados FROM evaluacion WHERE id = ${mock.evaluacionSanJose}`;
    expect(row.reportesPublicados).toBe(false);
  });

  test("200 al publicar reportes una vez cerrada la evaluación", async () => {
    const evaluacion = await createEvaluacion({ aceptaRespuestas: false, reportesPublicados: false });

    const res = await patch(evaluacion.id, { campo: "reportesPublicados", valor: true });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.reportesPublicados).toBe(true);
  });
});
