import sql from "../../db";

// POST /api/admin/grupos/:id/estudiantes  → agrega un estudiante a un grupo existente
// Body: { nombreCompleto, curp? }
export const gruposEstudiantesRoutes = {

  async POST(req: Request) {
    try {
      const grupoId = new URL(req.url).pathname.split("/").at(-2)!;
      const body = await req.json();
      const { nombreCompleto, curp } = body;

      if (!nombreCompleto?.trim()) {
        return Response.json({ error: "nombreCompleto es requerido" }, { status: 400 });
      }

      const [grupo] = await sql`SELECT id FROM grupo WHERE id = ${grupoId}`;
      if (!grupo) {
        return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
      }

      const [nuevo] = await sql`
        INSERT INTO estudiante (grupo_id, nombre_completo, curp)
        VALUES (${grupoId}, ${nombreCompleto.trim()}, ${curp?.trim() || null})
        RETURNING *
      `;

      return Response.json({ data: nuevo }, { status: 201 });
    } catch (err) {
      console.error("[POST /api/admin/grupos/:id/estudiantes]", err);
      return Response.json({ error: "Error al agregar el estudiante" }, { status: 500 });
    }
  },
};
