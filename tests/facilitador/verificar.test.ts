import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { verificarRoutes } from "../../src/routes";
import { mock } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/facilitador/verificar": verificarRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const post = (body: unknown) =>
  fetch(`${server.url}/api/facilitador/verificar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/facilitador/verificar", () => {
  test("400 si falta claveAcceso", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/claveAcceso/);
  });

  test("400 si claveAcceso no es un string", async () => {
    const res = await post({ claveAcceso: 123 });
    expect(res.status).toBe(400);
  });

  test("401 con una clave de acceso inválida", async () => {
    const res = await post({ claveAcceso: "no-existe" });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("200 y devuelve el colegio + token, ignorando mayúsculas y espacios", async () => {
    const res = await post({ claveAcceso: "  SAN-JOSE-2026  " });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.colegio.id).toBe(mock.colegioSanJose);
    expect(body.data.colegio.nombre).toBe("Colegio San José");
    expect(body.data.token).toBe(Buffer.from(mock.colegioSanJose).toString("base64"));
  });

  test("solo incluye evaluaciones que aceptan respuestas o tienen reportes publicados", async () => {
    const res = await post({ claveAcceso: "san-jose-2026" });
    const body = await res.json();

    const ids = body.data.evaluaciones.map((e: { evaluacionId: string }) => e.evaluacionId);
    expect(ids).toContain(mock.evaluacionSanJose);
    expect(body.data.evaluaciones.every((e: { aceptaRespuestas: boolean; reportesPublicados: boolean }) =>
      e.aceptaRespuestas || e.reportesPublicados
    )).toBe(true);
  });

  test("no muestra evaluaciones que ni aceptan respuestas ni tienen reportes publicados", async () => {
    // Cierra la evaluación de San José y le quita la publicación de reportes
    await sql`
      UPDATE evaluacion SET acepta_respuestas = false, reportes_publicados = false
      WHERE id = ${mock.evaluacionSanJose}
    `;

    const res = await post({ claveAcceso: "san-jose-2026" });
    const body = await res.json();
    const ids = body.data.evaluaciones.map((e: { evaluacionId: string }) => e.evaluacionId);
    expect(ids).not.toContain(mock.evaluacionSanJose);
  });
});
