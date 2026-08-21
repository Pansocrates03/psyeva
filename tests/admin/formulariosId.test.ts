import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { formulariosIdRoutes } from "../../src/routes";
import { mock, createFormulario } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({ "/api/admin/formularios/:id": formulariosIdRoutes });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const patch = (id: string, body: unknown) =>
  fetch(`${server.url}/api/admin/formularios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const del = (id: string) => fetch(`${server.url}/api/admin/formularios/${id}`, { method: "DELETE" });

const seccionValida = (textoPregunta: string) => ({
  instruccionTexto: "Contesta sí o no.",
  opcionesRespuesta: [{ valor: 1, texto: "Sí" }, { valor: 2, texto: "No" }],
  preguntas: [{ texto: textoPregunta }],
});

describe("GET /api/admin/formularios/:id", () => {
  test("404 si no existe", async () => {
    const res = await fetch(`${server.url}/api/admin/formularios/${crypto.randomUUID()}`);
    expect(res.status).toBe(404);
  });

  test("200 y devuelve el formulario con sus secciones y preguntas", async () => {
    const res = await fetch(`${server.url}/api/admin/formularios/${mock.formEmociones}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.titulo).toBe("Bienestar emocional");
    // el seed pone cada pregunta en su propia sección (ver reset-and-seed.sql)
    expect(body.data.secciones).toHaveLength(2);
    expect(body.data.secciones[0].preguntas).toHaveLength(1);
    expect(body.data.secciones[0].opcionesRespuesta.length).toBeGreaterThanOrEqual(2);
  });
});

describe("PATCH /api/admin/formularios/:id", () => {
  test("404 si no existe", async () => {
    const res = await patch(crypto.randomUUID(), { titulo: "X" });
    expect(res.status).toBe(404);
  });

  test("400 si categoria no es válida", async () => {
    const res = await patch(mock.formEmociones, { categoria: "no-existe" });
    expect(res.status).toBe(400);
  });

  test("200 y actualiza solo metadatos si no se envían secciones", async () => {
    const res = await patch(mock.formEmociones, { titulo: "Bienestar emocional v2" });
    expect(res.status).toBe(200);

    const seccionesAntes = await sql`SELECT id FROM seccion WHERE formulario_id = ${mock.formEmociones}`;
    expect(seccionesAntes).toHaveLength(2); // no se tocaron
  });

  test("200 y reemplaza el set de secciones cuando se envía uno nuevo", async () => {
    // Formulario recién creado, sin secciones ni respuestas todavía
    const formulario = await createFormulario();
    const res = await patch(formulario.id, {
      secciones: [seccionValida("Nueva pregunta única")],
    });
    expect(res.status).toBe(200);

    const preguntas = await sql`
      SELECT p.texto FROM pregunta p
      JOIN seccion s ON s.id = p.seccion_id
      WHERE s.formulario_id = ${formulario.id}
    `;
    expect(preguntas).toHaveLength(1);
    expect(preguntas[0]!.texto).toBe("Nueva pregunta única");
  });

  test("409 si alguna de las preguntas actuales ya tiene respuestas registradas", async () => {
    // formEmociones ya tiene respuestas de Ana/Bruno en el mock data
    const res = await patch(mock.formEmociones, {
      secciones: [seccionValida("Pregunta nueva")],
    });
    expect(res.status).toBe(409);

    const secciones = await sql`SELECT id FROM seccion WHERE formulario_id = ${mock.formEmociones}`;
    expect(secciones).toHaveLength(2); // no se tocaron
  });
});

describe("DELETE /api/admin/formularios/:id", () => {
  test("404 si no existe", async () => {
    const res = await del(crypto.randomUUID());
    expect(res.status).toBe(404);
  });

  test("409 si algún grupo lo tiene asignado", async () => {
    const res = await del(mock.formEmociones); // asignado a grupoA/grupoB en el mock data
    expect(res.status).toBe(409);
  });

  test("200 y elimina un formulario sin uso", async () => {
    const formulario = await createFormulario();
    const res = await del(formulario.id);
    expect(res.status).toBe(200);

    const [row] = await sql`SELECT id FROM formulario WHERE id = ${formulario.id}`;
    expect(row).toBeUndefined();
  });
});
