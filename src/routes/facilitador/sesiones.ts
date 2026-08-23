import sql from "../../db";
import { resolveUrl } from "../../services/storageService";

// p.imagen_url / sec.instruccion_imagen_url guardan el key del bucket, no
// una URL — se firman recién acá, al leer (mismo tratamiento en GET y en
// POST/iniciar, que devuelven el mismo shape de preguntas). `preguntas` es
// el resultado crudo de `sql` (RowList) — igual que el resto de las rutas
// de este proyecto, sus columnas no están tipadas estáticamente.
async function firmarImagenesPreguntas(preguntas: any[]): Promise<any[]> {
  return Promise.all(
    preguntas.map(async p => {
      p.imagenUrl = await resolveUrl(p.imagenUrl);
      p.instruccionImagenUrl = await resolveUrl(p.instruccionImagenUrl);
      return p;
    })
  );
}

// Maneja el flujo completo de la encuesta usando las functions de PostgreSQL:
//
// POST /api/facilitador/sesiones
//   → Inicia sesión via iniciar_sesion()
//   → Body: { estudianteId, formularioId, evaluacionId }
//
// GET  /api/facilitador/sesiones?sesionId=uuid
//   → Estado de la sesión con preguntas y respuestas guardadas
//
// POST /api/facilitador/sesiones/respuesta
//   → Guarda respuesta via guardar_respuesta()
//   → Body: { sesionId, preguntaId, textoLibre }
//
// PATCH /api/facilitador/sesiones/completar
//   → Completa sesión via completar_sesion()
//   → Body: { sesionId }

export const sesionesRoutes = {

  async GET(req: Request) {
    try {
      const url      = new URL(req.url);
      const sesionId = url.searchParams.get("sesionId");

      if (!sesionId) {
        return Response.json(
          { error: "sesionId es requerido como query param" },
          { status: 400 }
        );
      }

      const [sesion] = await sql`
        SELECT
          s.id,
          s.estado,
          s.iniciada_at,
          s.completada_at,
          e.id              AS estudiante_id,
          e.nombre_completo AS estudiante_nombre,
          f.id              AS formulario_id,
          f.titulo          AS formulario_titulo,
          f.categoria
        FROM sesion s
        JOIN estudiante  e ON e.id = s.estudiante_id
        JOIN formulario  f ON f.id = s.formulario_id
        WHERE s.id = ${sesionId}
      `;

      if (!sesion) {
        return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
      }

      // Preguntas con respuestas ya guardadas (null si aún no respondió).
      // Trae aplanados instrucción + opciones de la sección de cada
      // pregunta, para que el frontend no necesite una segunda consulta.
      const preguntas = await sql`
        SELECT
          p.id,
          p.texto,
          p.imagen_url,
          sec.id                     AS seccion_id,
          sec.instruccion_texto,
          sec.instruccion_imagen_url,
          sec.opciones_respuesta,
          r.texto_libre,
          r.respondida_at
        FROM pregunta p
        JOIN seccion sec      ON sec.id = p.seccion_id
        LEFT JOIN respuesta r ON r.pregunta_id = p.id
                              AND r.sesion_id  = ${sesionId}
        WHERE sec.formulario_id = ${sesion.formularioId}
        ORDER BY sec.orden, p.orden
      `;

      return Response.json({ data: { sesion, preguntas: await firmarImagenesPreguntas(preguntas) } });
    } catch (err) {
      console.error("[GET /api/facilitador/sesiones]", err);
      return Response.json({ error: "Error al obtener la sesión" }, { status: 500 });
    }
  },

  async POST(req: Request) {
    try {
      const url  = new URL(req.url);
      const path = url.pathname;

      // ── POST /api/facilitador/sesiones/respuesta ───────────
      if (path.endsWith("/respuesta")) {
        const body = await req.json();
        const { sesionId, preguntaId, textoLibre } = body;

        if (!sesionId || !preguntaId || !textoLibre) {
          return Response.json(
            { error: "sesionId, preguntaId y textoLibre son requeridos" },
            { status: 400 }
          );
        }

        // Usa la function de PostgreSQL — atómico y seguro para concurrencia
        const [result] = await sql`
          SELECT * FROM guardar_respuesta(
            ${sesionId}::uuid,
            ${preguntaId}::uuid,
            ${textoLibre}
          )
        `;

        return Response.json({ data: result }, { status: 201 });
      }

      // ── POST /api/facilitador/sesiones (iniciar) ───────────
      const body = await req.json();
      const { estudianteId, formularioId, evaluacionId } = body;

      if (!estudianteId || !formularioId || !evaluacionId) {
        return Response.json(
          { error: "estudianteId, formularioId y evaluacionId son requeridos" },
          { status: 400 }
        );
      }

      // Usa la function de PostgreSQL — maneja race conditions de 500 alumnos
      let sesionResult: { sesionId: string; estado: string; esNueva: boolean };
      try {
        const [row] = await sql`
          SELECT * FROM iniciar_sesion(
            ${estudianteId}::uuid,
            ${formularioId}::uuid,
            ${evaluacionId}::uuid
          )
        `;
        sesionResult = row;
      } catch (fnErr: any) {
        // Errores de negocio lanzados por la function
        const msg = fnErr.message ?? "";
        if (msg.includes("evaluacion_no_encontrada")) {
          return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
        }
        if (msg.includes("evaluacion_cerrada")) {
          return Response.json({ error: "La evaluación no está aceptando respuestas" }, { status: 403 });
        }
        if (msg.includes("sesion_ya_completada")) {
          return Response.json({ error: "Este alumno ya completó este formulario" }, { status: 409 });
        }
        throw fnErr;
      }

      // Preguntas del formulario, con instrucción + opciones de su
      // sección aplanadas (mismo shape que el GET de arriba).
      const preguntas = await sql`
        SELECT
          p.id,
          p.texto,
          p.imagen_url,
          sec.id                     AS seccion_id,
          sec.instruccion_texto,
          sec.instruccion_imagen_url,
          sec.opciones_respuesta,
          r.texto_libre,
          r.respondida_at
        FROM pregunta p
        JOIN seccion sec      ON sec.id = p.seccion_id
        LEFT JOIN respuesta r ON r.pregunta_id = p.id
                              AND r.sesion_id  = ${sesionResult.sesionId}
        WHERE sec.formulario_id = ${formularioId}
        ORDER BY sec.orden, p.orden
      `;

      const status = sesionResult.esNueva ? 201 : 200;
      return Response.json(
        { data: { sesion: sesionResult, preguntas: await firmarImagenesPreguntas(preguntas) } },
        { status }
      );
    } catch (err) {
      console.error("[POST /api/facilitador/sesiones]", err);
      return Response.json({ error: "Error al procesar la sesión" }, { status: 500 });
    }
  },

  async PATCH(req: Request) {
    try {
      const body = await req.json();
      const { sesionId } = body;

      if (!sesionId) {
        return Response.json(
          { error: "sesionId es requerido" },
          { status: 400 }
        );
      }

      // Usa la function de PostgreSQL — valida preguntas y completa atómicamente
      let result: { completada: boolean; total: number; respondidas: number };
      try {
        const [row] = await sql`
          SELECT * FROM completar_sesion(${sesionId}::uuid)
        `;
        result = row;
      } catch (fnErr: any) {
        const msg = fnErr.message ?? "";
        if (msg.includes("sesion_no_disponible")) {
          return Response.json(
            { error: "La sesión no existe o ya está completada" },
            { status: 409 }
          );
        }
        throw fnErr;
      }

      if (!result.completada) {
        return Response.json(
          {
            error:       `Faltan ${result.total - result.respondidas} preguntas por responder`,
            total:       result.total,
            respondidas: result.respondidas,
          },
          { status: 409 }
        );
      }

      return Response.json({
        data:    { sesionId, completada: true },
        mensaje: "Evaluación completada correctamente",
      });
    } catch (err) {
      console.error("[PATCH /api/facilitador/sesiones]", err);
      return Response.json({ error: "Error al completar la sesión" }, { status: 500 });
    }
  },
};