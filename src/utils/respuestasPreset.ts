// Grupos de respuesta que se repiten seguido al armar incisos de encuestas
// base (ver EncuestasBase.tsx) — permiten rellenar las opciones de un inciso
// de un solo click en vez de escribirlas a mano cada vez.
export interface RespuestaPreset {
  id: string;
  label: string;
  respuestas: string[];
}

export const RESPUESTAS_PRESETS: RespuestaPreset[] = [
  { id: "si_no",           label: "Sí / No",                                          respuestas: ["Sí", "No"] },
  { id: "frecuencia_3",    label: "Muchísimas veces / A veces / Nunca",                respuestas: ["Muchísimas veces", "A veces", "Nunca"] },
  { id: "identificacion_3", label: "Sí soy así / No sé / No soy así",                  respuestas: ["Sí soy así", "No sé", "No soy así"] },
  { id: "disfrute_3",      label: "Disfruto mucho / Disfruto poco / No disfruto",      respuestas: ["Disfruto mucho", "Disfruto poco", "No disfruto"] },
  { id: "gusto_3",         label: "Me gusta mucho / Me gusta poco / No me gusta",      respuestas: ["Me gusta mucho", "Me gusta poco", "No me gusta"] },
  { id: "recuerdo_3",      label: "Recuerdo mucho / Recuerdo poco / No recuerdo nada", respuestas: ["Recuerdo mucho", "Recuerdo poco", "No recuerdo nada"] },
];
