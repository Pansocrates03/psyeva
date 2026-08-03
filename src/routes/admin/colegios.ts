import sql from "../../db";

// GET  /api/admin/colegios  → lista todos los colegios con su total de evaluaciones
// POST /api/admin/colegios  → crea un colegio nuevo
export const colegiosRoutes = {

  async GET(_req: Request) {
    try {
      const rows = await sql`
        SELECT
          c.id,
          c.nombre,
          c.clave_acceso,
          c.created_at,
          COUNT(ev.id) AS total_evaluaciones
        FROM colegio c
        LEFT JOIN evaluacion ev ON ev.colegio_id = c.id
        GROUP BY c.id
        ORDER BY c.nombre
      `;
      return Response.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/admin/colegios]", err);
      return Response.json({ error: "Error al obtener colegios" }, { status: 500 });
    }
  },

  async POST(req: Request) {
    try {
      const body = await req.json();
      const { nombre, claveAcceso } = body;

      if (!nombre || !claveAcceso) {
        return Response.json(
          { error: "nombre y claveAcceso son requeridos" },
          { status: 400 }
        );
      }

      const [existente] = await sql`
        SELECT id FROM colegio WHERE UPPER(clave_acceso) = UPPER(${claveAcceso.trim()})
      `;
      if (existente) {
        return Response.json(
          { error: "Ya existe un colegio con esa clave de acceso" },
          { status: 409 }
        );
      }

      const [nuevo] = await sql`
        INSERT INTO colegio (nombre, clave_acceso)
        VALUES (${nombre.trim()}, ${claveAcceso.trim()})
        RETURNING *
      `;

      return Response.json({ data: nuevo }, { status: 201 });
    } catch (err) {
      console.error("[POST /api/admin/colegios]", err);
      return Response.json({ error: "Error al crear el colegio" }, { status: 500 });
    }
  },
};
