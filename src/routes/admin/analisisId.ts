import sql from "../../db";

// GET    /api/admin/analisis/:id  → detalle del análisis con grupos y KPIs
// PATCH  /api/admin/analisis/:id  → edita nombre o fecha
// DELETE /api/admin/analisis/:id  → elimina si no tiene sesiones completadas
export const analisisIdRoutes = {

  async GET(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;

      const [analisis] = await sql`
        SELECT
          a.id,
          a.nombre,
          a.fecha,
          a.created_at,
          c.id     AS colegio_id,
          c.nombre AS colegio_nombre
        FROM analisis a
        JOIN colegio c ON c.id = a.colegio_id
        WHERE a.id = ${id}
      `;

      if (!analisis) {
        return Response.json({ error: "Análisis no encontrado" }, { status: 404 });
      }

      // Grupos del análisis con sus KPIs
      const grupos = await sql`
        SELECT
          g.id,
          g.nombre,
          g.form_emociones_id,
          g.form_bienpsic_id,
          g.form_aprendizaje_id,
          g.created_at,
          COUNT(DISTINCT e.id)                                        AS total_alumnos,
          COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'completada') AS sesiones_completadas,
          COUNT(DISTINCT r.id) FILTER (WHERE r.tipo = 'individual'
                                        AND r.publicado = true)       AS reportes_publicados,
          COUNT(DISTINCT r_g.id) FILTER (WHERE r_g.tipo = 'grupal')   AS reporte_grupal
        FROM grupo g
        LEFT JOIN estudiante e  ON e.grupo_id  = g.id
        LEFT JOIN sesion     s  ON s.estudiante_id = e.id AND s.analisis_id = ${id}
        LEFT JOIN reporte    r  ON r.estudiante_id = e.id AND r.analisis_id = ${id}
        LEFT JOIN reporte    r_g ON r_g.grupo_id  = g.id AND r_g.analisis_id = ${id}
        WHERE g.analisis_id = ${id}
        GROUP BY g.id
        ORDER BY g.nombre
      `;

      return Response.json({ data: { ...analisis, grupos } });
    } catch (err) {
      console.error("[GET /api/admin/analisis/:id]", err);
      return Response.json({ error: "Error al obtener el análisis" }, { status: 500 });
    }
  },

  async PATCH(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;
      const body = await req.json();
      const { nombre, fecha } = body;

      if (!nombre && !fecha) {
        return Response.json(
          { error: "Debes enviar al menos nombre o fecha" },
          { status: 400 }
        );
      }

      const [actualizado] = await sql`
        UPDATE analisis
        SET
          nombre = COALESCE(${nombre ?? null}, nombre),
          fecha  = COALESCE(${fecha  ?? null}::date, fecha)
        WHERE id = ${id}
        RETURNING *
      `;

      if (!actualizado) {
        return Response.json({ error: "Análisis no encontrado" }, { status: 404 });
      }

      return Response.json({ data: actualizado });
    } catch (err) {
      console.error("[PATCH /api/admin/analisis/:id]", err);
      return Response.json({ error: "Error al actualizar análisis" }, { status: 500 });
    }
  },

  async DELETE(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;

      // No permite eliminar si hay sesiones completadas (datos de alumnos)
      const [{ count }] = await sql`
        SELECT COUNT(*) AS count
        FROM sesion
        WHERE analisis_id = ${id} AND estado = 'completada'
      `;

      if (Number(count) > 0) {
        return Response.json(
          { error: "No se puede eliminar un análisis con sesiones completadas" },
          { status: 409 }
        );
      }

      const [eliminado] = await sql`
        DELETE FROM analisis WHERE id = ${id} RETURNING id
      `;

      if (!eliminado) {
        return Response.json({ error: "Análisis no encontrado" }, { status: 404 });
      }

      return Response.json({ data: { id: eliminado.id, eliminado: true } });
    } catch (err) {
      console.error("[DELETE /api/admin/analisis/:id]", err);
      return Response.json({ error: "Error al eliminar análisis" }, { status: 500 });
    }
  },
};