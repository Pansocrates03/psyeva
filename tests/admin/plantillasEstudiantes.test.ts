import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import ExcelJS from "exceljs";
import { createTestServer } from "../setup";
import { plantillasEstudiantesRoutes } from "../../src/routes";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/plantillas/estudiantes": plantillasEstudiantesRoutes });
});
afterAll(() => server.stop());

describe("GET /api/admin/plantillas/estudiantes", () => {
  test("200 y devuelve un .xlsx válido con los encabezados esperados", async () => {
    const res = await fetch(`${server.url}/api/admin/plantillas/estudiantes`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(res.headers.get("Content-Disposition")).toContain("plantilla-estudiantes.xlsx");

    const buffer = await res.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const ws = wb.getWorksheet("Alumnos")!;
    expect(ws).toBeTruthy();

    const header = ws.getRow(1).values as unknown[];
    expect(header).toContain("Nombre completo");
    expect(header).toContain("CURP");
    expect(ws.rowCount).toBeGreaterThan(1); // trae al menos una fila de ejemplo
  });
});
