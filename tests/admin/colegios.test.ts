import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { colegiosRoutes } from "../../src/routes";
import { mock } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/colegios": colegiosRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

describe("GET /api/admin/colegios", () => {
  test("200 y devuelve los colegios ordenados por nombre con su total de evaluaciones", async () => {
    const res = await fetch(`${server.url}/api/admin/colegios`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(2);

    const sanJose = body.data.find((c: { id: string }) => c.id === mock.colegioSanJose);
    expect(sanJose.nombre).toBe("Colegio San José");
    expect(Number(sanJose.totalEvaluaciones)).toBe(1);
  });
});

describe("POST /api/admin/colegios", () => {
  const post = (body: unknown) =>
    fetch(`${server.url}/api/admin/colegios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  test("400 si faltan campos requeridos", async () => {
    const res = await post({ nombre: "Colegio nuevo" });
    expect(res.status).toBe(400);
  });

  test("409 si ya existe un colegio con esa clave de acceso (sin importar mayúsculas)", async () => {
    const res = await post({ nombre: "Otro nombre", claveAcceso: "SAN-JOSE-2026" });
    expect(res.status).toBe(409);
  });

  test("201 y crea el colegio", async () => {
    const res = await post({ nombre: "Colegio Nuevo", claveAcceso: "colegio-nuevo-2026" });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.nombre).toBe("Colegio Nuevo");

    const [row] = await sql`SELECT * FROM colegio WHERE id = ${body.data.id}`;
    expect(row.claveAcceso).toBe("colegio-nuevo-2026");
  });
});
