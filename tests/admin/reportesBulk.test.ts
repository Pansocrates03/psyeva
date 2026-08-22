import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { reportesBulkRoutes } from "../../src/routes";
import { mock } from "../factories";

// Igual que tests/admin/reportes.test.ts: no hay bucket de test separado,
// así que los casos que llegan a "asignado" suben un PDF real al MinIO
// local (ver docker-compose.yml → `docker compose up -d`).
let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/reportes/bulk": reportesBulkRoutes });
});
afterAll(() => {
  server.stop();
});
beforeEach(resetDb);

const pdfFile = (nombre: string) =>
  new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], nombre, { type: "application/pdf" });

// db/reset-and-seed.sql: evaluacionSanJose tiene 3 alumnos —
// Ana López García y Bruno Pérez Cruz (grupoA), Carmen Ruiz Sol (grupoB).
async function subirBulk(nombresArchivo: string[]) {
  const form = new FormData();
  form.set("evaluacionId", mock.evaluacionSanJose);
  for (const nombre of nombresArchivo) form.append("archivos", pdfFile(nombre));
  const res = await fetch(`${server.url}/api/admin/reportes/bulk`, { method: "POST", body: form });
  const body = await res.json();
  return { res, body };
}

describe("POST /api/admin/reportes/bulk", () => {
  test("400 si faltan evaluacionId o archivos", async () => {
    const form = new FormData();
    form.set("evaluacionId", mock.evaluacionSanJose);
    const res = await fetch(`${server.url}/api/admin/reportes/bulk`, { method: "POST", body: form });
    expect(res.status).toBe(400);
  });

  test("404 si la evaluación no tiene alumnos", async () => {
    // evaluacionLiceo no tiene alumnos en el seed — se usa acá a propósito
    const form = new FormData();
    form.set("evaluacionId", mock.evaluacionLiceo);
    form.append("archivos", pdfFile("cualquiera.pdf"));
    const res = await fetch(`${server.url}/api/admin/reportes/bulk`, { method: "POST", body: form });
    expect(res.status).toBe(404);
  });

  test("asigna por coincidencia exacta (nombre como sufijo del archivo)", async () => {
    const { res, body } = await subirBulk([
      "Colegio Inglés Americano - 2025-2026 - 1°1A - Ana López García.pdf",
    ]);
    expect(res.status).toBe(201);
    expect(body.data.asignados).toBe(1);
    expect(body.data.resultados[0].estado).toBe("asignado");
    expect(body.data.resultados[0].estudianteId).toBe(mock.estudianteAna);
    expect(body.data.resultados[0].porcentaje).toBe(100);

    const [reporte] = await sql`SELECT * FROM reporte WHERE estudiante_id = ${mock.estudianteAna}`;
    expect(reporte.tipo).toBe("individual");
    // Un reporte individual siempre lleva grupo_id NULL (constraint
    // reporte_individual_sin_grupo) — el grupo se deriva de estudiante_id.
    expect(reporte.grupoId).toBeNull();
  });

  test("ignora acentos al comparar (regresión: el regex de diacríticos debe seguir funcionando)", async () => {
    // "Lopez Garcia" sin acentos contra "López García" en la BD.
    const { res, body } = await subirBulk(["Reporte - Bruno Perez Cruz.pdf"]);
    expect(res.status).toBe(201);
    expect(body.data.resultados[0].estado).toBe("asignado");
    expect(body.data.resultados[0].estudianteId).toBe(mock.estudianteBruno);
  });

  test("reconoce el nombre con apellido primero (regresión: tokens() debe separar por palabra)", async () => {
    // Si el split de tokens() no separa por espacios, coberturaTokens es
    // siempre 0 y este caso (que no es substring exacto) cae por debajo
    // del umbral de 0.55 aunque sea la persona correcta.
    const { res, body } = await subirBulk(["Ruiz Sol, Carmen - reporte final.pdf"]);
    expect(res.status).toBe(201);
    expect(body.data.resultados[0].estado).toBe("asignado");
    expect(body.data.resultados[0].estudianteId).toBe(mock.estudianteCarmen);
  });

  test("marca sin_coincidencia cuando el archivo no se parece a ningún alumno", async () => {
    const { res, body } = await subirBulk(["documento_random_xyz.pdf"]);
    expect(res.status).toBe(201);
    expect(body.data.asignados).toBe(0);
    expect(body.data.resultados[0].estado).toBe("sin_coincidencia");
  });

  test("marca duplicado cuando dos archivos apuntan al mismo alumno", async () => {
    const { res, body } = await subirBulk([
      "Ana López García - v1.pdf",
      "Ana López García - v2.pdf",
    ]);
    expect(res.status).toBe(201);
    expect(body.data.asignados).toBe(1);
    const estados = body.data.resultados.map((r: { estado: string }) => r.estado).sort();
    expect(estados).toEqual(["asignado", "duplicado"]);
  });

  test("marca invalido para archivos que no son PDF", async () => {
    const form = new FormData();
    form.set("evaluacionId", mock.evaluacionSanJose);
    form.append("archivos", new File(["texto"], "no-es-pdf.txt", { type: "text/plain" }));
    const res = await fetch(`${server.url}/api/admin/reportes/bulk`, { method: "POST", body: form });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.resultados[0].estado).toBe("invalido");
  });
});
