import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb, sql } from "../setup";
import { mock, createEvaluacion, createGrupo, createEstudiante } from "../factories";

// Pruebas directas sobre las Postgres functions definidas en Procedures.sql,
// sin pasar por la capa HTTP. Verifican la lógica transaccional/atómica
// que vive en la base de datos.

beforeEach(resetDb);

// expect(sql`...`).rejects.toThrow() cuelga bun test indefinidamente: la Query
// de postgres.js no es una Promise nativa y expect().rejects nunca dispara su
// ejecución. Awaitear dentro de try/catch sí funciona de forma confiable.
async function expectRaises(run: () => unknown, pattern: RegExp) {
  try {
    await run();
    throw new Error(`Se esperaba que la operación fallara con ${pattern}`);
  } catch (err) {
    expect((err as Error).message).toMatch(pattern);
  }
}

describe("iniciar_sesion()", () => {
  test("crea una sesión pendiente nueva cuando no existe una previa", async () => {
    const [result] = await sql`
      SELECT * FROM iniciar_sesion(
        ${mock.estudianteCarmen}::uuid,
        ${mock.formEmociones}::uuid,
        ${mock.evaluacionSanJose}::uuid
      )
    `;

    expect(result.esNueva).toBe(true);
    expect(result.estado).toBe("pendiente");
    expect(result.sesionId).toBeTruthy();

    const [row] = await sql`SELECT * FROM sesion WHERE id = ${result.sesionId}`;
    expect(row.estudianteId).toBe(mock.estudianteCarmen);
    expect(row.formularioId).toBe(mock.formEmociones);
  });

  test("devuelve la sesión existente en_progreso sin crear una nueva", async () => {
    const [result] = await sql`
      SELECT * FROM iniciar_sesion(
        ${mock.estudianteAna}::uuid,
        ${mock.formBienpsic}::uuid,
        ${mock.evaluacionSanJose}::uuid
      )
    `;

    expect(result.esNueva).toBe(false);
    expect(result.sesionId).toBe(mock.sesionAnaBienpsicEnProgreso);
    expect(result.estado).toBe("en_progreso");

    const [{ count }] = await sql`
      SELECT COUNT(*) AS count FROM sesion
      WHERE estudiante_id = ${mock.estudianteAna} AND formulario_id = ${mock.formBienpsic}
    `;
    expect(Number(count)).toBe(1);
  });

  test("lanza sesion_ya_completada si el alumno ya completó ese formulario", async () => {
    await expectRaises(() => sql`SELECT * FROM iniciar_sesion(
      ${mock.estudianteAna}::uuid,
      ${mock.formEmociones}::uuid,
      ${mock.evaluacionSanJose}::uuid
    )`, /sesion_ya_completada/);
  });

  test("lanza evaluacion_cerrada si la evaluación no acepta respuestas", async () => {
    const evaluacion = await createEvaluacion({ aceptaRespuestas: false });
    const grupo = await createGrupo({ evaluacionId: evaluacion.id });
    const estudiante = await createEstudiante({ grupoId: grupo.id });

    await expectRaises(() => sql`SELECT * FROM iniciar_sesion(
      ${estudiante.id}::uuid,
      ${mock.formEmociones}::uuid,
      ${evaluacion.id}::uuid
    )`, /evaluacion_cerrada/);
  });

  test("lanza evaluacion_no_encontrada si la evaluación no existe", async () => {
    await expectRaises(() => sql`SELECT * FROM iniciar_sesion(
      ${mock.estudianteCarmen}::uuid,
      ${mock.formEmociones}::uuid,
      ${crypto.randomUUID()}::uuid
    )`, /evaluacion_no_encontrada/);
  });
});

describe("guardar_respuesta()", () => {
  test("crea la respuesta y pasa la sesión de pendiente a en_progreso", async () => {
    const [before] = await sql`SELECT estado FROM sesion WHERE id = ${mock.sesionCarmenAprendizajePendiente}`;
    expect(before.estado).toBe("pendiente");

    const [result] = await sql`
      SELECT * FROM guardar_respuesta(
        ${mock.sesionCarmenAprendizajePendiente}::uuid,
        ${mock.preguntaAprendizaje1}::uuid,
        'Muy motivado'
      )
    `;
    expect(result.respuestaId).toBeTruthy();
    expect(result.respondidaAt).toBeTruthy();

    const [after] = await sql`SELECT estado, iniciada_at FROM sesion WHERE id = ${mock.sesionCarmenAprendizajePendiente}`;
    expect(after.estado).toBe("en_progreso");
    expect(after.iniciadaAt).toBeTruthy();
  });

  test("hace upsert si ya existía una respuesta para esa pregunta en la sesión", async () => {
    const [first] = await sql`
      SELECT * FROM guardar_respuesta(${mock.sesionAnaBienpsicEnProgreso}::uuid, ${mock.preguntaBienpsic1}::uuid, 'Nunca')
    `;
    const [second] = await sql`
      SELECT * FROM guardar_respuesta(${mock.sesionAnaBienpsicEnProgreso}::uuid, ${mock.preguntaBienpsic1}::uuid, 'Siempre')
    `;

    expect(second.respuestaId).toBe(first.respuestaId);

    const [{ count }] = await sql`
      SELECT COUNT(*) AS count FROM respuesta
      WHERE sesion_id = ${mock.sesionAnaBienpsicEnProgreso} AND pregunta_id = ${mock.preguntaBienpsic1}
    `;
    expect(Number(count)).toBe(1);

    const [row] = await sql`SELECT texto_libre FROM respuesta WHERE id = ${first.respuestaId}`;
    expect(row.textoLibre).toBe("Siempre");
  });

  test("lanza sesion_ya_completada si la sesión ya está completada", async () => {
    await expectRaises(
      () => sql`SELECT * FROM guardar_respuesta(${mock.sesionAnaEmocionesCompletada}::uuid, ${mock.preguntaEmocion1}::uuid, 'Bien')`,
      /sesion_ya_completada/
    );
  });

  test("lanza sesion_no_encontrada si la sesión no existe", async () => {
    await expectRaises(
      () => sql`SELECT * FROM guardar_respuesta(${crypto.randomUUID()}::uuid, ${mock.preguntaEmocion1}::uuid, 'Bien')`,
      /sesion_no_encontrada/
    );
  });
});

describe("completar_sesion()", () => {
  test("no completa la sesión si faltan preguntas por responder", async () => {
    const [result] = await sql`SELECT * FROM completar_sesion(${mock.sesionAnaBienpsicEnProgreso}::uuid)`;

    expect(result.completada).toBe(false);
    expect(result.total).toBe(2);
    expect(result.respondidas).toBe(0);

    const [row] = await sql`SELECT estado FROM sesion WHERE id = ${mock.sesionAnaBienpsicEnProgreso}`;
    expect(row.estado).toBe("en_progreso");
  });

  test("completa la sesión cuando todas las preguntas están respondidas", async () => {
    await sql`SELECT * FROM guardar_respuesta(${mock.sesionAnaBienpsicEnProgreso}::uuid, ${mock.preguntaBienpsic1}::uuid, 'Siempre')`;
    await sql`SELECT * FROM guardar_respuesta(${mock.sesionAnaBienpsicEnProgreso}::uuid, ${mock.preguntaBienpsic2}::uuid, 'A veces')`;

    const [result] = await sql`SELECT * FROM completar_sesion(${mock.sesionAnaBienpsicEnProgreso}::uuid)`;

    expect(result.completada).toBe(true);
    expect(result.total).toBe(2);
    expect(result.respondidas).toBe(2);

    const [row] = await sql`SELECT estado, completada_at FROM sesion WHERE id = ${mock.sesionAnaBienpsicEnProgreso}`;
    expect(row.estado).toBe("completada");
    expect(row.completadaAt).toBeTruthy();
  });

  test("lanza sesion_no_disponible si la sesión ya estaba completada", async () => {
    await expectRaises(
      () => sql`SELECT * FROM completar_sesion(${mock.sesionAnaEmocionesCompletada}::uuid)`,
      /sesion_no_disponible/
    );
  });

  test("lanza sesion_no_disponible si la sesión no existe", async () => {
    await expectRaises(
      () => sql`SELECT * FROM completar_sesion(${crypto.randomUUID()}::uuid)`,
      /sesion_no_disponible/
    );
  });
});
