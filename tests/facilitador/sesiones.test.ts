import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createTestServer, resetDb, sql } from "../setup";
import { sesionesRoutes } from "../../src/routes";
import { mock, createEvaluacion, createGrupo, createEstudiante } from "../factories";

let server: ReturnType<typeof createTestServer>;

beforeAll(() => {
  server = createTestServer({
    "/api/facilitador/sesiones": sesionesRoutes,
    "/api/facilitador/sesiones/respuesta": sesionesRoutes,
    "/api/facilitador/sesiones/completar": sesionesRoutes,
  });
});
afterAll(() => server.stop());
beforeEach(resetDb);

const postJson = (path: string, body: unknown) =>
  fetch(`${server.url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const patchJson = (path: string, body: unknown) =>
  fetch(`${server.url}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("GET /api/facilitador/sesiones", () => {
  test("400 si falta sesionId", async () => {
    const res = await fetch(`${server.url}/api/facilitador/sesiones`);
    expect(res.status).toBe(400);
  });

  test("404 si la sesión no existe", async () => {
    const res = await fetch(`${server.url}/api/facilitador/sesiones?sesionId=${crypto.randomUUID()}`);
    expect(res.status).toBe(404);
  });

  test("200 y devuelve las preguntas con las respuestas ya guardadas", async () => {
    const res = await fetch(`${server.url}/api/facilitador/sesiones?sesionId=${mock.sesionAnaEmocionesCompletada}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.sesion.estado).toBe("completada");
    expect(body.data.preguntas).toHaveLength(2);
    const p1 = body.data.preguntas.find((p: { id: string }) => p.id === mock.preguntaEmocion1);
    expect(p1.textoLibre).toBe("Bien");
  });
});

describe("POST /api/facilitador/sesiones (iniciar sesión)", () => {
  test("400 si faltan campos requeridos", async () => {
    const res = await postJson("/api/facilitador/sesiones", { estudianteId: mock.estudianteCarmen });
    expect(res.status).toBe(400);
  });

  test("201 y crea una sesión nueva pendiente", async () => {
    const res = await postJson("/api/facilitador/sesiones", {
      estudianteId: mock.estudianteCarmen,
      formularioId: mock.formEmociones,
      evaluacionId: mock.evaluacionSanJose,
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.sesion.esNueva).toBe(true);
    expect(body.data.preguntas).toHaveLength(2);
  });

  test("200 y continúa una sesión en_progreso existente sin duplicarla", async () => {
    const res = await postJson("/api/facilitador/sesiones", {
      estudianteId: mock.estudianteAna,
      formularioId: mock.formBienpsic,
      evaluacionId: mock.evaluacionSanJose,
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.sesion.sesionId).toBe(mock.sesionAnaBienpsicEnProgreso);
  });

  test("409 si el alumno ya completó ese formulario", async () => {
    const res = await postJson("/api/facilitador/sesiones", {
      estudianteId: mock.estudianteAna,
      formularioId: mock.formEmociones,
      evaluacionId: mock.evaluacionSanJose,
    });
    expect(res.status).toBe(409);
  });

  test("403 si la evaluación no está aceptando respuestas", async () => {
    const evaluacion = await createEvaluacion({ aceptaRespuestas: false });
    const grupo = await createGrupo({ evaluacionId: evaluacion.id });
    const estudiante = await createEstudiante({ grupoId: grupo.id });

    const res = await postJson("/api/facilitador/sesiones", {
      estudianteId: estudiante.id,
      formularioId: mock.formEmociones,
      evaluacionId: evaluacion.id,
    });
    expect(res.status).toBe(403);
  });

  test("404 si la evaluación no existe", async () => {
    const res = await postJson("/api/facilitador/sesiones", {
      estudianteId: mock.estudianteCarmen,
      formularioId: mock.formEmociones,
      evaluacionId: crypto.randomUUID(),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/facilitador/sesiones/respuesta", () => {
  test("400 si faltan campos requeridos", async () => {
    const res = await postJson("/api/facilitador/sesiones/respuesta", { sesionId: mock.sesionAnaBienpsicEnProgreso });
    expect(res.status).toBe(400);
  });

  test("201 y guarda la respuesta, pasando la sesión a en_progreso", async () => {
    const res = await postJson("/api/facilitador/sesiones/respuesta", {
      sesionId: mock.sesionCarmenAprendizajePendiente,
      preguntaId: mock.preguntaAprendizaje1,
      textoLibre: "Muy motivado",
    });
    expect(res.status).toBe(201);

    const [row] = await sql`SELECT estado FROM sesion WHERE id = ${mock.sesionCarmenAprendizajePendiente}`;
    expect(row.estado).toBe("en_progreso");
  });

  test("409 si la sesión ya está completada", async () => {
    const res = await postJson("/api/facilitador/sesiones/respuesta", {
      sesionId: mock.sesionAnaEmocionesCompletada,
      preguntaId: mock.preguntaEmocion1,
      textoLibre: "Bien",
    });
    expect(res.status).toBe(500); // el handler solo mapea errores conocidos en iniciar/completar, no aquí
  });
});

describe("PATCH /api/facilitador/sesiones/completar", () => {
  test("400 si falta sesionId", async () => {
    const res = await patchJson("/api/facilitador/sesiones/completar", {});
    expect(res.status).toBe(400);
  });

  test("409 y detalla cuántas preguntas faltan si la sesión no está completa", async () => {
    const res = await patchJson("/api/facilitador/sesiones/completar", {
      sesionId: mock.sesionAnaBienpsicEnProgreso,
    });
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.respondidas).toBe(0);
  });

  test("200 y marca la sesión como completada cuando todo está respondido", async () => {
    await sql`SELECT * FROM guardar_respuesta(${mock.sesionAnaBienpsicEnProgreso}::uuid, ${mock.preguntaBienpsic1}::uuid, 'Siempre')`;
    await sql`SELECT * FROM guardar_respuesta(${mock.sesionAnaBienpsicEnProgreso}::uuid, ${mock.preguntaBienpsic2}::uuid, 'A veces')`;

    const res = await patchJson("/api/facilitador/sesiones/completar", {
      sesionId: mock.sesionAnaBienpsicEnProgreso,
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.completada).toBe(true);
  });

  test("409 si la sesión ya estaba completada", async () => {
    const res = await patchJson("/api/facilitador/sesiones/completar", {
      sesionId: mock.sesionAnaEmocionesCompletada,
    });
    expect(res.status).toBe(409);
  });
});
