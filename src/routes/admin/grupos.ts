import sql from "../../db";

// POST /api/admin/grupos  → crea un grupo dentro de una evaluación,
// opcionalmente con su primera tanda de estudiantes (todo en una transacción).
//
// Body: {
//   evaluacionId, nombre,
//   formEmocionesId?, formBienpsicId?, formAprendizajeId?,
//   estudiantes?: [{ nombreCompleto, curp? }]
// }
export const gruposRoutes = {

  async POST(req: Request) {
    try {
      const body = await req.json();
      const {
        evaluacionId, nombre,
        formEmocionesId, formBienpsicId, formAprendizajeId,
        estudiantes,
      } = body;

      if (!evaluacionId || !nombre) {
        return Response.json({ error: "evaluacionId y nombre son requeridos" }, { status: 400 });
      }
      if (estudiantes !== undefined && !Array.isArray(estudiantes)) {
        return Response.json({ error: "estudiantes debe ser un array" }, { status: 400 });
      }

      const [evaluacion] = await sql`SELECT id FROM evaluacion WHERE id = ${evaluacionId}`;
      if (!evaluacion) {
        return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }

      const resultado = await sql.begin(async tx => {
        const [grupo] = await tx`
          INSERT INTO grupo (evaluacion_id, nombre, form_emociones_id, form_bienpsic_id, form_aprendizaje_id)
          VALUES (
            ${evaluacionId},
            ${nombre.trim()},
            ${formEmocionesId ?? null},
            ${formBienpsicId ?? null},
            ${formAprendizajeId ?? null}
          )
          RETURNING *
        `;

        const nuevosEstudiantes = [];
        for (const e of (estudiantes ?? [])) {
          if (!e.nombreCompleto?.trim()) continue;
          const [row] = await tx`
            INSERT INTO estudiante (grupo_id, nombre_completo, curp)
            VALUES (${grupo.id}, ${e.nombreCompleto.trim()}, ${e.curp?.trim() || null})
            RETURNING *
          `;
          nuevosEstudiantes.push(row);
        }

        return { ...grupo, estudiantes: nuevosEstudiantes };
      });

      return Response.json({ data: resultado }, { status: 201 });
    } catch (err) {
      console.error("[POST /api/admin/grupos]", err);
      return Response.json({ error: "Error al crear el grupo" }, { status: 500 });
    }
  },
};
