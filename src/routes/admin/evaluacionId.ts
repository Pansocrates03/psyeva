import sql from "../../db";

// GET    /api/admin/evaluaciones/:id  → detalle con grupos y KPIs
// PATCH  /api/admin/evaluaciones/:id  → edita campos incluyendo acepta_respuestas y reportes_publicados
// DELETE /api/admin/evaluaciones/:id  → elimina si no tiene sesiones completadas
export const evaluacionIdRoutes = {

  async GET(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;

      // Vista con KPIs globales de la evaluación
      const [evaluacion] = await sql`
        SELECT *
        FROM vista_progreso_evaluacion
        WHERE evaluacion_id = ${id}
      `;

      if (!evaluacion) {
        return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }

      // Grupos con su progreso usando la view
      const grupos = await sql`
        SELECT *
        FROM vista_progreso_grupo
        WHERE evaluacion_id = ${id}
        ORDER BY grupo_nombre
      `;

      return Response.json({ data: { ...evaluacion, grupos } });
    } catch (err) {
      console.error("[GET /api/admin/evaluaciones/:id]", err);
      return Response.json({ error: "Error al obtener la evaluación" }, { status: 500 });
    }
  },

  async PATCH(req: Request) {
    try {
      const id   = new URL(req.url).pathname.split("/").at(-1)!;
      const body = await req.json();
      const { nombre, fecha, aceptaRespuestas, reportesPublicados } = body;

      if (nombre === undefined && fecha === undefined &&
          aceptaRespuestas === undefined && reportesPublicados === undefined) {
        return Response.json(
          { error: "Debes enviar al menos un campo a actualizar" },
          { status: 400 }
        );
      }

      const [actualizado] = await sql`
        UPDATE evaluacion
        SET
          nombre              = COALESCE(${nombre              ?? null}, nombre),
          fecha               = COALESCE(${fecha               ?? null}::date, fecha),
          acepta_respuestas   = COALESCE(${aceptaRespuestas    ?? null}::boolean, acepta_respuestas),
          reportes_publicados = COALESCE(${reportesPublicados  ?? null}::boolean, reportes_publicados)
        WHERE id = ${id}
        RETURNING *
      `;

      if (!actualizado) {
        return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }

      return Response.json({ data: actualizado });
    } catch (err) {
      console.error("[PATCH /api/admin/evaluaciones/:id]", err);
      return Response.json({ error: "Error al actualizar evaluación" }, { status: 500 });
    }
  },

  async DELETE(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;

      // Protege datos: no elimina si hay sesiones completadas
      const [{ count }] = await sql`
        SELECT COUNT(*) AS count
        FROM sesion
        WHERE evaluacion_id = ${id} AND estado = 'completada'
      `;

      if (Number(count) > 0) {
        return Response.json(
          { error: "No se puede eliminar una evaluación con sesiones completadas" },
          { status: 409 }
        );
      }

      const [eliminado] = await sql`
        DELETE FROM evaluacion WHERE id = ${id} RETURNING id
      `;

      if (!eliminado) {
        return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }

      return Response.json({ data: { id: eliminado.id, eliminado: true } });
    } catch (err) {
      console.error("[DELETE /api/admin/evaluaciones/:id]", err);
      return Response.json({ error: "Error al eliminar evaluación" }, { status: 500 });
    }
  },
};