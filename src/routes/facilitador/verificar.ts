import sql from "../../db";

// POST /api/facilitador/verificar
// Valida la clave_acceso del colegio y devuelve el colegio
// con sus evaluaciones usando vista_progreso_evaluacion.
//
// Body: { claveAcceso: string }
//
// Response devuelve un token simple (base64 del colegioId)
// que el frontend incluye como header en requests posteriores:
//   X-Colegio-Id: <colegioId>
export const verificarRoutes = {

  async POST(req: Request) {
    try {
      const body = await req.json();
      const { claveAcceso } = body;

      if (!claveAcceso || typeof claveAcceso !== "string") {
        return Response.json(
          { error: "claveAcceso es requerida" },
          { status: 400 }
        );
      }

      // Busca el colegio por clave (case-insensitive)
      const [colegio] = await sql`
        SELECT id, nombre, created_at
        FROM colegio
        WHERE UPPER(clave_acceso) = UPPER(${claveAcceso.trim()})
      `;

      if (!colegio) {
        return Response.json(
          { error: "Código inválido. Verifica e intenta de nuevo." },
          { status: 401 }
        );
      }

      // Evaluaciones del colegio usando la view
      // Solo muestra las que aceptan respuestas o tienen reportes publicados
      const evaluaciones = await sql`
        SELECT
          evaluacion_id,
          nombre,
          fecha,
          acepta_respuestas,
          reportes_publicados,
          total_grupos,
          total_alumnos,
          sesiones_completadas,
          sesiones_pendientes
        FROM vista_progreso_evaluacion
        WHERE colegio_id = ${colegio.id}
          AND (acepta_respuestas = true OR reportes_publicados = true)
        ORDER BY fecha DESC
      `;

      // Token simple: base64 del colegioId
      // En producción reemplaza con JWT firmado
      const token = Buffer.from(colegio.id).toString("base64");

      return Response.json({
        data: {
          colegio: {
            id:     colegio.id,
            nombre: colegio.nombre,
          },
          evaluaciones,
          token,
        },
      });
    } catch (err) {
      console.error("[POST /api/facilitador/verificar]", err);
      return Response.json({ error: "Error al verificar el código" }, { status: 500 });
    }
  },
};