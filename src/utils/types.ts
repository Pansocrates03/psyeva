type CategoriaFormulario = "aprendizaje" | "bienestar_psicologico" | "emociones";

export interface Colegio {
  id: string;
  nombre: string;
  clave_acceso: string;
  created_at: string;
}

export interface Evaluacion {
  id: string;
  colegio_id: string;
  nombre: string;
  acepta_respuestas: boolean;
  reportes_publicados: boolean;
  fecha: string;
  created_at: string;
}

export interface Formulario {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaFormulario;
  created_at: string;
}

export interface Grupo {
  id: string;
  evaluacion_id: string;
  form_emociones_id: string | null;
  form_bienpsic_id: string | null;
  form_aprendizaje_id: string | null;
  nombre: string;
  created_at: string;
}

export interface Pregunta {
  id: string;
  formulario_id: string;
  texto: string;
  imagen_url: string | null;
  opciones_respuesta: string[]; 
}

export interface Estudiante {
  id: string;
  grupo_id: string;
  nombre_completo: string;
  curp: string;
  created_at: string;
}

export interface Sesion {
  id: string;
  estudiante_id: string;
  formulario_id: string;
  evaluacion_id: string;
  estado: "iniciada" | "completada";
  iniciada_at: string | null;
  completada_at: string | null;
}

export interface Reporte {
  id: string;
  tipo: "individual" | "grupal" | "general";
  evaluacion_id: string;
  grupo_id: string | null;
  estudiante_id: string | null;
  archivo_url: string;
  created_at: string;
}

export interface Respuesta {
  id: string;
  sesion_id: string;
  pregunta_id: string;
  texto_libre: string | null;
  respondida_at: string | null;
}