import sql from "../../db";

// GET /api/facilitador/estudiantes/:grupoId
// Devuelve los estudiantes pendientes de un grupo.
// Usa vista_estado_alumno para mostrar el estado por categoría.
//
// Headers requeridos:
//   X-Colegio-Id: uuid
//
// Query param requerido:
//   ?evaluacionId=uuid
export const estudiantesRoutes = {

  async GET(req: Request) {
    try {
      const url          = new URL(req.url);
      const grupoId      = url.pathname.split("/").at(-1)!;
      const colegioId    = req.headers.get("X-Colegio-Id");
      const evaluacionId = url.searchParams.get("evaluacionId");

      if (!colegioId) {
        return Response.json(
          { error: "Header X-Colegio-Id requerido" },
          { status: 401 }
        );
      }

      if (!evaluacionId) {
        return Response.json(
          { error: "evaluacionId es requerido como query param" },
          { status: 400 }
        );
      }

      // Verifica que el grupo pertenezca al colegio del facilitador
      const [grupo] = await sql`
        SELECT g.id, g.nombre, g.evaluacion_id
        FROM grupo g
        JOIN evaluacion ev ON ev.id = g.evaluacion_id
        WHERE g.id         = ${grupoId}
          AND ev.colegio_id = ${colegioId}
          AND ev.id         = ${evaluacionId}
      `;

      if (!grupo) {
        return Response.json(
          { error: "Grupo no encontrado o no pertenece a tu colegio" },
          { status: 403 }
        );
      }

      // Todos los estudiantes con estado por categoría usando la view
      // El facilitador ve todos (completados y pendientes) para
      // saber quién ya terminó sin tener que buscarlos
      const estudiantes = await sql`
        SELECT *
        FROM vista_estado_alumno
        WHERE grupo_id      = ${grupoId}
          AND evaluacion_id = ${evaluacionId}
        ORDER BY nombre_completo
      `;

      return Response.json({
        data: {
          grupo: { id: grupo.id, nombre: grupo.nombre },
          estudiantes,
        },
      });
    } catch (err) {
      console.error("[GET /api/facilitador/estudiantes/:grupoId]", err);
      return Response.json({ error: "Error al obtener estudiantes" }, { status: 500 });
    }
  },
};