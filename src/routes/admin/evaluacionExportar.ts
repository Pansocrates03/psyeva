import sql from "../../db";

// GET /api/admin/evaluaciones/:id/exportar
// Genera y devuelve un archivo Excel (.xlsx) con todas las
// respuestas de la evaluación, listo para descargar.
//
// Query param opcional:
//   ?categoria=emociones|bienestar_psicologico|aprendizaje
export const evaluacionExportarRoutes = {

  async GET(req: Request) {
    try {
      const url       = new URL(req.url);
      const partes    = url.pathname.split("/");
      // /api/admin/evaluaciones/:id/exportar → id en índice -2
      const id        = partes.at(-2)!;
      const categoria = url.searchParams.get("categoria") ?? null;

      // Verifica que la evaluación exista usando la view
      const [evaluacion] = await sql`
        SELECT evaluacion_id, nombre, colegio_nombre
        FROM vista_progreso_evaluacion
        WHERE evaluacion_id = ${id}
      `;

      if (!evaluacion) {
        return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }

      const preguntas = await sql`
        SELECT DISTINCT
          p.id,
          p.texto,
          f.categoria,
          sec.orden AS seccion_orden,
          p.orden AS pregunta_orden
        FROM grupo g
        JOIN evaluacion ev ON ev.id = g.evaluacion_id
        JOIN formulario f ON f.id IN (g.form_emociones_id, g.form_bienpsic_id, g.form_aprendizaje_id)
        JOIN seccion sec ON sec.formulario_id = f.id
        JOIN pregunta p ON p.seccion_id = sec.id
        WHERE ev.id = ${id}
          AND (
            ${categoria}::categoria_formulario IS NULL
            OR f.categoria = ${categoria}::categoria_formulario
          )
        ORDER BY f.categoria, sec.orden, p.orden
      `;

      const filas = await sql`
        SELECT
          e.id              AS estudiante_id,
          e.nombre_completo AS alumno,
          p.id              AS pregunta_id,
          r.texto_libre    AS respuesta
        FROM estudiante e
        JOIN grupo g ON g.id = e.grupo_id
        JOIN evaluacion ev ON ev.id = g.evaluacion_id
        LEFT JOIN sesion s
          ON s.estudiante_id = e.id
         AND s.evaluacion_id = ev.id
        LEFT JOIN respuesta r ON r.sesion_id = s.id
        LEFT JOIN pregunta p ON p.id = r.pregunta_id
        LEFT JOIN formulario f ON f.id = s.formulario_id
        WHERE ev.id = ${id}
          AND (
            ${categoria}::categoria_formulario IS NULL
            OR f.categoria = ${categoria}::categoria_formulario
            OR f.id IS NULL
          )
        ORDER BY g.nombre, e.nombre_completo
      `;

      const tieneRespuestas = filas.some(fila => fila.preguntaId && fila.respuesta !== null);
      if (preguntas.length === 0 || !tieneRespuestas) {
        return Response.json(
          { error: "No hay respuestas registradas para esta evaluación" },
          { status: 404 }
        );
      }

      // Genera el Excel con ExcelJS (bun add exceljs)
      const ExcelJS = await import("exceljs");
      const wb      = new ExcelJS.default.Workbook();
      const ws      = wb.addWorksheet("Respuestas");

      const encabezados = ["Estudiante", ...preguntas.map((pregunta, index) => `${index + 1}. ${pregunta.texto}`)];
      ws.columns = encabezados.map((header, index) => ({
        header,
        key: index === 0 ? "estudiante" : `pregunta${index}`,
        width: index === 0 ? 30 : 44,
      }));

      // Estilo de encabezado con color PSYEVA
      ws.getRow(1).eachCell(cell => {
        cell.font      = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8D54FF" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      ws.getRow(1).height = 22;

      const respuestasPorEstudiante = new Map<string, Map<string, string>>();
      filas.forEach(fila => {
        if (!fila.preguntaId) return;
        const respuestas = respuestasPorEstudiante.get(fila.estudianteId) ?? new Map<string, string>();
        respuestas.set(fila.preguntaId, fila.respuesta ?? "");
        respuestasPorEstudiante.set(fila.estudianteId, respuestas);
      });

      const estudiantes = new Map<string, string>();
      filas.forEach(fila => estudiantes.set(fila.estudianteId, fila.alumno));
      estudiantes.forEach((nombre, estudianteId) => {
        const respuestas = respuestasPorEstudiante.get(estudianteId);
        ws.addRow([
          nombre,
          ...preguntas.map(pregunta => respuestas?.get(pregunta.id) ?? ""),
        ]);
      });

      // Filas alternas con color suave
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        row.eachCell(cell => {
          cell.fill = {
            type: "pattern", pattern: "solid",
            fgColor: { argb: idx % 2 === 0 ? "FFF7F6F3" : "FFFFFFFF" },
          };
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const nombreArchivo = `${evaluacion.colegioNombre}_${evaluacion.nombre}_respuestas.xlsx`
        .replace(/\s+/g, "_")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      return new Response(buffer, {
        headers: {
          "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
        },
      });
    } catch (err) {
      console.error("[GET /api/admin/evaluaciones/:id/exportar]", err);
      return Response.json({ error: "Error al generar el Excel" }, { status: 500 });
    }
  },
};