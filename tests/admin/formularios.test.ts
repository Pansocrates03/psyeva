import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { formulariosRoutes } from "../../src/routes";
import { mock } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/formularios": formulariosRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const post = (body: unknown) =>
  fetch(`${server.url}/api/admin/formularios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const preguntaValida = (texto: string) => ({
  texto,
  opcionesRespuesta: [
    { valor: 1, texto: "Nunca" },
    { valor: 2, texto: "A veces" },
    { valor: 3, texto: "Siempre" },
  ],
});

describe("GET /api/admin/formularios", () => {
  test("200 y devuelve el catálogo con total de preguntas, más reciente primero", async () => {
    const res = await fetch(`${server.url}/api/admin/formularios`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(3);

    const emociones = body.data.find((f: { id: string }) => f.id === mock.formEmociones);
    expect(Number(emociones.totalPreguntas)).toBe(2);
  });
});

describe("POST /api/admin/formularios", () => {
  test("400 si faltan titulo o categoria", async () => {
    const res = await post({ preguntas: [preguntaValida("¿Cómo te sientes?")] });
    expect(res.status).toBe(400);
  });

  test("400 si categoria no es válida", async () => {
    const res = await post({
      titulo: "Test", categoria: "no-existe", preguntas: [preguntaValida("¿?")],
    });
    expect(res.status).toBe(400);
  });

  test("400 si preguntas está vacío", async () => {
    const res = await post({ titulo: "Test", categoria: "emociones", preguntas: [] });
    expect(res.status).toBe(400);
  });

  test("400 si una pregunta no tiene suficientes opciones", async () => {
    const res = await post({
      titulo: "Test",
      categoria: "emociones",
      preguntas: [{ texto: "¿?", opcionesRespuesta: [{ valor: 1, texto: "Sí" }] }],
    });
    expect(res.status).toBe(400);
  });

  test("201 y crea el formulario con sus preguntas de forma atómica", async () => {
    const res = await post({
      titulo: "Nueva encuesta",
      descripcion: "Descripción de prueba",
      categoria: "aprendizaje",
      preguntas: [preguntaValida("¿Pregunta 1?"), preguntaValida("¿Pregunta 2?")],
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.titulo).toBe("Nueva encuesta");

    const preguntas = await sql`SELECT * FROM pregunta WHERE formulario_id = ${body.data.id}`;
    expect(preguntas).toHaveLength(2);
    expect(preguntas[0]!.opcionesRespuesta).toHaveLength(3);
  });
});
