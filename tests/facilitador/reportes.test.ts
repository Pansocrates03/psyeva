import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb } from "../setup";
import { facilitadorReportesRoutes } from "../../src/routes";
import { mock, createReporte } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/facilitador/reportes": facilitadorReportesRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const get = (params: Record<string, string> = {}, headers: Record<string, string> = {}) =>
  fetch(`${server.url}/api/facilitador/reportes?${new URLSearchParams(params)}`, { headers });

describe("GET /api/facilitador/reportes", () => {
  test("401 si falta el header X-Colegio-Id", async () => {
    const res = await get();
    expect(res.status).toBe(401);
  });

  test("200 pero vacío si la evaluación del colegio no tiene reportes publicados", async () => {
    // San José: evaluacionSanJose tiene reportes_publicados = false
    const res = await get({}, { "X-Colegio-Id": mock.colegioSanJose });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.total).toBe(0);
  });

  test("200 y agrupa por tipo los reportes de evaluaciones publicadas", async () => {
    // Liceo: evaluacionLiceo tiene reportes_publicados = true y trae 1 reporte general
    const res = await get({}, { "X-Colegio-Id": mock.colegioLiceo });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.total).toBe(1);
    expect(body.data.reportes.general).toHaveLength(1);
    expect(body.data.reportes.general[0].id).toBe(mock.reporteGeneralLiceo);
  });

  test("nunca devuelve reportes de otro colegio aunque se filtre por evaluacionId", async () => {
    const res = await get(
      { evaluacionId: mock.evaluacionSanJose },
      { "X-Colegio-Id": mock.colegioLiceo }
    );
    const body = await res.json();
    expect(body.data.total).toBe(0);
  });

  test("respeta el filtro por tipo", async () => {
    const nuevo = await createReporte({
      tipo: "individual",
      evaluacionId: mock.evaluacionLiceo,
      estudianteId: mock.estudianteAna,
    });

    const res = await get(
      { tipo: "individual" },
      { "X-Colegio-Id": mock.colegioLiceo }
    );
    const body = await res.json();
    expect(body.data.reportes.individual).toHaveLength(1);
    expect(body.data.reportes.individual[0].id).toBe(nuevo.id);
    expect(body.data.reportes.general).toHaveLength(0);
  });
});
