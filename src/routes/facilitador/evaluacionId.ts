import sql from "../../db";

// GET /api/facilitador/evaluaciones/:id
// Punto de entrada para el link que se comparte con los maestros
// (/evaluacion/:id en el frontend) — reemplaza la clave de acceso:
// el propio id de la evaluación (un UUID) funciona como el "secreto"
// del link. No requiere X-Colegio-Id porque es justo lo que resuelve.
export const facilitadorEvaluacionIdRoutes = {

  async GET(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;

      const [evaluacion] = await sql`
        SELECT
          ev.id       AS evaluacion_id,
          ev.nombre,
          ev.acepta_respuestas,
          ev.reportes_publicados,
          ev.colegio_id,
          c.nombre    AS colegio_nombre
        FROM evaluacion ev
        JOIN colegio c ON c.id = ev.colegio_id
        WHERE ev.id = ${id}
      `;

      if (!evaluacion) {
        return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }

      return Response.json({ data: evaluacion });
    } catch (err) {
      console.error("[GET /api/facilitador/evaluaciones/:id]", err);
      return Response.json({ error: "Error al obtener la evaluación" }, { status: 500 });
    }
  },
};
