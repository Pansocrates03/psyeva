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

  test("200 y genera un .xlsx con una fila por estudiante y una columna por pregunta", async () => {
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

    // El exportador pivotea las respuestas: una fila por alumno + encabezado.
    expect(ws.rowCount).toBeGreaterThan(1);

    const headerValues = ws.getRow(1).values as unknown[];
    expect(headerValues[1]).toBe("Estudiante");
    expect(headerValues.filter(value => /^\d+\. /.test(String(value))).length).toBeGreaterThan(0);

    const bodyRows = [] as unknown[][];
    ws.eachRow((row, idx) => {
      if (idx === 1) return;
      bodyRows.push(row.values as unknown[]);
    });
    expect(bodyRows.some(row => row[1] === "Ana López García" && row.includes("Bien"))).toBe(true);
    expect(bodyRows.some(row => row[1] === "Carmen Ruiz Sol")).toBe(true);
  });

  test("filtra por categoría cuando se pasa ?categoria=", async () => {
    const res = await fetch(
      `${server.url}/api/admin/evaluaciones/${mock.evaluacionSanJose}/exportar?categoria=bienestar_psicologico`
    );
    // Ninguna respuesta registrada para bienestar_psicologico en el mock data
    expect(res.status).toBe(404);
  });
});
