import sql from "../../db";

// PATCH /api/admin/evaluaciones/:id/estado
// Alterna acepta_respuestas o reportes_publicados de una evaluación.
//
// Body: { campo: "cerrado" | "abierto" | "publico", valor?: boolean }
// Si no se manda "valor", hace toggle del estado actual.
//
// Ejemplos:
//   { campo: "abierto" }             → toggle acepta_respuestas
//   { campo: "abierto", valor: true } → fuerza evaluación abierta
//   { campo: "publico", valor: false } → oculta los reportes
export const evaluacionEstadoRoutes = {

  async PATCH(req: Request) {
    try {
      const partes = new URL(req.url).pathname.split("/");
      // /api/admin/evaluaciones/:id/estado → id en índice -2
      const id = partes.at(-2)!;

      const body = await req.json();
      const { campo, valor } = body;

      const camposPermitidos = ["cerrado", "abierto", "publico", "aceptaRespuestas", "reportesPublicados"];
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

      const esEstadoNuevo = ["cerrado", "abierto", "publico"].includes(campo);
      const campoPersistencia = campo === "cerrado" || campo === "abierto" || campo === "aceptaRespuestas"
        ? "aceptaRespuestas"
        : "reportesPublicados";

      let aceptaRespuestas = evaluacion.aceptaRespuestas;
      let reportesPublicados = evaluacion.reportesPublicados;

      if (esEstadoNuevo) {
        if (campo === "cerrado") {
          aceptaRespuestas = false;
          reportesPublicados = false;
        } else if (campo === "abierto") {
          aceptaRespuestas = true;
          reportesPublicados = false;
        } else {
          aceptaRespuestas = false;
          reportesPublicados = true;
        }
      } else {
        const estadoActual = campoPersistencia === "aceptaRespuestas"
          ? evaluacion.aceptaRespuestas
          : evaluacion.reportesPublicados;
        const nuevoEstado = typeof valor === "boolean" ? valor : !estadoActual;
        if (campoPersistencia === "aceptaRespuestas") aceptaRespuestas = nuevoEstado;
        else reportesPublicados = nuevoEstado;
      }

      // Validación de negocio: no se pueden publicar reportes
      // si la evaluación todavía acepta respuestas
      if (reportesPublicados && aceptaRespuestas) {
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
          acepta_respuestas   = ${aceptaRespuestas},
          reportes_publicados = ${reportesPublicados}
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
        mensaje: esEstadoNuevo
          ? `Evaluación ${campo}`
          : mensajes[campoPersistencia]?.[String(campoPersistencia === "aceptaRespuestas" ? aceptaRespuestas : reportesPublicados)] ?? "Estado actualizado",
      });
    } catch (err) {
      console.error("[PATCH /api/admin/evaluaciones/:id/estado]", err);
      return Response.json({ error: "Error al cambiar estado de la evaluación" }, { status: 500 });
    }
  },
};