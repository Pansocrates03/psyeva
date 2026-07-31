import sql from "../../db";

// GET  /api/admin/analisis        → lista todos los análisis con su colegio
// POST /api/admin/analisis        → crea un nuevo análisis
export const analisisRoutes = {

  async GET(_req: Request) {
    try {
      const rows = await sql`
        SELECT
          a.id,
          a.nombre,
          a.fecha,
          a.created_at,
          c.id   AS colegio_id,
          c.nombre AS colegio_nombre
        FROM analisis a
        JOIN colegio c ON c.id = a.colegio_id
        ORDER BY a.created_at DESC
      `;
      return Response.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/admin/analisis]", err);
      return Response.json({ error: "Error al obtener análisis" }, { status: 500 });
    }
  },

  async POST(req: Request) {
    try {
      const body = await req.json();
      const { colegioId, nombre, fecha } = body;

      if (!colegioId || !nombre || !fecha) {
        return Response.json(
          { error: "colegioId, nombre y fecha son requeridos" },
          { status: 400 }
        );
      }

      // Verifica que el colegio exista
      const [colegio] = await sql`
        SELECT id FROM colegio WHERE id = ${colegioId}
      `;
      if (!colegio) {
        return Response.json({ error: "Colegio no encontrado" }, { status: 404 });
      }

      const [nuevo] = await sql`
        INSERT INTO analisis (colegio_id, nombre, fecha)
        VALUES (${colegioId}, ${nombre}, ${fecha})
        RETURNING *
      `;

      return Response.json({ data: nuevo }, { status: 201 });
    } catch (err) {
      console.error("[POST /api/admin/analisis]", err);
      return Response.json({ error: "Error al crear análisis" }, { status: 500 });
    }
  },
};