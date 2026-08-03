import { randomUUID } from "node:crypto";
import { sql } from "./setup";

// Ids fijos insertados por db/reset-and-seed.sql (ver también
// db/mock-data.sql, que trae el mismo dataset). Úsalos para probar
// caminos felices sin tener que reconstruir el dataset a mano.
export const mock = {
  colegioSanJose: "11111111-1111-1111-1111-111111111111",
  colegioLiceo: "22222222-2222-2222-2222-222222222222",

  formEmociones: "33333333-3333-3333-3333-333333333333",
  formBienpsic: "44444444-4444-4444-4444-444444444444",
  formAprendizaje: "55555555-5555-5555-5555-555555555555",

  preguntaEmocion1: "66666666-6666-6666-6666-666666666666",
  preguntaEmocion2: "77777777-7777-7777-7777-777777777777",
  preguntaBienpsic1: "88888888-8888-8888-8888-888888888888",
  preguntaBienpsic2: "99999999-9999-9999-9999-999999999999",
  preguntaAprendizaje1: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  preguntaAprendizaje2: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",

  // acepta_respuestas = true, reportes_publicados = false
  evaluacionSanJose: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  // acepta_respuestas = true, reportes_publicados = true
  evaluacionLiceo: "dddddddd-dddd-dddd-dddd-dddddddddddd",

  grupoA: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  grupoB: "ffffffff-ffff-ffff-ffff-ffffffffffff",

  estudianteAna: "10101010-1010-1010-1010-101010101010",
  estudianteBruno: "20202020-2020-2020-2020-202020202020",
  estudianteCarmen: "30303030-3030-3030-3030-303030303030",

  // Ana + emociones → completada
  sesionAnaEmocionesCompletada: "40404040-4040-4040-4040-404040404040",
  // Ana + bienestar psicológico → en_progreso, sin respuestas aún
  sesionAnaBienpsicEnProgreso: "50505050-5050-5050-5050-505050505050",
  // Bruno + emociones → completada
  sesionBrunoEmocionesCompletada: "60606060-6060-6060-6060-606060606060",
  // Carmen + aprendizaje → pendiente
  sesionCarmenAprendizajePendiente: "70707070-7070-7070-7070-707070707070",

  reporteGrupalGrupoA: "c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0",
  reporteIndividualAna: "d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0",
  reporteGeneralLiceo: "e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0",
};

// ── Factories ──────────────────────────────────────────────────
// Para escenarios que el dataset base no cubre (evaluación cerrada,
// grupo sin alumnos, reporte recién creado, etc.)

export async function createColegio(overrides: Partial<{
  nombre: string;
  claveAcceso: string;
}> = {}) {
  const [row] = await sql`
    INSERT INTO colegio (nombre, clave_acceso)
    VALUES (
      ${overrides.nombre ?? `Colegio Test ${randomUUID()}`},
      ${overrides.claveAcceso ?? `clave-test-${randomUUID()}`}
    )
    RETURNING *
  `;
  return row;
}

export async function createFormulario(overrides: Partial<{
  titulo: string;
  descripcion: string;
  categoria: "emociones" | "bienestar_psicologico" | "aprendizaje";
}> = {}) {
  const [row] = await sql`
    INSERT INTO formulario (titulo, descripcion, categoria)
    VALUES (
      ${overrides.titulo ?? `Formulario Test ${randomUUID()}`},
      ${overrides.descripcion ?? "Formulario de prueba"},
      ${(overrides.categoria ?? "emociones")}::categoria_formulario
    )
    RETURNING *
  `;
  return row;
}

export async function createEvaluacion(overrides: Partial<{
  colegioId: string;
  nombre: string;
  fecha: string;
  aceptaRespuestas: boolean;
  reportesPublicados: boolean;
}> = {}) {
  const [row] = await sql`
    INSERT INTO evaluacion (colegio_id, nombre, fecha, acepta_respuestas, reportes_publicados)
    VALUES (
      ${overrides.colegioId ?? mock.colegioSanJose},
      ${overrides.nombre ?? `Evaluación Test ${randomUUID()}`},
      ${overrides.fecha ?? "2026-04-01"},
      ${overrides.aceptaRespuestas ?? false},
      ${overrides.reportesPublicados ?? false}
    )
    RETURNING *
  `;
  return row;
}

export async function createGrupo(overrides: Partial<{
  evaluacionId: string;
  nombre: string;
  formEmocionesId: string | null;
  formBienpsicId: string | null;
  formAprendizajeId: string | null;
}> = {}) {
  const [row] = await sql`
    INSERT INTO grupo (evaluacion_id, nombre, form_emociones_id, form_bienpsic_id, form_aprendizaje_id)
    VALUES (
      ${overrides.evaluacionId ?? mock.evaluacionSanJose},
      ${overrides.nombre ?? `Grupo Test ${randomUUID()}`},
      ${overrides.formEmocionesId === undefined ? mock.formEmociones : overrides.formEmocionesId},
      ${overrides.formBienpsicId === undefined ? mock.formBienpsic : overrides.formBienpsicId},
      ${overrides.formAprendizajeId === undefined ? mock.formAprendizaje : overrides.formAprendizajeId}
    )
    RETURNING *
  `;
  return row;
}

export async function createEstudiante(overrides: Partial<{
  grupoId: string;
  nombreCompleto: string;
  curp: string | null;
}> = {}) {
  const [row] = await sql`
    INSERT INTO estudiante (grupo_id, nombre_completo, curp)
    VALUES (
      ${overrides.grupoId ?? mock.grupoA},
      ${overrides.nombreCompleto ?? "Estudiante Test"},
      ${overrides.curp ?? null}
    )
    RETURNING *
  `;
  return row;
}

export async function createSesion(overrides: Partial<{
  estudianteId: string;
  formularioId: string;
  evaluacionId: string;
  estado: "pendiente" | "en_progreso" | "completada";
}> = {}) {
  const [row] = await sql`
    INSERT INTO sesion (estudiante_id, formulario_id, evaluacion_id, estado)
    VALUES (
      ${overrides.estudianteId ?? mock.estudianteAna},
      ${overrides.formularioId ?? mock.formEmociones},
      ${overrides.evaluacionId ?? mock.evaluacionSanJose},
      ${(overrides.estado ?? "pendiente")}::estado_sesion
    )
    RETURNING *
  `;
  return row;
}

export async function createReporte(overrides: Partial<{
  tipo: "individual" | "grupal" | "general";
  evaluacionId: string;
  grupoId: string | null;
  estudianteId: string | null;
  archivoUrl: string;
}> = {}) {
  const [row] = await sql`
    INSERT INTO reporte (tipo, evaluacion_id, grupo_id, estudiante_id, archivo_url)
    VALUES (
      ${(overrides.tipo ?? "general")}::tipo_reporte,
      ${overrides.evaluacionId ?? mock.evaluacionSanJose},
      ${overrides.grupoId ?? null},
      ${overrides.estudianteId ?? null},
      ${overrides.archivoUrl ?? `https://example.com/reportes/${randomUUID()}.pdf`}
    )
    RETURNING *
  `;
  return row;
}
