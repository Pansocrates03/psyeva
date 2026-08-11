import sql from "../../db";

// POST /api/facilitador/evaluaciones/:id/verificar
// Usado en /reportes/:id — a diferencia de /evaluacion/:id (aplicar la
// encuesta), aquí SÍ se pide la clave de acceso del colegio: el link
// solo indica de qué evaluación se quieren ver los reportes, la clave
// sigue siendo la que autentica al director/facilitador.
//
// Body: { claveAcceso: string }
export const facilitadorEvaluacionVerificarRoutes = {

  async POST(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-2)!;
      const body = await req.json();
      const { claveAcceso } = body;

      if (!claveAcceso || typeof claveAcceso !== "string") {
        return Response.json({ error: "claveAcceso es requerida" }, { status: 400 });
      }

      const [evaluacion] = await sql`
        SELECT
          ev.id       AS evaluacion_id,
          ev.nombre,
          ev.reportes_publicados,
          c.id        AS colegio_id,
          c.nombre    AS colegio_nombre,
          c.clave_acceso
        FROM evaluacion ev
        JOIN colegio c ON c.id = ev.colegio_id
        WHERE ev.id = ${id}
      `;

      if (!evaluacion) {
        return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }

      if (!evaluacion.reportesPublicados) {
        return Response.json(
          { error: "Los reportes de esta evaluación todavía no están publicados" },
          { status: 403 }
        );
      }

      if (evaluacion.claveAcceso.toUpperCase() !== claveAcceso.trim().toUpperCase()) {
        return Response.json(
          { error: "Código inválido. Verifica e intenta de nuevo." },
          { status: 401 }
        );
      }

      const token = Buffer.from(evaluacion.colegioId).toString("base64");

      return Response.json({
        data: {
          colegio: { id: evaluacion.colegioId, nombre: evaluacion.colegioNombre },
          evaluacion: { id: evaluacion.evaluacionId, nombre: evaluacion.nombre },
          token,
        },
      });
    } catch (err) {
      console.error("[POST /api/facilitador/evaluaciones/:id/verificar]", err);
      return Response.json({ error: "Error al verificar el código" }, { status: 500 });
    }
  },
};
