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

      const preguntas = await sql`
        SELECT * FROM pregunta WHERE formulario_id = ${id} ORDER BY id
      `;

      return Response.json({ data: { ...formulario, preguntas } });
    } catch (err) {
      console.error("[GET /api/admin/formularios/:id]", err);
      return Response.json({ error: "Error al obtener el formulario" }, { status: 500 });
    }
  },

  async PATCH(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;
      const body = await req.json();
      const { titulo, descripcion, categoria, preguntas } = body;

      if (categoria && !CATEGORIAS_VALIDAS.includes(categoria)) {
        return Response.json(
          { error: `categoria debe ser una de: ${CATEGORIAS_VALIDAS.join(", ")}` },
          { status: 400 }
        );
      }
      if (preguntas !== undefined) {
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

        // Reemplaza el set completo de preguntas solo si se envió uno nuevo
        if (preguntas !== undefined) {
          await tx`DELETE FROM pregunta WHERE formulario_id = ${id}`;
          for (const p of preguntas) {
            await tx`
              INSERT INTO pregunta (formulario_id, texto, imagen_url, opciones_respuesta)
              VALUES (${id}, ${p.texto.trim()}, ${p.imagenUrl ?? null}, ${sql.json(p.opcionesRespuesta)})
            `;
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
