import sql from "../../db";

// GET /api/facilitador/reportes
// Devuelve los reportes del colegio del facilitador,
// solo cuando evaluacion.reportes_publicados = true.
// Nunca devuelve reportes de otros colegios.
//
// Headers requeridos:
//   X-Colegio-Id: uuid
//
// Query params opcionales:
//   ?evaluacionId=uuid
//   ?tipo=individual|grupal|general
//   ?grupoId=uuid
export const facilitadorReportesRoutes = {

  async GET(req: Request) {
    try {
      const url          = new URL(req.url);
      const colegioId    = req.headers.get("X-Colegio-Id");
      const evaluacionId = url.searchParams.get("evaluacionId") ?? null;
      const tipo         = url.searchParams.get("tipo")         ?? null;
      const grupoId      = url.searchParams.get("grupoId")      ?? null;

      if (!colegioId) {
        return Response.json(
          { error: "Header X-Colegio-Id requerido" },
          { status: 401 }
        );
      }

      // La visibilidad la controla evaluacion.reportes_publicados
      // no un campo en la tabla reporte
      const reportes = await sql`
        SELECT
          r.id,
          r.tipo,
          r.archivo_url,
          r.created_at,
          ev.id     AS evaluacion_id,
          ev.nombre AS evaluacion_nombre,
          ev.fecha  AS evaluacion_fecha,
          g.id      AS grupo_id,
          g.nombre  AS grupo_nombre,
          e.id               AS estudiante_id,
          e.nombre_completo  AS estudiante_nombre
        FROM reporte r
        JOIN evaluacion ev ON ev.id = r.evaluacion_id
        LEFT JOIN grupo      g ON g.id = r.grupo_id
        LEFT JOIN estudiante e ON e.id = r.estudiante_id
        WHERE ev.reportes_publicados = true
          AND ev.colegio_id          = ${colegioId}
          AND (${evaluacionId}::uuid IS NULL OR r.evaluacion_id = ${evaluacionId}::uuid)
          AND (${tipo}::text         IS NULL OR r.tipo          = ${tipo}::tipo_reporte)
          AND (${grupoId}::uuid      IS NULL OR r.grupo_id      = ${grupoId}::uuid)
        ORDER BY r.created_at DESC
      `;

      // Agrupa por tipo para facilitar el renderizado en el frontend
      const agrupado = {
        general:    reportes.filter(r => r.tipo === "general"),
        grupal:     reportes.filter(r => r.tipo === "grupal"),
        individual: reportes.filter(r => r.tipo === "individual"),
      };

      return Response.json({
        data: {
          total:   reportes.length,
          reportes: agrupado,
        },
      });
    } catch (err) {
      console.error("[GET /api/facilitador/reportes]", err);
      return Response.json({ error: "Error al obtener reportes" }, { status: 500 });
    }
  },
};