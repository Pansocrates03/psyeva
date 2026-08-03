import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createTestServer, resetDb, sql } from "../setup";
import { reportesRoutes } from "../../src/routes";
import { mock } from "../factories";

let server: ReturnType<typeof createTestServer>;
let uploadsDir: string;

beforeAll(async () => {
  // Aísla los PDFs subidos en un directorio temporal fuera del repo.
  uploadsDir = await mkdtemp(path.join(tmpdir(), "psyeva-uploads-"));
  process.env.UPLOADS_DIR = uploadsDir;
  server = createTestServer({ "/api/admin/reportes": reportesRoutes });
});
afterAll(async () => {
  server.stop();
  delete process.env.UPLOADS_DIR;
  await rm(uploadsDir, { recursive: true, force: true });
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

  test("201, guarda el PDF en disco e inserta el registro", async () => {
    const form = new FormData();
    form.set("archivo", pdfFile());
    form.set("tipo", "general");
    form.set("evaluacionId", mock.evaluacionSanJose);

    const res = await fetch(`${server.url}/api/admin/reportes`, { method: "POST", body: form });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.tipo).toBe("general");

    const [row] = await sql`SELECT * FROM reporte WHERE id = ${body.data.id}`;
    expect(row.evaluacionId).toBe(mock.evaluacionSanJose);

    const savedFile = Bun.file(path.join(uploadsDir, body.data.archivoUrl.replace("/uploads/", "")));
    expect(await savedFile.exists()).toBe(true);
  });
});
