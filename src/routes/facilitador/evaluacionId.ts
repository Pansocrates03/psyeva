import sql from "../../db";

// GET /api/facilitador/evaluaciones/:id
// El código corto identifica la evaluación; la clave del colegio es
// necesaria para cargar grupos y estudiantes.
export const facilitadorEvaluacionIdRoutes = {

  async GET(req: Request) {
    try {
      const codigo = new URL(req.url).pathname.split("/").at(-1)!.toUpperCase();

      const [evaluacion] = await sql`
        SELECT
          ev.id AS evaluacion_id, ev.nombre, ev.estado, c.nombre AS colegio_nombre
        FROM evaluacion ev
        JOIN colegio c ON c.id = ev.colegio_id
        WHERE ev.codigo_acceso = ${codigo} OR ev.id::text = ${codigo}
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
      const body = await req.json();
      const claveAcceso = typeof body.claveAcceso === "string" ? body.claveAcceso.trim() : "";
      if (!claveAcceso) return Response.json({ error: "La clave del colegio es requerida" }, { status: 400 });

      const [evaluacion] = await sql`
        SELECT ev.id AS evaluacion_id, ev.nombre, ev.estado,
               ev.colegio_id, c.nombre AS colegio_nombre
        FROM evaluacion ev JOIN colegio c ON c.id = ev.colegio_id
        WHERE (ev.codigo_acceso = ${codigo} OR ev.id::text = ${codigo})
          AND UPPER(c.clave_acceso) = UPPER(${claveAcceso})
      `;
      if (!evaluacion) return Response.json({ error: "Código de evaluación o clave del colegio inválidos" }, { status: 401 });
      if (evaluacion.estado !== "abierto") return Response.json({ error: "Esta evaluación no está aceptando respuestas" }, { status: 403 });

      const token = Buffer.from(evaluacion.colegioId).toString("base64");
      return Response.json({ data: { ...evaluacion, token } });
    } catch (err) {
      console.error("[POST /api/facilitador/evaluaciones/:id]", err);
      return Response.json({ error: "Error al verificar la evaluación" }, { status: 500 });
    }
  },
};
