import sql from "../../db";

// PATCH /api/admin/evaluaciones/:id/estado
// Body: { estado: "cerrado" | "abierto" | "publico" }
export const evaluacionEstadoRoutes = {
  async PATCH(req: Request) {
    try {
      const id = new URL(req.url).pathname.split("/").at(-2)!;
      const body = await req.json();
      const estados = ["cerrado", "abierto", "publico"] as const;
      if (!estados.includes(body.estado)) {
        return Response.json({ error: "estado debe ser cerrado, abierto o publico" }, { status: 400 });
      }

      const [actualizado] = await sql`
        UPDATE evaluacion
        SET estado = ${body.estado}::estado_evaluacion
        WHERE id = ${id}
        RETURNING id, nombre, estado
      `;
      if (!actualizado) return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });

      const mensajes = {
        cerrado: "Evaluación cerrada — no acepta respuestas ni muestra reportes",
        abierto: "Evaluación abierta — los alumnos ya pueden responder",
        publico: "Evaluación pública — el facilitador puede consultar los reportes",
      };
      return Response.json({ data: actualizado, mensaje: mensajes[body.estado as keyof typeof mensajes] });
    } catch (err) {
      console.error("[PATCH /api/admin/evaluaciones/:id/estado]", err);
      return Response.json({ error: "Error al cambiar estado de la evaluación" }, { status: 500 });
    }
  },
};
