import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createTestServer } from "../setup";
import { imagenesRoutes } from "../../src/routes";

// Igual que reportes.test.ts: no hay bucket de test separado, esto sube
// imágenes reales al MinIO local (`docker compose up -d`). Si S3_ENDPOINT
// no apunta a un MinIO corriendo, solo fallan los tests que efectivamente
// suben/borran un archivo.
let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/imagenes": imagenesRoutes });
});
afterAll(() => server.stop());

const pngFile = (nombre = "test.png") =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], nombre, { type: "image/png" });

const subir = (carpeta: string, archivo: File) => {
  const form = new FormData();
  form.set("carpeta", carpeta);
  form.set("archivo", archivo);
  return fetch(`${server.url}/api/admin/imagenes`, { method: "POST", body: form });
};

describe("GET /api/admin/imagenes", () => {
  test("400 si la carpeta no está en el allowlist", async () => {
    const res = await fetch(`${server.url}/api/admin/imagenes?carpeta=reportes`);
    expect(res.status).toBe(400);
  });

  test.each([
    "assets/instrucciones",
    "assets/preguntas_emociones",
    "assets/preguntas_aprendizaje",
    "assets/preguntas_psico",
  ])("200 y devuelve un array para %s", async carpeta => {
    const res = await fetch(`${server.url}/api/admin/imagenes?carpeta=${carpeta}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe("POST /api/admin/imagenes", () => {
  test("400 si la carpeta no está en el allowlist", async () => {
    const res = await subir("reportes", pngFile());
    expect(res.status).toBe(400);
  });

  test("400 si falta el archivo", async () => {
    const form = new FormData();
    form.set("carpeta", "assets/preguntas_emociones");
    const res = await fetch(`${server.url}/api/admin/imagenes`, { method: "POST", body: form });
    expect(res.status).toBe(400);
  });

  test("400 si el archivo no es una imagen permitida", async () => {
    const archivo = new File([new Uint8Array([0x25])], "no-imagen.pdf", { type: "application/pdf" });
    const res = await subir("assets/preguntas_emociones", archivo);
    expect(res.status).toBe(400);
  });

  test("201, sube la imagen al bucket y la deja lista para listarse", async () => {
    const res = await subir("assets/preguntas_emociones", pngFile("subida-test.png"));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.key).toStartWith("assets/preguntas_emociones/");
    expect(body.data.key).toContain("subida-test.png");
    expect(body.data.url).toContain(body.data.key);

    const listado = await fetch(`${server.url}/api/admin/imagenes?carpeta=assets/preguntas_emociones`);
    const listadoBody = await listado.json();
    expect(listadoBody.data.some((img: { key: string }) => img.key === body.data.key)).toBe(true);

    // limpieza
    await fetch(
      `${server.url}/api/admin/imagenes?carpeta=assets/preguntas_emociones&key=${encodeURIComponent(body.data.key)}`,
      { method: "DELETE" }
    );
  });
});

describe("DELETE /api/admin/imagenes", () => {
  test("400 si la carpeta no está en el allowlist", async () => {
    const res = await fetch(`${server.url}/api/admin/imagenes?carpeta=reportes&key=reportes/algo.pdf`, { method: "DELETE" });
    expect(res.status).toBe(400);
  });

  test("400 si el key no pertenece a la carpeta indicada", async () => {
    const res = await fetch(
      `${server.url}/api/admin/imagenes?carpeta=assets/preguntas_emociones&key=assets/instrucciones/otra.png`,
      { method: "DELETE" }
    );
    expect(res.status).toBe(400);
  });

  test("200 y borra la imagen — deja de aparecer en el listado", async () => {
    const subida = await subir("assets/preguntas_emociones", pngFile("borrar-test.png"));
    const { data } = await subida.json();

    const res = await fetch(
      `${server.url}/api/admin/imagenes?carpeta=assets/preguntas_emociones&key=${encodeURIComponent(data.key)}`,
      { method: "DELETE" }
    );
    expect(res.status).toBe(200);

    const listado = await fetch(`${server.url}/api/admin/imagenes?carpeta=assets/preguntas_emociones`);
    const listadoBody = await listado.json();
    expect(listadoBody.data.some((img: { key: string }) => img.key === data.key)).toBe(false);
  });
});
