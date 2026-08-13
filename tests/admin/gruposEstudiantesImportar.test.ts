import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import ExcelJS from "exceljs";
import { createTestServer, resetDb, sql } from "../setup";
import { gruposEstudiantesImportarRoutes } from "../../src/routes";
import { mock, createEstudiante } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/grupos/:id/estudiantes/importar": gruposEstudiantesImportarRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

async function construirXlsx(filas: Array<{ nombre: string; curp: string }>) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Alumnos");
  ws.columns = [
    { header: "Nombre completo", key: "nombre" },
    { header: "CURP", key: "curp" },
  ];
  filas.forEach(f => ws.addRow(f));
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], "alumnos.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const post = (grupoId: string, archivo: File | null) => {
  const form = new FormData();
  if (archivo) form.set("archivo", archivo);
  return fetch(`${server.url}/api/admin/grupos/${grupoId}/estudiantes/importar`, { method: "POST", body: form });
};

describe("POST /api/admin/grupos/:id/estudiantes/importar", () => {
  test("404 si el grupo no existe", async () => {
    const archivo = await construirXlsx([{ nombre: "Alumno Uno", curp: "" }]);
    const res = await post(crypto.randomUUID(), archivo);
    expect(res.status).toBe(404);
  });

  test("400 si no se envía archivo", async () => {
    const res = await post(mock.grupoA, null);
    expect(res.status).toBe(400);
  });

  test("201 y crea los alumnos válidos del archivo", async () => {
    const archivo = await construirXlsx([
      { nombre: "Alumno Uno", curp: "AAAA000101HDFAAA01" },
      { nombre: "Alumno Dos", curp: "" },
      { nombre: "  ", curp: "" }, // fila vacía, se ignora sin error
    ]);
    const res = await post(mock.grupoA, archivo);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.creados).toBe(2);
    expect(body.data.errores).toEqual([]);

    const estudiantes = await sql`SELECT * FROM estudiante WHERE grupo_id = ${mock.grupoA}`;
    expect(estudiantes.length).toBeGreaterThanOrEqual(2);
    expect(estudiantes.some(e => e.nombreCompleto === "Alumno Uno" && e.curp === "AAAA000101HDFAAA01")).toBe(true);
  });

  test("reporta como error las filas con CURP duplicado, sin bloquear el resto", async () => {
    const existente = await createEstudiante({ grupoId: mock.grupoA, curp: "DUPL000101HDFAAA99" });

    const archivo = await construirXlsx([
      { nombre: "Choca con existente", curp: existente.curp },
      { nombre: "Este sí se guarda", curp: "" },
    ]);
    const res = await post(mock.grupoA, archivo);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.creados).toBe(1);
    expect(body.data.errores).toHaveLength(1);
    expect(body.data.errores[0].motivo).toMatch(/CURP duplicado/);
  });

  test("detecta las columnas por el texto del encabezado aunque estén en otro orden", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Alumnos");
    ws.addRow(["CURP", "Nombre completo"]);
    ws.addRow(["ZZZZ000101HDFAAA01", "Alumno Invertido"]);
    const buffer = await wb.xlsx.writeBuffer();
    const archivo = new File([buffer], "alumnos.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    const res = await post(mock.grupoA, archivo);
    const body = await res.json();
    expect(body.data.creados).toBe(1);

    const [row] = await sql`SELECT * FROM estudiante WHERE nombre_completo = 'Alumno Invertido'`;
    expect(row.curp).toBe("ZZZZ000101HDFAAA01");
  });
});
