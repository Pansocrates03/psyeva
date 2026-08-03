import sql from "../../db";

// PATCH /api/admin/reportes/:id/publicar
// Alterna el estado publicado/despublicado de un reporte.
// Body opcional: { publicado: true | false }
// Si no se manda body, hace toggle del estado actual.
export const reportesPublicarRoutes = {

  async PATCH(req: Request) {
    try {
      const partes = new URL(req.url).pathname.split("/");
      // /api/admin/reportes/:id/publicar → id en índice -2
      const id = partes.at(-2)!;

      // Verifica que el reporte exista
      const [reporte] = await sql`
        SELECT id, publicado FROM reporte WHERE id = ${id}
      `;

      if (!reporte) {
        return Response.json({ error: "Reporte no encontrado" }, { status: 404 });
      }

      // Si el body trae { publicado: bool } lo usa; si no, hace toggle
      let nuevoEstado: boolean;
      try {
        const body   = await req.json();
        nuevoEstado  = typeof body.publicado === "boolean"
          ? body.publicado
          : !reporte.publicado;
      } catch {
        // Body vacío o no JSON → toggle
        nuevoEstado = !reporte.publicado;
      }

      const [actualizado] = await sql`
        UPDATE reporte
        SET publicado = ${nuevoEstado}
        WHERE id = ${id}
        RETURNING
          id,
          tipo,
          publicado,
          archivo_url,
          analisis_id,
          grupo_id,
          estudiante_id,
          created_at
      `;

      return Response.json({
        data: actualizado,
        mensaje: nuevoEstado ? "Reporte publicado" : "Reporte despublicado",
      });
    } catch (err) {
      console.error("[PATCH /api/admin/reportes/:id/publicar]", err);
      return Response.json({ error: "Error al cambiar estado del reporte" }, { status: 500 });
    }
  },
};