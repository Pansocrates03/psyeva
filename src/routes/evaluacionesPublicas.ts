import sql from "../db";

// GET /api/evaluaciones-publicas
// Lista las evaluaciones programadas, abiertas o con reportes publicados.
export const evaluacionesPublicasRoutes = {
  async GET() {
    try {
      const evaluaciones = await sql`
        SELECT
          c.id AS colegio_id,
          c.nombre AS colegio_nombre,
          ev.codigo_acceso,
          ev.nombre AS evaluacion_nombre,
          ev.fecha,
          ev.estado
        FROM evaluacion ev
        JOIN colegio c ON c.id = ev.colegio_id
        WHERE ev.fecha >= CURRENT_DATE
           OR ev.estado IN ('abierto', 'publico')
        ORDER BY c.nombre, ev.fecha, ev.nombre
      `;

      return Response.json({ data: evaluaciones });
    } catch (err) {
      console.error("[GET /api/evaluaciones-publicas]", err);
      return Response.json({ error: "No se pudieron obtener las evaluaciones" }, { status: 500 });
    }
  },
};
