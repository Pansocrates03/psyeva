import type { CategoriaFormulario } from "./types";

// Etiquetas en español para las 3 categorías de formulario del schema.
// Único lugar que traduce entre el valor real (categoria_formulario) y
// lo que se muestra en pantalla — reusar en cualquier página que liste
// o filtre formularios por categoría.
export const CATEGORIA_LABELS: Record<CategoriaFormulario, string> = {
  emociones: "Emociones",
  bienestar_psicologico: "Bienestar Psicológico",
  aprendizaje: "Aprendizaje",
};

export const CATEGORIAS: CategoriaFormulario[] = ["emociones", "bienestar_psicologico", "aprendizaje"];
