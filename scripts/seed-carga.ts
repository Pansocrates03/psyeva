// Crea un colegio + evaluación + grupo + formulario + 500 estudiantes
// dedicados EXCLUSIVAMENTE a pruebas de carga (k6/pico.js y
// k6/sostenido.js) — no toca ni depende del seed de dev/tests
// (db/reset-and-seed.sql), vive en su propio colegio identificable por
// clave_acceso = "carga-2026".
//
// Es seguro (y necesario) correrlo de nuevo antes de cada corrida de
// k6/sostenido.js: ese escenario completa la encuesta de cada alumno, así
// que una segunda corrida sin resembrar chocaría con
// "sesion_ya_completada". k6/pico.js en cambio es repetible sin resembrar
// (guardar_respuesta hace upsert sobre la misma pregunta).
//
// Uso:
//   bun run seed:carga
//
// Deja escrito k6/carga-data.json con todo lo que necesitan los scripts
// de k6: evaluacionId, formularioId, los 500 estudianteIds, las 500
// sesiones ya iniciadas (para el pico) y la primera pregunta con sus
// opciones de respuesta.
import path from "node:path";
import sql from "../src/db";

const CLAVE_COLEGIO      = "carga-2026";
const TITULO_FORMULARIO  = "Carga - formulario de prueba";
const NUM_ESTUDIANTES    = 500;
const CHUNK_INICIAR      = 50; // sesiones iniciadas en tandas para no abrir 500 queries a la vez
const OUT_PATH           = path.resolve(import.meta.dir, "../k6/carga-data.json");

async function limpiarCorridaAnterior() {
  await sql`
    DELETE FROM respuesta WHERE sesion_id IN (
      SELECT s.id FROM sesion s
      JOIN estudiante e  ON e.id  = s.estudiante_id
      JOIN grupo      g  ON g.id  = e.grupo_id
      JOIN evaluacion ev ON ev.id = g.evaluacion_id
      JOIN colegio    c  ON c.id  = ev.colegio_id
      WHERE c.clave_acceso = ${CLAVE_COLEGIO}
    )
  `;
  await sql`
    DELETE FROM sesion WHERE estudiante_id IN (
      SELECT e.id FROM estudiante e
      JOIN grupo      g  ON g.id  = e.grupo_id
      JOIN evaluacion ev ON ev.id = g.evaluacion_id
      JOIN colegio    c  ON c.id  = ev.colegio_id
      WHERE c.clave_acceso = ${CLAVE_COLEGIO}
    )
  `;
  await sql`
    DELETE FROM estudiante WHERE grupo_id IN (
      SELECT g.id FROM grupo g
      JOIN evaluacion ev ON ev.id = g.evaluacion_id
      JOIN colegio    c  ON c.id  = ev.colegio_id
      WHERE c.clave_acceso = ${CLAVE_COLEGIO}
    )
  `;
  await sql`
    DELETE FROM grupo WHERE evaluacion_id IN (
      SELECT ev.id FROM evaluacion ev
      JOIN colegio c ON c.id = ev.colegio_id
      WHERE c.clave_acceso = ${CLAVE_COLEGIO}
    )
  `;
  await sql`DELETE FROM evaluacion WHERE colegio_id IN (SELECT id FROM colegio WHERE clave_acceso = ${CLAVE_COLEGIO})`;
  await sql`DELETE FROM formulario WHERE titulo = ${TITULO_FORMULARIO}`; // cascada: seccion → pregunta
  await sql`DELETE FROM colegio WHERE clave_acceso = ${CLAVE_COLEGIO}`;
}

async function crearFormulario(): Promise<string> {
  const [formulario] = await sql`
    INSERT INTO formulario (titulo, descripcion, categoria)
    VALUES (${TITULO_FORMULARIO}, 'Generado por scripts/seed-carga.ts — no usar en producción.', 'emociones')
    RETURNING id
  `;

  const secciones = [
    {
      instruccionTexto: "Sección de prueba 1 — contesta Sí o No.",
      opciones: [{ valor: 1, texto: "Sí" }, { valor: 2, texto: "No" }],
      totalPreguntas: 5,
    },
    {
      instruccionTexto: "Sección de prueba 2 — qué tan seguido te pasa.",
      opciones: [{ valor: 1, texto: "Nunca" }, { valor: 2, texto: "A veces" }, { valor: 3, texto: "Siempre" }],
      totalPreguntas: 5,
    },
  ];

  let numeroGlobal = 1;
  for (let si = 0; si < secciones.length; si++) {
    const s = secciones[si]!;
    const [seccion] = await sql`
      INSERT INTO seccion (formulario_id, orden, instruccion_texto, opciones_respuesta)
      VALUES (${formulario.id}, ${si + 1}, ${s.instruccionTexto}, ${sql.json(s.opciones)})
      RETURNING id
    `;
    for (let pi = 0; pi < s.totalPreguntas; pi++) {
      await sql`
        INSERT INTO pregunta (seccion_id, orden, texto)
        VALUES (${seccion.id}, ${pi + 1}, ${`Pregunta de carga ${numeroGlobal}`})
      `;
      numeroGlobal++;
    }
  }

  return formulario.id;
}

async function main() {
  console.log("Limpiando corrida anterior de carga (si existe)...");
  await limpiarCorridaAnterior();

  console.log("Creando colegio, formulario, evaluación y grupo...");
  const [colegio] = await sql`
    INSERT INTO colegio (nombre, clave_acceso) VALUES ('Colegio Carga', ${CLAVE_COLEGIO}) RETURNING id
  `;
  const formularioId = await crearFormulario();
  const [evaluacion] = await sql`
    INSERT INTO evaluacion (colegio_id, nombre, acepta_respuestas, fecha)
    VALUES (${colegio.id}, 'Evaluación de carga', TRUE, CURRENT_DATE)
    RETURNING id
  `;
  const [grupo] = await sql`
    INSERT INTO grupo (evaluacion_id, form_emociones_id, nombre)
    VALUES (${evaluacion.id}, ${formularioId}, 'Grupo de carga')
    RETURNING id
  `;

  console.log(`Creando ${NUM_ESTUDIANTES} estudiantes...`);
  const filas = Array.from({ length: NUM_ESTUDIANTES }, (_, i) => ({
    grupo_id:        grupo.id,
    nombre_completo: `Carga Estudiante ${String(i + 1).padStart(3, "0")}`,
  }));
  const estudiantes = await sql`INSERT INTO estudiante ${sql(filas)} RETURNING id`;

  console.log("Iniciando sesión para cada estudiante (necesario para el escenario de pico)...");
  const sesiones: Array<{ estudianteId: string; sesionId: string }> = [];
  for (let i = 0; i < estudiantes.length; i += CHUNK_INICIAR) {
    const lote = estudiantes.slice(i, i + CHUNK_INICIAR);
    const resultados = await Promise.all(lote.map(async e => {
      const [row] = await sql`
        SELECT * FROM iniciar_sesion(${e.id}::uuid, ${formularioId}::uuid, ${evaluacion.id}::uuid)
      `;
      return { estudianteId: e.id as string, sesionId: row!.sesionId as string };
    }));
    sesiones.push(...resultados);
    process.stdout.write(`  ${Math.min(i + CHUNK_INICIAR, estudiantes.length)}/${estudiantes.length}\r`);
  }
  console.log();

  const [primeraPregunta] = await sql`
    SELECT p.id, sec.opciones_respuesta
    FROM pregunta p
    JOIN seccion sec ON sec.id = p.seccion_id
    WHERE sec.formulario_id = ${formularioId}
    ORDER BY sec.orden, p.orden
    LIMIT 1
  `;

  const data = {
    baseUrl:      process.env.CARGA_BASE_URL ?? "http://localhost:3000",
    evaluacionId: evaluacion.id,
    formularioId,
    estudianteIds: estudiantes.map(e => e.id),
    sesiones,
    primeraPregunta: {
      id:       primeraPregunta!.id,
      opciones: primeraPregunta!.opcionesRespuesta,
    },
  };

  await Bun.write(OUT_PATH, JSON.stringify(data, null, 2));
  console.log(`\nListo — ${estudiantes.length} estudiantes, ${sesiones.length} sesiones iniciadas.`);
  console.log(`Datos para k6 escritos en ${OUT_PATH}`);
}

main()
  .catch(err => {
    console.error("Error en seed-carga:", err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
