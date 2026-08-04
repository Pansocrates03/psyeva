import type {
  Colegio,
  ColegioConTotalEvaluaciones,
  Estudiante,
  EstudianteConEstado,
  Evaluacion,
  EvaluacionConProgreso,
  Formulario,
  FormularioConPreguntas,
  FormularioConTotalPreguntas,
  PreguntaInput,
  Grupo,
  GrupoConProgreso,
  GrupoRespuestas,
  Pregunta,
  Reporte,
  Sesion,
  CategoriaFormulario,
  TipoReporte,
} from "../utils/types";

// Todas las rutas del backend responden { data: T } en éxito,
// { data, mensaje } cuando además hay un mensaje para el usuario,
// o { error, ...detalle } (status >= 400) en caso de fallo.
interface ApiEnvelope<T> {
  data: T;
  mensaje?: string;
}

export class ApiError extends Error {
  status: number;
  detalle: unknown;

  constructor(status: number, message: string, detalle?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detalle = detalle;
  }
}

const COLEGIO_ID_KEY = "psyeva.colegioId";
const TOKEN_KEY = "psyeva.token";

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// Centraliza todas las llamadas al API de PSYEVA: arma la URL, adjunta
// el header X-Colegio-Id de la sesión del facilitador cuando aplica,
// parsea la respuesta y normaliza los errores en ApiError.
// Las páginas y componentes solo deben hablar con esta instancia,
// nunca hacer fetch() por su cuenta.
class DatabaseService {
  private colegioId: string | null = null;
  private token: string | null = null;

  constructor() {
    if (typeof localStorage !== "undefined") {
      this.colegioId = localStorage.getItem(COLEGIO_ID_KEY);
      this.token = localStorage.getItem(TOKEN_KEY);
    }
  }

  // ── Sesión del facilitador (clave de acceso del colegio) ────
  get colegioActualId(): string | null {
    return this.colegioId;
  }

  get haySesionFacilitador(): boolean {
    return this.colegioId !== null;
  }

  private guardarSesionFacilitador(colegioId: string, token: string) {
    this.colegioId = colegioId;
    this.token = token;
    localStorage.setItem(COLEGIO_ID_KEY, colegioId);
    localStorage.setItem(TOKEN_KEY, token);
  }

  cerrarSesionFacilitador() {
    this.colegioId = null;
    this.token = null;
    localStorage.removeItem(COLEGIO_ID_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  // ── Núcleo HTTP ───────────────────────────────────────────────
  private async request<T>(
    path: string,
    init: RequestInit = {},
    { conColegio = true }: { conColegio?: boolean } = {}
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (conColegio && this.colegioId) {
      headers.set("X-Colegio-Id", this.colegioId);
    }

    const res = await fetch(path, { ...init, headers });
    const isJson = res.headers.get("Content-Type")?.includes("application/json") ?? false;
    const body = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) {
      const message = body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Error ${res.status}`;
      throw new ApiError(res.status, message, body);
    }

    return body as T;
  }

  private get<T>(path: string, opts?: { conColegio?: boolean }) {
    return this.request<T>(path, { method: "GET" }, opts);
  }
  private post<T>(path: string, body?: Record<string, unknown> | FormData, opts?: { conColegio?: boolean }) {
    return this.request<T>(
      path,
      { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) },
      opts
    );
  }
  private patch<T>(path: string, body?: Record<string, unknown>, opts?: { conColegio?: boolean }) {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }, opts);
  }
  private del<T>(path: string, opts?: { conColegio?: boolean }) {
    return this.request<T>(path, { method: "DELETE" }, opts);
  }

  // ── Admin ─────────────────────────────────────────────────────
  // Las rutas /api/admin/* no requieren X-Colegio-Id.
  admin = {
    listarColegios: async (): Promise<ColegioConTotalEvaluaciones[]> => {
      const { data } = await this.get<ApiEnvelope<ColegioConTotalEvaluaciones[]>>(
        "/api/admin/colegios",
        { conColegio: false }
      );
      return data;
    },

    crearColegio: async (input: { nombre: string; claveAcceso: string }): Promise<Colegio> => {
      const { data } = await this.post<ApiEnvelope<Colegio>>("/api/admin/colegios", input, { conColegio: false });
      return data;
    },

    actualizarColegio: async (id: string, cambios: Partial<{ nombre: string; claveAcceso: string }>): Promise<Colegio> => {
      const { data } = await this.patch<ApiEnvelope<Colegio>>(`/api/admin/colegios/${id}`, cambios, { conColegio: false });
      return data;
    },

    listarFormularios: async (): Promise<FormularioConTotalPreguntas[]> => {
      const { data } = await this.get<ApiEnvelope<FormularioConTotalPreguntas[]>>(
        "/api/admin/formularios",
        { conColegio: false }
      );
      return data;
    },

    crearFormulario: async (input: {
      titulo: string;
      descripcion?: string;
      categoria: CategoriaFormulario;
      preguntas: PreguntaInput[];
    }): Promise<Formulario> => {
      const { data } = await this.post<ApiEnvelope<Formulario>>("/api/admin/formularios", input, { conColegio: false });
      return data;
    },

    obtenerFormulario: async (id: string): Promise<FormularioConPreguntas> => {
      const { data } = await this.get<ApiEnvelope<FormularioConPreguntas>>(
        `/api/admin/formularios/${id}`,
        { conColegio: false }
      );
      return data;
    },

    // Si se envía `preguntas`, reemplaza el set completo (409 si alguna
    // pregunta actual ya tiene respuestas registradas).
    actualizarFormulario: async (
      id: string,
      cambios: Partial<{ titulo: string; descripcion: string; categoria: CategoriaFormulario; preguntas: PreguntaInput[] }>
    ): Promise<Formulario> => {
      const { data } = await this.patch<ApiEnvelope<Formulario>>(`/api/admin/formularios/${id}`, cambios, { conColegio: false });
      return data;
    },

    eliminarFormulario: async (id: string): Promise<{ id: string; eliminado: boolean }> => {
      const { data } = await this.del<ApiEnvelope<{ id: string; eliminado: boolean }>>(
        `/api/admin/formularios/${id}`,
        { conColegio: false }
      );
      return data;
    },

    listarEvaluaciones: async (): Promise<EvaluacionConProgreso[]> => {
      const { data } = await this.get<ApiEnvelope<EvaluacionConProgreso[]>>(
        "/api/admin/evaluaciones",
        { conColegio: false }
      );
      return data;
    },

    crearEvaluacion: async (input: { colegioId: string; nombre: string; fecha: string }): Promise<Evaluacion> => {
      const { data } = await this.post<ApiEnvelope<Evaluacion>>(
        "/api/admin/evaluaciones",
        input,
        { conColegio: false }
      );
      return data;
    },

    obtenerEvaluacion: async (id: string): Promise<EvaluacionConProgreso & { grupos: GrupoConProgreso[] }> => {
      const { data } = await this.get<ApiEnvelope<EvaluacionConProgreso & { grupos: GrupoConProgreso[] }>>(
        `/api/admin/evaluaciones/${id}`,
        { conColegio: false }
      );
      return data;
    },

    actualizarEvaluacion: async (
      id: string,
      cambios: Partial<{ nombre: string; fecha: string; aceptaRespuestas: boolean; reportesPublicados: boolean }>
    ): Promise<Evaluacion> => {
      const { data } = await this.patch<ApiEnvelope<Evaluacion>>(
        `/api/admin/evaluaciones/${id}`,
        cambios,
        { conColegio: false }
      );
      return data;
    },

    eliminarEvaluacion: async (id: string): Promise<{ id: string; eliminado: boolean }> => {
      const { data } = await this.del<ApiEnvelope<{ id: string; eliminado: boolean }>>(
        `/api/admin/evaluaciones/${id}`,
        { conColegio: false }
      );
      return data;
    },

    // campo="aceptaRespuestas"|"reportesPublicados"; sin `valor` hace toggle
    cambiarEstadoEvaluacion: async (
      id: string,
      campo: "aceptaRespuestas" | "reportesPublicados",
      valor?: boolean
    ): Promise<{ evaluacion: Evaluacion; mensaje: string }> => {
      const { data, mensaje } = await this.patch<ApiEnvelope<Evaluacion>>(
        `/api/admin/evaluaciones/${id}/estado`,
        { campo, valor },
        { conColegio: false }
      );
      return { evaluacion: data, mensaje: mensaje ?? "" };
    },

    // Descarga el .xlsx de respuestas; el caller decide cómo ofrecerlo (link, guardar, etc.)
    exportarEvaluacion: async (id: string, categoria?: CategoriaFormulario): Promise<{ blob: Blob; filename: string }> => {
      const res = await fetch(`/api/admin/evaluaciones/${id}/exportar${buildQuery({ categoria })}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body && typeof body === "object" && "error" in body ? String(body.error) : `Error ${res.status}`;
        throw new ApiError(res.status, message, body);
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `evaluacion-${id}.xlsx`;
      return { blob: await res.blob(), filename };
    },

    crearGrupo: async (input: {
      evaluacionId: string;
      nombre: string;
      formEmocionesId?: string;
      formBienpsicId?: string;
      formAprendizajeId?: string;
      estudiantes?: Array<{ nombreCompleto: string; curp?: string }>;
    }): Promise<Grupo & { estudiantes: Estudiante[] }> => {
      const { data } = await this.post<ApiEnvelope<Grupo & { estudiantes: Estudiante[] }>>(
        "/api/admin/grupos",
        input,
        { conColegio: false }
      );
      return data;
    },

    agregarEstudiante: async (
      grupoId: string,
      input: { nombreCompleto: string; curp?: string }
    ): Promise<Estudiante> => {
      const { data } = await this.post<ApiEnvelope<Estudiante>>(
        `/api/admin/grupos/${grupoId}/estudiantes`,
        input,
        { conColegio: false }
      );
      return data;
    },

    eliminarEstudiante: async (id: string): Promise<{ id: string; eliminado: boolean }> => {
      const { data } = await this.del<ApiEnvelope<{ id: string; eliminado: boolean }>>(
        `/api/admin/estudiantes/${id}`,
        { conColegio: false }
      );
      return data;
    },

    obtenerRespuestasGrupo: async (grupoId: string): Promise<GrupoRespuestas> => {
      const { data } = await this.get<ApiEnvelope<GrupoRespuestas>>(
        `/api/admin/grupos/${grupoId}/respuestas`,
        { conColegio: false }
      );
      return data;
    },

    obtenerGrupo: async (id: string): Promise<GrupoConProgreso & { estudiantes: EstudianteConEstado[] }> => {
      const { data } = await this.get<ApiEnvelope<GrupoConProgreso & { estudiantes: EstudianteConEstado[] }>>(
        `/api/admin/grupos/${id}`,
        { conColegio: false }
      );
      return data;
    },

    actualizarGrupo: async (
      id: string,
      cambios: Partial<{ nombre: string; formEmocionesId: string; formBienpsicId: string; formAprendizajeId: string }>
    ): Promise<Grupo> => {
      const { data } = await this.patch<ApiEnvelope<Grupo>>(`/api/admin/grupos/${id}`, cambios, { conColegio: false });
      return data;
    },

    eliminarGrupo: async (id: string): Promise<{ id: string; eliminado: boolean }> => {
      const { data } = await this.del<ApiEnvelope<{ id: string; eliminado: boolean }>>(
        `/api/admin/grupos/${id}`,
        { conColegio: false }
      );
      return data;
    },

    listarReportes: async (filtros: { evaluacionId?: string; tipo?: TipoReporte } = {}): Promise<Reporte[]> => {
      const { data } = await this.get<ApiEnvelope<Reporte[]>>(
        `/api/admin/reportes${buildQuery(filtros)}`,
        { conColegio: false }
      );
      return data;
    },

    subirReporte: async (input: {
      archivo: File;
      tipo: TipoReporte;
      evaluacionId: string;
      grupoId?: string;
      estudianteId?: string;
    }): Promise<Reporte> => {
      const form = new FormData();
      form.set("archivo", input.archivo);
      form.set("tipo", input.tipo);
      form.set("evaluacionId", input.evaluacionId);
      if (input.grupoId) form.set("grupoId", input.grupoId);
      if (input.estudianteId) form.set("estudianteId", input.estudianteId);

      const { data } = await this.post<ApiEnvelope<Reporte>>("/api/admin/reportes", form, { conColegio: false });
      return data;
    },
  };

  // ── Facilitador ──────────────────────────────────────────────
  // Todas estas rutas (salvo verificar) requieren la sesión iniciada
  // con facilitador.verificar(), que guarda el X-Colegio-Id.
  facilitador = {
    verificar: async (claveAcceso: string): Promise<{
      colegio: { id: string; nombre: string };
      evaluaciones: EvaluacionConProgreso[];
    }> => {
      const { data } = await this.post<ApiEnvelope<{
        colegio: { id: string; nombre: string };
        evaluaciones: EvaluacionConProgreso[];
        token: string;
      }>>("/api/facilitador/verificar", { claveAcceso }, { conColegio: false });

      this.guardarSesionFacilitador(data.colegio.id, data.token);
      return { colegio: data.colegio, evaluaciones: data.evaluaciones };
    },

    listarGrupos: async (evaluacionId: string): Promise<{ evaluacion: Evaluacion; grupos: GrupoConProgreso[] }> => {
      const { data } = await this.get<ApiEnvelope<{ evaluacion: Evaluacion; grupos: GrupoConProgreso[] }>>(
        `/api/facilitador/grupos${buildQuery({ evaluacionId })}`
      );
      return data;
    },

    listarEstudiantes: async (
      grupoId: string,
      evaluacionId: string
    ): Promise<{ grupo: { id: string; nombre: string }; estudiantes: EstudianteConEstado[] }> => {
      const { data } = await this.get<ApiEnvelope<{ grupo: { id: string; nombre: string }; estudiantes: EstudianteConEstado[] }>>(
        `/api/facilitador/estudiantes/${grupoId}${buildQuery({ evaluacionId })}`
      );
      return data;
    },

    obtenerSesion: async (sesionId: string): Promise<{ sesion: Sesion & { estudianteNombre: string; formularioTitulo: string }; preguntas: Pregunta[] }> => {
      const { data } = await this.get<ApiEnvelope<{ sesion: Sesion & { estudianteNombre: string; formularioTitulo: string }; preguntas: Pregunta[] }>>(
        `/api/facilitador/sesiones${buildQuery({ sesionId })}`
      );
      return data;
    },

    // Crea o retoma la sesión de un alumno para un formulario dado.
    iniciarSesion: async (input: {
      estudianteId: string;
      formularioId: string;
      evaluacionId: string;
    }): Promise<{ sesion: { sesionId: string; estado: string; esNueva: boolean }; preguntas: Pregunta[] }> => {
      const { data } = await this.post<ApiEnvelope<{ sesion: { sesionId: string; estado: string; esNueva: boolean }; preguntas: Pregunta[] }>>(
        "/api/facilitador/sesiones",
        input
      );
      return data;
    },

    guardarRespuesta: async (input: {
      sesionId: string;
      preguntaId: string;
      textoLibre: string;
    }): Promise<{ respuestaId: string; respondidaAt: string }> => {
      const { data } = await this.post<ApiEnvelope<{ respuestaId: string; respondidaAt: string }>>(
        "/api/facilitador/sesiones/respuesta",
        input
      );
      return data;
    },

    // Si faltan preguntas por responder el backend devuelve 409 con
    // { total, respondidas } en err.detalle — captúralo con try/catch.
    completarSesion: async (sesionId: string): Promise<{ sesionId: string; completada: true }> => {
      const { data } = await this.patch<ApiEnvelope<{ sesionId: string; completada: true }>>(
        "/api/facilitador/sesiones/completar",
        { sesionId }
      );
      return data;
    },

    listarReportes: async (
      filtros: { evaluacionId?: string; tipo?: TipoReporte; grupoId?: string } = {}
    ): Promise<{ total: number; reportes: Record<"general" | "grupal" | "individual", Reporte[]> }> => {
      const { data } = await this.get<ApiEnvelope<{ total: number; reportes: Record<"general" | "grupal" | "individual", Reporte[]> }>>(
        `/api/facilitador/reportes${buildQuery(filtros)}`
      );
      return data;
    },
  };
}

export const databaseService = new DatabaseService();
export default databaseService;
