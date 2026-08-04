import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb } from "../setup";
import { gruposRespuestasRoutes } from "../../src/routes";
import { mock, createGrupo } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/grupos/:id/respuestas": gruposRespuestasRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

describe("GET /api/admin/grupos/:id/respuestas", () => {
  test("404 si el grupo no existe", async () => {
    const res = await fetch(`${server.url}/api/admin/grupos/${crypto.randomUUID()}/respuestas`);
    expect(res.status).toBe(404);
  });

  test("200 y arma preguntas x estudiantes de los 3 formularios asignados", async () => {
    const res = await fetch(`${server.url}/api/admin/grupos/${mock.grupoA}/respuestas`);
    expect(res.status).toBe(200);

    const body = await res.json();
    // 2 preguntas por cada uno de los 3 formularios asignados a grupoA
    expect(body.data.preguntas).toHaveLength(6);
    expect(body.data.estudiantes).toHaveLength(2);

    const ana = body.data.estudiantes.find((e: { nombreCompleto: string }) => e.nombreCompleto === "Ana López García");
    expect(ana.respuestas[mock.preguntaEmocion1]).toBe("Bien");
    expect(ana.respuestas[mock.preguntaEmocion2]).toBe("Siempre");
    expect(ana.respuestas[mock.preguntaBienpsic1]).toBeNull(); // aún no respondida
  });

  test("200 con listas vacías si el grupo no tiene formularios asignados", async () => {
    const grupo = await createGrupo({
      formEmocionesId: null, formBienpsicId: null, formAprendizajeId: null,
    });
    const res = await fetch(`${server.url}/api/admin/grupos/${grupo.id}/respuestas`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.preguntas).toEqual([]);
  });
});
