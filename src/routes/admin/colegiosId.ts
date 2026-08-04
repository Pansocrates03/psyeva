import sql from "../../db";

// PATCH /api/admin/colegios/:id  → edita nombre y/o clave de acceso
export const colegiosIdRoutes = {

  async PATCH(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-1)!;
      const body = await req.json();
      const { nombre, claveAcceso } = body;

      if (!nombre && !claveAcceso) {
        return Response.json(
          { error: "Debes enviar al menos un campo a actualizar" },
          { status: 400 }
        );
      }

      if (claveAcceso) {
        const [existente] = await sql`
          SELECT id FROM colegio
          WHERE UPPER(clave_acceso) = UPPER(${claveAcceso.trim()}) AND id != ${id}
        `;
        if (existente) {
          return Response.json(
            { error: "Ya existe un colegio con esa clave de acceso" },
            { status: 409 }
          );
        }
      }

      const [actualizado] = await sql`
        UPDATE colegio
        SET
          nombre       = COALESCE(${nombre       ?? null}, nombre),
          clave_acceso = COALESCE(${claveAcceso ? claveAcceso.trim() : null}, clave_acceso)
        WHERE id = ${id}
        RETURNING *
      `;

      if (!actualizado) {
        return Response.json({ error: "Colegio no encontrado" }, { status: 404 });
      }

      return Response.json({ data: actualizado });
    } catch (err) {
      console.error("[PATCH /api/admin/colegios/:id]", err);
      return Response.json({ error: "Error al actualizar el colegio" }, { status: 500 });
    }
  },
};
