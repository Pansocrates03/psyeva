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

// Carpetas del bucket para el catálogo de imágenes seleccionables (ver
// SelectorImagen.tsx, Configuracion.tsx y el allowlist de
// src/routes/admin/imagenes.ts — CARPETAS_PERMITIDAS debe reflejar
// exactamente estos mismos 4 valores).
//
// Las imágenes de "preguntas" son una carpeta por categoría, para que el
// selector de una pregunta de un formulario de Emociones no muestre
// imágenes pensadas para Aprendizaje, etc. Las de "instrucciones" en
// cambio son UNA sola carpeta global — a propósito: la instrucción de
// una sección es un mismo tipo de contenido (texto/dibujo explicando
// cómo responder) sin importar la categoría del formulario.
export const CARPETA_INSTRUCCIONES = "assets/instrucciones";

export const CARPETA_PREGUNTAS_POR_CATEGORIA: Record<CategoriaFormulario, string> = {
  emociones: "assets/preguntas_emociones",
  bienestar_psicologico: "assets/preguntas_psico",
  aprendizaje: "assets/preguntas_aprendizaje",
};
