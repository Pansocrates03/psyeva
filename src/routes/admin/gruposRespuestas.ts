import sql from "../../db";

// GET /api/admin/grupos/:id/respuestas
// Devuelve, para los formularios asignados a un grupo, el catálogo de
// preguntas y la respuesta (o null si no ha respondido) de cada estudiante
// a cada una. Pensado para armar una tabla dinámica en el frontend.
export const gruposRespuestasRoutes = {

  async GET(req: Request) {
    try {
      const grupoId = new URL(req.url).pathname.split("/").at(-2)!;

      const [grupo] = await sql`
        SELECT id, evaluacion_id, form_emociones_id, form_bienpsic_id, form_aprendizaje_id
        FROM grupo WHERE id = ${grupoId}
      `;
      if (!grupo) {
        return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
      }

      const formularioIds = [grupo.formEmocionesId, grupo.formBienpsicId, grupo.formAprendizajeId]
        .filter((id): id is string => Boolean(id));

      const preguntas = formularioIds.length === 0 ? [] : await sql`
        SELECT p.id, p.texto, p.formulario_id, f.titulo AS formulario_titulo, f.categoria
        FROM pregunta p
        JOIN formulario f ON f.id = p.formulario_id
        WHERE p.formulario_id IN ${sql(formularioIds)}
        ORDER BY f.categoria, p.id
      `;

      const estudiantes = await sql`
        SELECT id, nombre_completo, curp
        FROM estudiante
        WHERE grupo_id = ${grupoId}
        ORDER BY nombre_completo
      `;

      const filas = (estudiantes.length === 0 || formularioIds.length === 0) ? [] : await sql`
        SELECT
          e.id AS estudiante_id,
          p.id AS pregunta_id,
          r.texto_libre
        FROM estudiante e
        CROSS JOIN pregunta p
        LEFT JOIN sesion    s ON s.estudiante_id = e.id
                              AND s.formulario_id = p.formulario_id
                              AND s.evaluacion_id = ${grupo.evaluacionId}
        LEFT JOIN respuesta r ON r.sesion_id = s.id AND r.pregunta_id = p.id
        WHERE e.grupo_id = ${grupoId}
          AND p.formulario_id IN ${sql(formularioIds.length > 0 ? formularioIds : ["00000000-0000-0000-0000-000000000000"])}
      `;

      const respuestasPorEstudiante = new Map<string, Record<string, string | null>>();
      for (const fila of filas) {
        const mapa = respuestasPorEstudiante.get(fila.estudianteId) ?? {};
        mapa[fila.preguntaId] = fila.textoLibre;
        respuestasPorEstudiante.set(fila.estudianteId, mapa);
      }

      const data = {
        preguntas,
        estudiantes: estudiantes.map(e => ({
          estudianteId: e.id,
          nombreCompleto: e.nombreCompleto,
          curp: e.curp,
          respuestas: respuestasPorEstudiante.get(e.id) ?? {},
        })),
      };

      return Response.json({ data });
    } catch (err) {
      console.error("[GET /api/admin/grupos/:id/respuestas]", err);
      return Response.json({ error: "Error al obtener las respuestas del grupo" }, { status: 500 });
    }
  },
};
