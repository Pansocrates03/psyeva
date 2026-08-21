import sql from "../../db";

const CATEGORIAS_VALIDAS = ["emociones", "bienestar_psicologico", "aprendizaje"];

// GET    /api/admin/formularios/:id  → detalle con sus preguntas
// PATCH  /api/admin/formularios/:id  → edita metadatos y reemplaza el set de preguntas
// DELETE /api/admin/formularios/:id  → elimina si ningún grupo lo tiene asignado
export const formulariosIdRoutes = {

  async GET(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;

      const [formulario] = await sql`SELECT * FROM formulario WHERE id = ${id}`;
      if (!formulario) {
        return Response.json({ error: "Formulario no encontrado" }, { status: 404 });
      }

      // Secciones + preguntas en una sola query (LEFT JOIN: una sección
      // sin preguntas todavía debe aparecer igual), agrupadas después en JS.
      const filas = await sql`
        SELECT
          s.id                     AS seccion_id,
          s.orden                  AS seccion_orden,
          s.instruccion_texto,
          s.instruccion_imagen_url,
          s.opciones_respuesta,
          p.id                     AS pregunta_id,
          p.orden                  AS pregunta_orden,
          p.texto                  AS pregunta_texto,
          p.imagen_url             AS pregunta_imagen_url
        FROM seccion s
        LEFT JOIN pregunta p ON p.seccion_id = s.id
        WHERE s.formulario_id = ${id}
        ORDER BY s.orden, p.orden
      `;

      const seccionesPorId = new Map<string, {
        id: string; orden: number;
        instruccionTexto: string | null; instruccionImagenUrl: string | null;
        opcionesRespuesta: unknown; preguntas: unknown[];
      }>();
      for (const fila of filas) {
        if (!seccionesPorId.has(fila.seccionId)) {
          seccionesPorId.set(fila.seccionId, {
            id: fila.seccionId,
            orden: fila.seccionOrden,
            instruccionTexto: fila.instruccionTexto,
            instruccionImagenUrl: fila.instruccionImagenUrl,
            opcionesRespuesta: fila.opcionesRespuesta,
            preguntas: [],
          });
        }
        if (fila.preguntaId) {
          seccionesPorId.get(fila.seccionId)!.preguntas.push({
            id: fila.preguntaId,
            orden: fila.preguntaOrden,
            texto: fila.preguntaTexto,
            imagenUrl: fila.preguntaImagenUrl,
          });
        }
      }

      return Response.json({ data: { ...formulario, secciones: [...seccionesPorId.values()] } });
    } catch (err) {
      console.error("[GET /api/admin/formularios/:id]", err);
      return Response.json({ error: "Error al obtener el formulario" }, { status: 500 });
    }
  },

  async PATCH(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;
      const body = await req.json();
      const { titulo, descripcion, categoria, secciones } = body;

      if (categoria && !CATEGORIAS_VALIDAS.includes(categoria)) {
        return Response.json(
          { error: `categoria debe ser una de: ${CATEGORIAS_VALIDAS.join(", ")}` },
          { status: 400 }
        );
      }
      if (secciones !== undefined) {
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
      }

      const formulario = await sql.begin(async tx => {
        const [actualizado] = await tx`
          UPDATE formulario
          SET
            titulo      = COALESCE(${titulo ?? null}, titulo),
            descripcion = COALESCE(${descripcion ?? null}, descripcion),
            categoria   = COALESCE(${categoria ?? null}, categoria)
          WHERE id = ${id}
          RETURNING *
        `;

        if (!actualizado) return null;

        // Reemplaza el set completo de secciones (y sus preguntas, por
        // CASCADE) solo si se envió uno nuevo. Si alguna pregunta actual
        // ya tiene respuestas registradas, el DELETE falla por el FK
        // RESTRICT de respuesta.pregunta_id — se traduce a 409 más abajo.
        if (secciones !== undefined) {
          await tx`DELETE FROM seccion WHERE formulario_id = ${id}`;
          for (let si = 0; si < secciones.length; si++) {
            const s = secciones[si];
            const [nuevaSeccion] = await tx`
              INSERT INTO seccion (formulario_id, orden, instruccion_texto, instruccion_imagen_url, opciones_respuesta)
              VALUES (
                ${id},
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
        }

        return actualizado;
      });

      if (!formulario) {
        return Response.json({ error: "Formulario no encontrado" }, { status: 404 });
      }

      return Response.json({ data: formulario });
    } catch (err: any) {
      // RESTRICT: alguna de las preguntas actuales ya tiene respuestas registradas
      if (err?.code === "23001" || err?.code === "23503") {
        return Response.json(
          { error: "No se pueden reemplazar las preguntas: algunas ya tienen respuestas registradas" },
          { status: 409 }
        );
      }
      console.error("[PATCH /api/admin/formularios/:id]", err);
      return Response.json({ error: "Error al actualizar el formulario" }, { status: 500 });
    }
  },

  async DELETE(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;

      const [eliminado] = await sql`
        DELETE FROM formulario WHERE id = ${id} RETURNING id
      `;

      if (!eliminado) {
        return Response.json({ error: "Formulario no encontrado" }, { status: 404 });
      }

      return Response.json({ data: { id: eliminado.id, eliminado: true } });
    } catch (err: any) {
      // FK RESTRICT: grupo.form_*_id o sesion.formulario_id lo referencian
      if (err?.code === "23001" || err?.code === "23503") {
        return Response.json(
          { error: "No se puede eliminar: hay grupos o sesiones que usan este formulario" },
          { status: 409 }
        );
      }
      console.error("[DELETE /api/admin/formularios/:id]", err);
      return Response.json({ error: "Error al eliminar el formulario" }, { status: 500 });
    }
  },
};
