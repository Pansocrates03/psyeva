import sql from "../../db";

// GET    /api/admin/grupos/:id  → detalle del grupo con estudiantes
// PATCH  /api/admin/grupos/:id  → edita nombre o formularios asignados
// DELETE /api/admin/grupos/:id  → elimina si no tiene sesiones completadas
export const gruposIdRoutes = {

  async GET(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;

      // Progreso del grupo usando la view
      const [grupo] = await sql`
        SELECT
          vpg.*,
          fe.titulo AS form_emociones_titulo,
          fb.titulo AS form_bienpsic_titulo,
          fa.titulo AS form_aprendizaje_titulo
        FROM vista_progreso_grupo vpg
        LEFT JOIN formulario fe ON fe.id = vpg.form_emociones_id
        LEFT JOIN formulario fb ON fb.id = vpg.form_bienpsic_id
        LEFT JOIN formulario fa ON fa.id = vpg.form_aprendizaje_id
        WHERE vpg.grupo_id = ${id}
      `;

      if (!grupo) {
        return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
      }

      // Estudiantes con estado por categoría usando la view
      const estudiantes = await sql`
        SELECT *
        FROM vista_estado_alumno
        WHERE grupo_id      = ${id}
          AND evaluacion_id = ${grupo.evaluacionId}
        ORDER BY nombre_completo
      `;

      return Response.json({ data: { ...grupo, estudiantes } });
    } catch (err) {
      console.error("[GET /api/admin/grupos/:id]", err);
      return Response.json({ error: "Error al obtener el grupo" }, { status: 500 });
    }
  },

  async PATCH(req: Request) {
    try {
      const id   = new URL(req.url).pathname.split("/").at(-1)!;
      const body = await req.json();
      const { nombre, formEmocionesId, formBienpsicId, formAprendizajeId } = body;

      if (!nombre && !formEmocionesId && !formBienpsicId && !formAprendizajeId) {
        return Response.json(
          { error: "Debes enviar al menos un campo a actualizar" },
          { status: 400 }
        );
      }

      const [actualizado] = await sql`
        UPDATE grupo
        SET
          nombre              = COALESCE(${nombre             ?? null}, nombre),
          form_emociones_id   = COALESCE(${formEmocionesId   ?? null}::uuid, form_emociones_id),
          form_bienpsic_id    = COALESCE(${formBienpsicId    ?? null}::uuid, form_bienpsic_id),
          form_aprendizaje_id = COALESCE(${formAprendizajeId ?? null}::uuid, form_aprendizaje_id)
        WHERE id = ${id}
        RETURNING *
      `;

      if (!actualizado) {
        return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
      }

      return Response.json({ data: actualizado });
    } catch (err) {
      console.error("[PATCH /api/admin/grupos/:id]", err);
      return Response.json({ error: "Error al actualizar el grupo" }, { status: 500 });
    }
  },

  async DELETE(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;

      // Protege datos: no elimina si hay sesiones completadas en este grupo
      const [{ count }] = await sql`
        SELECT COUNT(*) AS count
        FROM sesion s
        JOIN estudiante e ON e.id = s.estudiante_id
        WHERE e.grupo_id = ${id}
          AND s.estado   = 'completada'
      `;

      if (Number(count) > 0) {
        return Response.json(
          { error: "No se puede eliminar un grupo con sesiones completadas" },
          { status: 409 }
        );
      }

      const [eliminado] = await sql`
        DELETE FROM grupo WHERE id = ${id} RETURNING id
      `;

      if (!eliminado) {
        return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
      }

      return Response.json({ data: { id: eliminado.id, eliminado: true } });
    } catch (err) {
      console.error("[DELETE /api/admin/grupos/:id]", err);
      return Response.json({ error: "Error al eliminar el grupo" }, { status: 500 });
    }
  },
};