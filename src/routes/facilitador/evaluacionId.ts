import sql from "../../db";

// GET /api/facilitador/evaluaciones/:id
// El enlace corto identifica la evaluación y permite entrar directamente
// cuando está abierta. La clave del colegio se reserva para los reportes.
export const facilitadorEvaluacionIdRoutes = {

  async GET(req: Request) {
    try {
      const codigo = new URL(req.url).pathname.split("/").at(-1)!.toUpperCase();

      const [evaluacion] = await sql`
        SELECT
          ev.id AS evaluacion_id, ev.nombre, ev.estado, c.nombre AS colegio_nombre
        FROM evaluacion ev
        JOIN colegio c ON c.id = ev.colegio_id
        WHERE upper(ev.codigo_acceso::text) = ${codigo} OR lower(ev.id::text) = lower(${codigo})
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

  async POST(req: Request) {
    try {
      const codigo = new URL(req.url).pathname.split("/").at(-1)!.toUpperCase();

      const [evaluacion] = await sql`
        SELECT ev.id AS evaluacion_id, ev.nombre, ev.estado,
               ev.colegio_id, c.nombre AS colegio_nombre
        FROM evaluacion ev JOIN colegio c ON c.id = ev.colegio_id
        WHERE upper(ev.codigo_acceso::text) = ${codigo} OR lower(ev.id::text) = lower(${codigo})
      `;
      if (!evaluacion) return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
      if (evaluacion.estado !== "abierto") return Response.json({ error: "Esta evaluación no está aceptando respuestas" }, { status: 403 });

      const token = Buffer.from(evaluacion.colegioId).toString("base64");
      return Response.json({ data: { ...evaluacion, token } });
    } catch (err) {
      console.error("[POST /api/facilitador/evaluaciones/:id]", err);
      return Response.json({ error: "Error al verificar la evaluación" }, { status: 500 });
    }
  },
};
