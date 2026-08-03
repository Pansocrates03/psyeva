import sql from "../../db";

// PATCH /api/admin/evaluaciones/:id/estado
// Alterna acepta_respuestas o reportes_publicados de una evaluación.
//
// Body: { campo: "aceptaRespuestas" | "reportesPublicados", valor?: boolean }
// Si no se manda "valor", hace toggle del estado actual.
//
// Ejemplos:
//   { campo: "aceptaRespuestas" }             → toggle
//   { campo: "aceptaRespuestas", valor: true } → fuerza true
//   { campo: "reportesPublicados", valor: false } → fuerza false
export const evaluacionEstadoRoutes = {

  async PATCH(req: Request) {
    try {
      const partes = new URL(req.url).pathname.split("/");
      // /api/admin/evaluaciones/:id/estado → id en índice -2
      const id = partes.at(-2)!;

      const body = await req.json();
      const { campo, valor } = body;

      const camposPermitidos = ["aceptaRespuestas", "reportesPublicados"];
      if (!campo || !camposPermitidos.includes(campo)) {
        return Response.json(
          { error: `campo debe ser uno de: ${camposPermitidos.join(", ")}` },
          { status: 400 }
        );
      }

      // Obtiene estado actual
      const [evaluacion] = await sql`
        SELECT id, acepta_respuestas, reportes_publicados
        FROM evaluacion
        WHERE id = ${id}
      `;

      if (!evaluacion) {
        return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }

      // Resuelve el nuevo valor: usa el enviado o hace toggle
      const estadoActual  = campo === "aceptaRespuestas"
        ? evaluacion.aceptaRespuestas
        : evaluacion.reportesPublicados;
      const nuevoEstado   = typeof valor === "boolean" ? valor : !estadoActual;

      // Validación de negocio: no se pueden publicar reportes
      // si la evaluación todavía acepta respuestas
      if (campo === "reportesPublicados" && nuevoEstado === true
          && evaluacion.aceptaRespuestas === true) {
        return Response.json(
          {
            error: "Cierra la evaluación antes de publicar los reportes",
            sugerencia: "Desactiva acepta_respuestas primero",
          },
          { status: 409 }
        );
      }

      const [actualizado] = await sql`
        UPDATE evaluacion
        SET
          acepta_respuestas   = CASE
            WHEN ${campo} = 'aceptaRespuestas'
            THEN ${nuevoEstado}
            ELSE acepta_respuestas
          END,
          reportes_publicados = CASE
            WHEN ${campo} = 'reportesPublicados'
            THEN ${nuevoEstado}
            ELSE reportes_publicados
          END
        WHERE id = ${id}
        RETURNING id, nombre, acepta_respuestas, reportes_publicados
      `;

      const mensajes: Record<string, Record<string, string>> = {
        aceptaRespuestas: {
          true:  "Evaluación abierta — los alumnos ya pueden responder",
          false: "Evaluación cerrada — los alumnos ya no pueden responder",
        },
        reportesPublicados: {
          true:  "Reportes publicados — el facilitador ya puede descargarlos",
          false: "Reportes despublicados",
        },
      };

      return Response.json({
        data:    actualizado,
        mensaje: mensajes[campo][String(nuevoEstado)],
      });
    } catch (err) {
      console.error("[PATCH /api/admin/evaluaciones/:id/estado]", err);
      return Response.json({ error: "Error al cambiar estado de la evaluación" }, { status: 500 });
    }
  },
};