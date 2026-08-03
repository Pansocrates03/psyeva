import sql from "../../db";

// GET /api/facilitador/grupos
// Devuelve los grupos de una evaluación con su progreso.
// Valida que la evaluación pertenezca al colegio del facilitador
// y que esté aceptando respuestas.
//
// Query params requeridos:
//   ?evaluacionId=uuid
//
// Headers requeridos:
//   X-Colegio-Id: uuid
export const facilitadorGruposRoutes = {

  async GET(req: Request) {
    try {
      const url          = new URL(req.url);
      const evaluacionId = url.searchParams.get("evaluacionId");
      const colegioId    = req.headers.get("X-Colegio-Id");

      if (!evaluacionId) {
        return Response.json(
          { error: "evaluacionId es requerido como query param" },
          { status: 400 }
        );
      }

      if (!colegioId) {
        return Response.json(
          { error: "Header X-Colegio-Id requerido" },
          { status: 401 }
        );
      }

      // Verifica pertenencia al colegio y que acepte respuestas
      const [evaluacion] = await sql`
        SELECT id, nombre, fecha, acepta_respuestas, reportes_publicados
        FROM evaluacion
        WHERE id         = ${evaluacionId}
          AND colegio_id = ${colegioId}
      `;

      if (!evaluacion) {
        return Response.json(
          { error: "Evaluación no encontrada o no pertenece a tu colegio" },
          { status: 403 }
        );
      }

      if (!evaluacion.aceptaRespuestas) {
        return Response.json(
          { error: "Esta evaluación no está aceptando respuestas" },
          { status: 403 }
        );
      }

      // Grupos con progreso usando la view
      const grupos = await sql`
        SELECT
          vpg.*,
          fe.titulo AS form_emociones_titulo,
          fb.titulo AS form_bienpsic_titulo,
          fa.titulo AS form_aprendizaje_titulo
        FROM vista_progreso_grupo vpg
        LEFT JOIN formulario fe ON fe.id = vpg.form_emociones_id
        LEFT JOIN formulario fb ON fb.id = vpg.form_bienpsic_id
        LEFT JOIN formulario fa ON fa.id = vpg.form_aprendizaje_id
        WHERE vpg.evaluacion_id = ${evaluacionId}
        ORDER BY vpg.grupo_nombre
      `;

      return Response.json({
        data: { evaluacion, grupos },
      });
    } catch (err) {
      console.error("[GET /api/facilitador/grupos]", err);
      return Response.json({ error: "Error al obtener grupos" }, { status: 500 });
    }
  },
};