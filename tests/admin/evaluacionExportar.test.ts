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

  test("200 y genera una hoja por categoría con numeración independiente por formulario", async () => {
    const res = await fetch(`${server.url}/api/admin/evaluaciones/${mock.evaluacionSanJose}/exportar`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(res.headers.get("Content-Disposition")).toContain("attachment");

    const buffer = await res.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    expect(wb.worksheets.map(ws => ws.name)).toEqual([
      "Emociones",
      "Bienestar Psicológico",
      "Aprendizaje",
    ]);

    const emociones = wb.getWorksheet("Emociones")!;
    const bienestar = wb.getWorksheet("Bienestar Psicológico")!;
    const aprendizaje = wb.getWorksheet("Aprendizaje")!;
    [emociones, bienestar, aprendizaje].forEach(ws => {
      expect(ws.rowCount).toBeGreaterThan(1);
      const encabezados = ws.getRow(1).values as unknown[];
      expect(encabezados[1]).toBe("Estudiante");
      expect(encabezados[2]).toMatch(/^1\. /);
      expect(ws.getCell(1, 2).fill).toMatchObject({
        fgColor: { argb: expect.any(String) },
      });
    });

    expect(emociones.getCell(1, 2).fill).toMatchObject({ fgColor: { argb: "FF8D54FF" } });
    expect(bienestar.getCell(1, 2).fill).toMatchObject({ fgColor: { argb: "FF7FD858" } });
    expect(aprendizaje.getCell(1, 2).fill).toMatchObject({ fgColor: { argb: "FF37B7FF" } });

    const emocionRows = [] as unknown[][];
    emociones.eachRow((row, idx) => {
      if (idx === 1) return;
      emocionRows.push(row.values as unknown[]);
    });
    expect(emocionRows.some(row => row[1] === "Ana López García" && row.includes("Bien"))).toBe(true);

    const bienestarRows = [] as unknown[][];
    bienestar.eachRow((row, idx) => {
      if (idx === 1) return;
      bienestarRows.push(row.values as unknown[]);
    });
    expect(bienestarRows.some(row => row.includes("Bien"))).toBe(false);

    const aprendizajeRows = [] as unknown[][];
    aprendizaje.eachRow((row, idx) => {
      if (idx === 1) return;
      aprendizajeRows.push(row.values as unknown[]);
    });
    expect(aprendizajeRows.some(row => row[1] === "Carmen Ruiz Sol")).toBe(true);
  });

  test("filtra por categoría cuando se pasa ?categoria=", async () => {
    const res = await fetch(
      `${server.url}/api/admin/evaluaciones/${mock.evaluacionSanJose}/exportar?categoria=bienestar_psicologico`
    );
    // Ninguna respuesta registrada para bienestar_psicologico en el mock data
    expect(res.status).toBe(404);
  });
});
