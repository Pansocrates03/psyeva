import sql from "../../db";

// GET  /api/admin/reportes  → lista reportes con filtros opcionales
// POST /api/admin/reportes  → sube un nuevo reporte (PDF)
//
// Query params GET:
//   ?evaluacionId=uuid
//   ?tipo=individual|grupal|general
//
// Nota: la visibilidad de reportes ya no es por reporte individual
// sino por evaluacion.reportes_publicados. Este endpoint
// solo lo usa el administrador para gestionar los PDFs.
export const reportesRoutes = {

  async GET(req: Request) {
    try {
      const url         = new URL(req.url);
      const evaluacionId = url.searchParams.get("evaluacionId") ?? null;
      const tipo         = url.searchParams.get("tipo")         ?? null;

      const rows = await sql`
        SELECT
          r.id,
          r.tipo,
          r.archivo_url,
          r.created_at,
          ev.id     AS evaluacion_id,
          ev.nombre AS evaluacion_nombre,
          ev.acepta_respuestas,
          ev.reportes_publicados,
          c.nombre  AS colegio_nombre,
          g.id      AS grupo_id,
          g.nombre  AS grupo_nombre,
          e.id               AS estudiante_id,
          e.nombre_completo  AS estudiante_nombre
        FROM reporte r
        JOIN evaluacion ev ON ev.id = r.evaluacion_id
        JOIN colegio    c  ON c.id  = ev.colegio_id
        LEFT JOIN grupo      g ON g.id = r.grupo_id
        LEFT JOIN estudiante e ON e.id = r.estudiante_id
        WHERE
          (${evaluacionId}::uuid IS NULL OR r.evaluacion_id = ${evaluacionId}::uuid)
          AND (${tipo}::text     IS NULL OR r.tipo          = ${tipo}::tipo_reporte)
        ORDER BY r.created_at DESC
      `;

      return Response.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/admin/reportes]", err);
      return Response.json({ error: "Error al obtener reportes" }, { status: 500 });
    }
  },

  async POST(req: Request) {
    try {
      // Espera multipart/form-data con:
      //   - archivo:      File (PDF)
      //   - tipo:         individual | grupal | general
      //   - evaluacionId: uuid
      //   - grupoId:      uuid (solo si tipo=grupal)
      //   - estudianteId: uuid (solo si tipo=individual)
      const form         = await req.formData();
      const archivo      = form.get("archivo")      as File   | null;
      const tipo         = form.get("tipo")         as string | null;
      const evaluacionId = form.get("evaluacionId") as string | null;
      const grupoId      = form.get("grupoId")      as string | null;
      const estudianteId = form.get("estudianteId") as string | null;

      // Validaciones
      if (!archivo || !tipo || !evaluacionId) {
        return Response.json(
          { error: "archivo, tipo y evaluacionId son requeridos" },
          { status: 400 }
        );
      }

      const tiposValidos = ["individual", "grupal", "general"];
      if (!tiposValidos.includes(tipo)) {
        return Response.json(
          { error: `tipo debe ser uno de: ${tiposValidos.join(", ")}` },
          { status: 400 }
        );
      }

      if (tipo === "grupal" && !grupoId) {
        return Response.json(
          { error: "grupoId es requerido para reportes grupales" },
          { status: 400 }
        );
      }

      if (tipo === "individual" && !estudianteId) {
        return Response.json(
          { error: "estudianteId es requerido para reportes individuales" },
          { status: 400 }
        );
      }

      if (archivo.type !== "application/pdf") {
        return Response.json(
          { error: "Solo se permiten archivos PDF" },
          { status: 400 }
        );
      }

      // Verifica que la evaluación exista
      const [evaluacion] = await sql`
        SELECT id FROM evaluacion WHERE id = ${evaluacionId}
      `;
      if (!evaluacion) {
        return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }

      // Guarda el archivo en disco
      // En producción reemplaza con S3, R2, etc.
      const uploadsDir = process.env.UPLOADS_DIR ?? "./uploads";
      const timestamp  = Date.now();
      const filename   = `${tipo}_${timestamp}_${archivo.name.replace(/\s+/g, "_")}`;
      const filepath   = `${uploadsDir}/${filename}`;

      await Bun.write(filepath, await archivo.arrayBuffer());
      const archivoUrl = `/uploads/${filename}`;

      // Inserta en BD — sin campo publicado
      const [nuevo] = await sql`
        INSERT INTO reporte (tipo, evaluacion_id, grupo_id, estudiante_id, archivo_url)
        VALUES (
          ${tipo}::tipo_reporte,
          ${evaluacionId}::uuid,
          ${grupoId      ?? null}::uuid,
          ${estudianteId ?? null}::uuid,
          ${archivoUrl}
        )
        RETURNING *
      `;

      return Response.json({ data: nuevo }, { status: 201 });
    } catch (err) {
      console.error("[POST /api/admin/reportes]", err);
      return Response.json({ error: "Error al subir el reporte" }, { status: 500 });
    }
  },
};