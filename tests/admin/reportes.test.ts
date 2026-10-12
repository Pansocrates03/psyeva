import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { reportesRoutes, reportesStorageRoutes } from "../../src/routes";
import { mock } from "../factories";
import { deleteFile, uploadFile } from "../../src/services/storageService";

// Igual que con Postgres, no hay bucket de test separado: estos tests suben
// PDFs reales al MinIO local (ver docker-compose.yml → `docker compose up -d`).
// Si S3_ENDPOINT no apunta a un MinIO corriendo, solo falla el test que
// efectivamente sube un archivo (los demás no llegan a tocar storage).
let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({
    "/api/admin/reportes": reportesRoutes,
    "/api/admin/reportes/archivos-storage": reportesStorageRoutes,
  });
});
afterAll(() => {
  server.stop();
});
beforeEach(resetDb);

const pdfFile = (nombre = "reporte.pdf") =>
  new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], nombre, { type: "application/pdf" });

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

describe("GET /api/admin/reportes/archivos-storage", () => {
  test("400 si evaluacionId no es un UUID", async () => {
    const res = await fetch(`${server.url}/api/admin/reportes/archivos-storage?evaluacionId=invalido`);
    expect(res.status).toBe(400);
  });

  test("solo lista los archivos directamente dentro de la carpeta de la evaluación", async () => {
    const evaluacionId = mock.evaluacionSanJose;
    const marca = crypto.randomUUID();
    const prefijo = `reportes/${evaluacionId}/`;
    const keys = [
      `${prefijo}visible-${marca}.pdf`,
      `${prefijo}subcarpeta/ignorado-${marca}.pdf`,
      `reportes/${mock.evaluacionLiceo}/otra-evaluacion-${marca}.pdf`,
    ];

    await Promise.all(keys.map(key => uploadFile(key, new Uint8Array([0x25, 0x50, 0x44, 0x46]), "application/pdf")));
    try {
      const res = await fetch(`${server.url}/api/admin/reportes/archivos-storage?evaluacionId=${evaluacionId}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      const keysDevueltas = body.data.files.map((archivo: { key: string }) => archivo.key);
      expect(keysDevueltas).toContain(keys[0]);
      expect(keysDevueltas).not.toContain(keys[1]);
      expect(keysDevueltas).not.toContain(keys[2]);
      expect(body.data.folders).toContain("subcarpeta");
    } finally {
      await Promise.all(keys.map(key => deleteFile(key)));
    }
  });

  test("400 si la ruta intenta salir de la carpeta de reportes", async () => {
    const res = await fetch(`${server.url}/api/admin/reportes/archivos-storage?evaluacionId=${mock.evaluacionSanJose}&folder=..%2Fotra-evaluacion`);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/reportes/archivos-storage", () => {
  test("sube archivos sin evaluar ni asociar alumnos", async () => {
    const evaluacionId = crypto.randomUUID();
    const marca = crypto.randomUUID();
    const nombres = [`archivo-sin-alumno-${marca}-a.pdf`, `archivo-sin-alumno-${marca}-b.pdf`];
    const prefijo = `reportes/${evaluacionId}/`;
    const form = new FormData();
    form.set("evaluacionId", evaluacionId);
    nombres.forEach(nombre => form.append("archivos", pdfFile(nombre)));

    try {
      const res = await fetch(`${server.url}/api/admin/reportes/archivos-storage`, { method: "POST", body: form });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.subidos).toBe(2);
      expect(body.data.archivos).toEqual(nombres);

      const reportes = await sql`SELECT id FROM reporte WHERE evaluacion_id = ${evaluacionId}::uuid`;
      expect(reportes).toHaveLength(0);
    } finally {
      await Promise.all(nombres.map(nombre => deleteFile(`${prefijo}${nombre}`)));
    }
  });

  test("400 si se intenta subir un archivo que no es PDF", async () => {
    const form = new FormData();
    form.set("evaluacionId", crypto.randomUUID());
    form.append("archivos", new File(["texto"], "no-es-pdf.txt", { type: "text/plain" }));
    const res = await fetch(`${server.url}/api/admin/reportes/archivos-storage`, { method: "POST", body: form });
    expect(res.status).toBe(400);
  });

  test("crea una carpeta vacía y sube PDF dentro de ella", async () => {
    const evaluacionId = crypto.randomUUID();
    const folder = "Carpeta de prueba";
    const filename = "archivo-independiente.pdf";
    const folderKey = `reportes/${evaluacionId}/${folder}/`;
    const fileKey = `${folderKey}${filename}`;

    try {
      const formCarpeta = new FormData();
      formCarpeta.set("evaluacionId", evaluacionId);
      formCarpeta.set("folderName", folder);
      const respuestaCarpeta = await fetch(`${server.url}/api/admin/reportes/archivos-storage`, { method: "POST", body: formCarpeta });
      expect(respuestaCarpeta.status).toBe(201);

      const listaRaiz = await fetch(`${server.url}/api/admin/reportes/archivos-storage?evaluacionId=${evaluacionId}`);
      const raizBody = await listaRaiz.json();
      expect(raizBody.data.folders).toContain(folder);

      const formArchivo = new FormData();
      formArchivo.set("evaluacionId", evaluacionId);
      formArchivo.set("folder", folder);
      formArchivo.append("archivos", pdfFile(filename));
      const respuestaArchivo = await fetch(`${server.url}/api/admin/reportes/archivos-storage`, { method: "POST", body: formArchivo });
      expect(respuestaArchivo.status).toBe(201);

      const listaCarpeta = await fetch(`${server.url}/api/admin/reportes/archivos-storage?evaluacionId=${evaluacionId}&folder=${encodeURIComponent(folder)}`);
      const carpetaBody = await listaCarpeta.json();
      expect(carpetaBody.data.files.map((archivo: { key: string }) => archivo.key)).toContain(fileKey);
    } finally {
      await Promise.all([deleteFile(fileKey), deleteFile(folderKey)]);
    }
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
    expect(body.data.archivoUrl.split("?")[0]).toMatch(
      new RegExp(`/reportes/${mock.evaluacionSanJose}/reporte(?:-\\d+)?\\.pdf$`)
    );

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
