export interface Colegio {
  id: string;
  created_at: string;
}

export interface Analisis {
  id: string;
  colegio_id: string;
  nombre: string;
  fecha: string;
  created_at: string;
}

type Categoria = "aprendizaje" | "bienestar_psicologico" | "emociones";
export interface Formulario {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: Categoria;
  activo: boolean;
  created_at: string;
}

export interface Pregunta {
  id: string;
  formulario_id: string;
  texto: string;
  imagen_url: string | null;
  opciones_respuesta: string[];
  
}