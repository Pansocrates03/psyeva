import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { reportesRoutes } from "../../src/routes";
import { mock } from "../factories";

// Igual que con Postgres, no hay bucket de test separado: estos tests suben
// PDFs reales al MinIO local (ver docker-compose.yml → `docker compose up -d`).
// Si S3_ENDPOINT no apunta a un MinIO corriendo, solo falla el test que
// efectivamente sube un archivo (los demás no llegan a tocar storage).
let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/reportes": reportesRoutes });
});
afterAll(() => {
  server.stop();
});
beforeEach(resetDb);

const pdfFile = () =>
  new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "reporte.pdf", { type: "application/pdf" });

describe("GET /api/admin/reportes", () => {
  test("200 y devuelve todos los reportes con datos de evaluación/colegio", async () => {
    const res = await fetch(`${server.url}/api/admin/reportes`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(3);
  });

  test("filtra por evaluacionId", async () => {
    const res = await fetch(`${server.url}/api/admin/reportes?evaluacionId=${mock.evaluacionLiceo}`);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(mock.reporteGeneralLiceo);
  });

  test("filtra por tipo", async () => {
    const res = await fetch(`${server.url}/api/admin/reportes?tipo=grupal`);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(mock.reporteGrupalGrupoA);
  });
});

describe("POST /api/admin/reportes", () => {
  test("400 si faltan campos requeridos", async () => {
    const form = new FormData();
    form.set("tipo", "general");
    const res = await fetch(`${server.url}/api/admin/reportes`, { method: "POST", body: form });
    expect(res.status).toBe(400);
  });

  test("400 si el archivo no es un PDF", async () => {
    const form = new FormData();
    form.set("archivo", new File(["texto"], "reporte.txt", { type: "text/plain" }));
    form.set("tipo", "general");
    form.set("evaluacionId", mock.evaluacionSanJose);
    const res = await fetch(`${server.url}/api/admin/reportes`, { method: "POST", body: form });
    expect(res.status).toBe(400);
  });

  test("400 si falta grupoId para un reporte grupal", async () => {
    const form = new FormData();
    form.set("archivo", pdfFile());
    form.set("tipo", "grupal");
    form.set("evaluacionId", mock.evaluacionSanJose);
    const res = await fetch(`${server.url}/api/admin/reportes`, { method: "POST", body: form });
    expect(res.status).toBe(400);
  });

  test("404 si la evaluación no existe", async () => {
    const form = new FormData();
    form.set("archivo", pdfFile());
    form.set("tipo", "general");
    form.set("evaluacionId", crypto.randomUUID());
    const res = await fetch(`${server.url}/api/admin/reportes`, { method: "POST", body: form });
    expect(res.status).toBe(404);
  });

  test("201, sube el PDF al bucket e inserta el registro", async () => {
    const form = new FormData();
    form.set("archivo", pdfFile());
    form.set("tipo", "general");
    form.set("evaluacionId", mock.evaluacionSanJose);

    const res = await fetch(`${server.url}/api/admin/reportes`, { method: "POST", body: form });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.tipo).toBe("general");
    expect(body.data.archivoUrl).toContain("/reportes/general_");

    const [row] = await sql`SELECT * FROM reporte WHERE id = ${body.data.id}`;
    expect(row.evaluacionId).toBe(mock.evaluacionSanJose);

    // El bucket queda público de lectura (ver docker-compose.yml, servicio
    // "init") — la URL devuelta debe servir el PDF real, no un 403/404.
    const uploaded = await fetch(body.data.archivoUrl);
    expect(uploaded.status).toBe(200);
    const buffer = new Uint8Array(await uploaded.arrayBuffer());
    expect(buffer[0]).toBe(0x25); // "%PDF"
  });
});
