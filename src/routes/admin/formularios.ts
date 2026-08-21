import sql from "../../db";

const CATEGORIAS_VALIDAS = ["emociones", "bienestar_psicologico", "aprendizaje"];

// GET  /api/admin/formularios  → catálogo de formularios con su total de preguntas
// POST /api/admin/formularios  → crea un formulario junto con sus secciones (atómico)
//
// Body POST: {
//   titulo, descripcion, categoria,
//   secciones: [{
//     instruccionTexto?, instruccionImagenUrl?,
//     opcionesRespuesta: [{ valor, texto }],
//     preguntas: [{ texto, imagenUrl? }]
//   }]
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
        LEFT JOIN seccion  s ON s.formulario_id = f.id
        LEFT JOIN pregunta p ON p.seccion_id    = s.id
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
      const { titulo, descripcion, categoria, secciones } = body;

      if (!titulo || !categoria) {
        return Response.json({ error: "titulo y categoria son requeridos" }, { status: 400 });
      }
      if (!CATEGORIAS_VALIDAS.includes(categoria)) {
        return Response.json(
          { error: `categoria debe ser una de: ${CATEGORIAS_VALIDAS.join(", ")}` },
          { status: 400 }
        );
      }
      if (!Array.isArray(secciones) || secciones.length === 0) {
        return Response.json({ error: "secciones debe ser un array con al menos un elemento" }, { status: 400 });
      }
      for (const s of secciones) {
        if (!s.instruccionTexto && !s.instruccionImagenUrl) {
          return Response.json(
            { error: "Cada sección requiere instruccionTexto o instruccionImagenUrl" },
            { status: 400 }
          );
        }
        if (!Array.isArray(s.opcionesRespuesta) || s.opcionesRespuesta.length < 2) {
          return Response.json(
            { error: "Cada sección requiere al menos 2 opcionesRespuesta" },
            { status: 400 }
          );
        }
        if (!Array.isArray(s.preguntas) || s.preguntas.length === 0) {
          return Response.json(
            { error: "Cada sección requiere al menos una pregunta" },
            { status: 400 }
          );
        }
        for (const p of s.preguntas) {
          if (!p.texto) {
            return Response.json({ error: "Cada pregunta requiere texto" }, { status: 400 });
          }
        }
      }

      // Inserta formulario + secciones + preguntas en una sola transacción
      const formulario = await sql.begin(async tx => {
        const [nuevoFormulario] = await tx`
          INSERT INTO formulario (titulo, descripcion, categoria)
          VALUES (${titulo.trim()}, ${descripcion ?? ""}, ${categoria}::categoria_formulario)
          RETURNING *
        `;

        for (let si = 0; si < secciones.length; si++) {
          const s = secciones[si];
          const [nuevaSeccion] = await tx`
            INSERT INTO seccion (formulario_id, orden, instruccion_texto, instruccion_imagen_url, opciones_respuesta)
            VALUES (
              ${nuevoFormulario.id},
              ${si + 1},
              ${s.instruccionTexto ?? null},
              ${s.instruccionImagenUrl ?? null},
              ${sql.json(s.opcionesRespuesta)}
            )
            RETURNING id
          `;

          for (let pi = 0; pi < s.preguntas.length; pi++) {
            const p = s.preguntas[pi];
            await tx`
              INSERT INTO pregunta (seccion_id, orden, texto, imagen_url)
              VALUES (${nuevaSeccion.id}, ${pi + 1}, ${p.texto.trim()}, ${p.imagenUrl ?? null})
            `;
          }
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
