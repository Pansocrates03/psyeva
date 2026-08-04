import sql from "../../db";

const CATEGORIAS_VALIDAS = ["emociones", "bienestar_psicologico", "aprendizaje"];

// GET  /api/admin/formularios  → catálogo de formularios con su total de preguntas
// POST /api/admin/formularios  → crea un formulario junto con sus preguntas (atómico)
//
// Body POST: {
//   titulo, descripcion, categoria,
//   preguntas: [{ texto, imagenUrl?, opcionesRespuesta: [{ valor, texto }] }]
// }
export const formulariosRoutes = {

  async GET(_req: Request) {
    try {
      const rows = await sql`
        SELECT
          f.id,
          f.titulo,
          f.descripcion,
          f.categoria,
          f.created_at,
          COUNT(p.id) AS total_preguntas
        FROM formulario f
        LEFT JOIN pregunta p ON p.formulario_id = f.id
        GROUP BY f.id
        ORDER BY f.created_at DESC
      `;
      return Response.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/admin/formularios]", err);
      return Response.json({ error: "Error al obtener formularios" }, { status: 500 });
    }
  },

  async POST(req: Request) {
    try {
      const body = await req.json();
      const { titulo, descripcion, categoria, preguntas } = body;

      if (!titulo || !categoria) {
        return Response.json({ error: "titulo y categoria son requeridos" }, { status: 400 });
      }
      if (!CATEGORIAS_VALIDAS.includes(categoria)) {
        return Response.json(
          { error: `categoria debe ser una de: ${CATEGORIAS_VALIDAS.join(", ")}` },
          { status: 400 }
        );
      }
      if (!Array.isArray(preguntas) || preguntas.length === 0) {
        return Response.json({ error: "preguntas debe ser un array con al menos un elemento" }, { status: 400 });
      }
      for (const p of preguntas) {
        if (!p.texto || !Array.isArray(p.opcionesRespuesta) || p.opcionesRespuesta.length < 2) {
          return Response.json(
            { error: "Cada pregunta requiere texto y al menos 2 opcionesRespuesta" },
            { status: 400 }
          );
        }
      }

      // Inserta formulario + preguntas en una sola transacción
      const formulario = await sql.begin(async tx => {
        const [nuevoFormulario] = await tx`
          INSERT INTO formulario (titulo, descripcion, categoria)
          VALUES (${titulo.trim()}, ${descripcion ?? ""}, ${categoria}::categoria_formulario)
          RETURNING *
        `;

        for (const p of preguntas) {
          await tx`
            INSERT INTO pregunta (formulario_id, texto, imagen_url, opciones_respuesta)
            VALUES (
              ${nuevoFormulario.id},
              ${p.texto.trim()},
              ${p.imagenUrl ?? null},
              ${sql.json(p.opcionesRespuesta)}
            )
          `;
        }

        return nuevoFormulario;
      });

      return Response.json({ data: formulario }, { status: 201 });
    } catch (err) {
      console.error("[POST /api/admin/formularios]", err);
      return Response.json({ error: "Error al crear el formulario" }, { status: 500 });
    }
  },
};
