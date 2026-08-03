import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import ExcelJS from "exceljs";
import { createTestServer, resetDb } from "../setup";
import { evaluacionExportarRoutes } from "../../src/routes";
import { mock, createEvaluacion } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/evaluaciones/:id/exportar": evaluacionExportarRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

describe("GET /api/admin/evaluaciones/:id/exportar", () => {
  test("404 si la evaluación no existe", async () => {
    const res = await fetch(`${server.url}/api/admin/evaluaciones/${crypto.randomUUID()}/exportar`);
    expect(res.status).toBe(404);
  });

  test("404 si la evaluación existe pero no tiene respuestas registradas", async () => {
    const evaluacion = await createEvaluacion();
    const res = await fetch(`${server.url}/api/admin/evaluaciones/${evaluacion.id}/exportar`);
    expect(res.status).toBe(404);
  });

  test("200 y genera un .xlsx real con una fila por respuesta", async () => {
    const res = await fetch(`${server.url}/api/admin/evaluaciones/${mock.evaluacionSanJose}/exportar`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(res.headers.get("Content-Disposition")).toContain("attachment");

    const buffer = await res.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const ws = wb.getWorksheet("Respuestas")!;
    expect(ws).toBeTruthy();

    // mock-data.sql tiene 4 respuestas registradas para evaluacionSanJose
    // (fila 1 es el encabezado)
    expect(ws.rowCount).toBe(5);

    const headerValues = ws.getRow(1).values as unknown[];
    expect(headerValues).toContain("Alumno");
    expect(headerValues).toContain("Respuesta");

    const bodyRows = [] as Record<string, unknown>[];
    ws.eachRow((row, idx) => {
      if (idx === 1) return;
      bodyRows.push({
        alumno: row.getCell(5).value,
        respuesta: row.getCell(10).value,
      });
    });
    expect(bodyRows.some(r => r.alumno === "Ana López García" && r.respuesta === "Bien")).toBe(true);
  });

  test("filtra por categoría cuando se pasa ?categoria=", async () => {
    const res = await fetch(
      `${server.url}/api/admin/evaluaciones/${mock.evaluacionSanJose}/exportar?categoria=bienestar_psicologico`
    );
    // Ninguna respuesta registrada para bienestar_psicologico en el mock data
    expect(res.status).toBe(404);
  });
});
