import sql from "../../db";

// GET  /api/admin/evaluaciones  → lista todas las evaluaciones con KPIs
// POST /api/admin/evaluaciones  → crea una nueva evaluación
export const evaluacionRoutes = {

  async GET(_req: Request) {
    try {
      // Usa vista_progreso_evaluacion para obtener KPIs sin query manual
      const rows = await sql`
        SELECT *
        FROM vista_progreso_evaluacion
        ORDER BY fecha DESC
      `;
      return Response.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/admin/evaluaciones]", err);
      return Response.json({ error: "Error al obtener evaluaciones" }, { status: 500 });
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

      const [nueva] = await sql`
        INSERT INTO evaluacion (colegio_id, nombre, fecha, acepta_respuestas, reportes_publicados)
        VALUES (${colegioId}, ${nombre}, ${fecha}, false, false)
        RETURNING *
      `;

      return Response.json({ data: nueva }, { status: 201 });
    } catch (err) {
      console.error("[POST /api/admin/evaluaciones]", err);
      return Response.json({ error: "Error al crear evaluación" }, { status: 500 });
    }
  },
};