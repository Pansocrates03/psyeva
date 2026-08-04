export type CategoriaFormulario = "aprendizaje" | "bienestar_psicologico" | "emociones";
export type EstadoSesion = "pendiente" | "en_progreso" | "completada";
export type TipoReporte = "individual" | "grupal" | "general";

// ── Filas de tabla (tal como las devuelve la API, camelCase) ───

export interface Colegio {
  id: string;
  nombre: string;
  claveAcceso: string;
  createdAt: string;
}

export interface Evaluacion {
  id: string;
  colegioId: string;
  nombre: string;
  aceptaRespuestas: boolean;
  reportesPublicados: boolean;
  fecha: string;
  createdAt: string;
}

export interface Formulario {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaFormulario;
  createdAt: string;
}

export interface Pregunta {
  id: string;
  formularioId: string;
  texto: string;
  imagenUrl: string | null;
  opcionesRespuesta: Array<{ valor: number; texto: string }>;
  // Presentes solo cuando la pregunta viene junto al estado de una sesión
  textoLibre?: string | null;
  respondidaAt?: string | null;
}

export interface Grupo {
  id: string;
  evaluacionId: string;
  formEmocionesId: string | null;
  formBienpsicId: string | null;
  formAprendizajeId: string | null;
  nombre: string;
  createdAt: string;
}

export interface Estudiante {
  id: string;
  grupoId: string;
  nombreCompleto: string;
  curp: string | null;
  createdAt: string;
}

export interface Sesion {
  id: string;
  estudianteId: string;
  formularioId: string;
  evaluacionId: string;
  estado: EstadoSesion;
  iniciadaAt: string | null;
  completadaAt: string | null;
}

export interface Reporte {
  id: string;
  tipo: TipoReporte;
  evaluacionId: string;
  grupoId: string | null;
  estudianteId: string | null;
  archivoUrl: string;
  createdAt: string;
}

export interface Respuesta {
  id: string;
  sesionId: string;
  preguntaId: string;
  textoLibre: string | null;
  respondidaAt: string | null;
}

// ── Vistas / agregados (KPIs calculados en Postgres) ────────────
// Los conteos vienen de COUNT(*) en Postgres, que postgres.js
// devuelve como string (bigint no cabe siempre en un number de JS).

export interface EvaluacionConProgreso {
  evaluacionId: string;
  nombre: string;
  fecha: string;
  aceptaRespuestas: boolean;
  reportesPublicados: boolean;
  colegioId: string;
  colegioNombre: string;
  totalGrupos: string;
  totalAlumnos: string;
  sesionesCompletadas: string;
  sesionesPendientes: string;
  totalReportes: string;
}

export interface GrupoConProgreso {
  grupoId: string;
  grupoNombre: string;
  evaluacionId: string;
  formEmocionesId: string | null;
  formBienpsicId: string | null;
  formAprendizajeId: string | null;
  totalAlumnos: string;
  sesionesCompletadas: string;
  sesionesEnProgreso: string;
  sesionesPendientes: string;
  estadoGrupo: "sin_alumnos" | "completo" | "en_progreso" | "pendiente";
  reportesIndividuales: string;
  reporteGrupal: string;
  // Presentes en /api/admin/grupos/:id y /api/facilitador/grupos
  formEmocionesTitulo?: string | null;
  formBienpsicTitulo?: string | null;
  formAprendizajeTitulo?: string | null;
}

export interface ColegioConTotalEvaluaciones extends Colegio {
  totalEvaluaciones: string;
}

export interface FormularioConTotalPreguntas extends Formulario {
  totalPreguntas: string;
}

export interface FormularioConPreguntas extends Formulario {
  preguntas: Pregunta[];
}

// Forma que espera el backend al crear/reemplazar preguntas de un formulario
export interface PreguntaInput {
  texto: string;
  imagenUrl?: string | null;
  opcionesRespuesta: Array<{ valor: number; texto: string }>;
}

export interface PreguntaConFormulario {
  id: string;
  texto: string;
  formularioId: string;
  formularioTitulo: string;
  categoria: CategoriaFormulario;
}

export interface GrupoRespuestas {
  preguntas: PreguntaConFormulario[];
  estudiantes: Array<{
    estudianteId: string;
    nombreCompleto: string;
    curp: string | null;
    // clave = preguntaId, valor = texto de la respuesta o null si no respondió
    respuestas: Record<string, string | null>;
  }>;
}

export interface EstudianteConEstado {
  estudianteId: string;
  nombreCompleto: string;
  curp: string | null;
  grupoId: string;
  evaluacionId: string;
  estadoEmociones: EstadoSesion;
  estadoBienestar: EstadoSesion;
  estadoAprendizaje: EstadoSesion;
  todoCompletado: boolean;
}
