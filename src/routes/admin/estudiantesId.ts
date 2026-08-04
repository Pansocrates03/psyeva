import sql from "../../db";

// DELETE /api/admin/estudiantes/:id  → elimina un estudiante si no tiene sesiones registradas
export const estudiantesIdRoutes = {

  async DELETE(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;

      const [{ count }] = await sql`
        SELECT COUNT(*) AS count FROM sesion WHERE estudiante_id = ${id}
      `;
      if (Number(count) > 0) {
        return Response.json(
          { error: "No se puede eliminar: el estudiante ya tiene sesiones registradas" },
          { status: 409 }
        );
      }

      const [eliminado] = await sql`
        DELETE FROM estudiante WHERE id = ${id} RETURNING id
      `;

      if (!eliminado) {
        return Response.json({ error: "Estudiante no encontrado" }, { status: 404 });
      }

      return Response.json({ data: { id: eliminado.id, eliminado: true } });
    } catch (err) {
      console.error("[DELETE /api/admin/estudiantes/:id]", err);
      return Response.json({ error: "Error al eliminar el estudiante" }, { status: 500 });
    }
  },
};
