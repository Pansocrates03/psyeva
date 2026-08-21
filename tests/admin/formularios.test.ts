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

const seccionValida = (textoPregunta: string) => ({
  instruccionTexto: "Lee la pregunta y contesta qué tan seguido te pasa.",
  opcionesRespuesta: [
    { valor: 1, texto: "Nunca" },
    { valor: 2, texto: "A veces" },
    { valor: 3, texto: "Siempre" },
  ],
  preguntas: [{ texto: textoPregunta }],
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
    const res = await post({ secciones: [seccionValida("¿Cómo te sientes?")] });
    expect(res.status).toBe(400);
  });

  test("400 si categoria no es válida", async () => {
    const res = await post({
      titulo: "Test", categoria: "no-existe", secciones: [seccionValida("¿?")],
    });
    expect(res.status).toBe(400);
  });

  test("400 si secciones está vacío", async () => {
    const res = await post({ titulo: "Test", categoria: "emociones", secciones: [] });
    expect(res.status).toBe(400);
  });

  test("400 si una sección no tiene instrucción (ni texto ni imagen)", async () => {
    const res = await post({
      titulo: "Test",
      categoria: "emociones",
      secciones: [{
        opcionesRespuesta: [{ valor: 1, texto: "Sí" }, { valor: 2, texto: "No" }],
        preguntas: [{ texto: "¿?" }],
      }],
    });
    expect(res.status).toBe(400);
  });

  test("400 si una sección no tiene suficientes opciones", async () => {
    const res = await post({
      titulo: "Test",
      categoria: "emociones",
      secciones: [{
        instruccionTexto: "Contesta sí o no.",
        opcionesRespuesta: [{ valor: 1, texto: "Sí" }],
        preguntas: [{ texto: "¿?" }],
      }],
    });
    expect(res.status).toBe(400);
  });

  test("400 si una sección no tiene preguntas", async () => {
    const res = await post({
      titulo: "Test",
      categoria: "emociones",
      secciones: [{
        instruccionTexto: "Contesta sí o no.",
        opcionesRespuesta: [{ valor: 1, texto: "Sí" }, { valor: 2, texto: "No" }],
        preguntas: [],
      }],
    });
    expect(res.status).toBe(400);
  });

  test("201 y crea el formulario con sus secciones y preguntas de forma atómica", async () => {
    const res = await post({
      titulo: "Nueva encuesta",
      descripcion: "Descripción de prueba",
      categoria: "aprendizaje",
      secciones: [
        seccionValida("¿Pregunta 1?"),
        {
          instruccionTexto: "Sí / No",
          opcionesRespuesta: [{ valor: 1, texto: "Sí" }, { valor: 2, texto: "No" }],
          preguntas: [{ texto: "¿Pregunta 2?" }, { texto: "¿Pregunta 3?" }],
        },
      ],
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.titulo).toBe("Nueva encuesta");

    const secciones = await sql`
      SELECT * FROM seccion WHERE formulario_id = ${body.data.id} ORDER BY orden
    `;
    expect(secciones).toHaveLength(2);
    expect(secciones[0]!.opcionesRespuesta).toHaveLength(3);
    expect(secciones[1]!.opcionesRespuesta).toHaveLength(2);

    const preguntas = await sql`
      SELECT p.* FROM pregunta p
      JOIN seccion s ON s.id = p.seccion_id
      WHERE s.formulario_id = ${body.data.id}
    `;
    expect(preguntas).toHaveLength(3);
  });
});
