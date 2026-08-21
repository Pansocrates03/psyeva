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

      // Query de exportación completa
      const filas = await sql`
        SELECT
          c.nombre          AS colegio,
          ev.nombre         AS evaluacion,
          ev.fecha,
          g.nombre          AS grupo,
          e.nombre_completo AS alumno,
          e.curp,
          f.titulo          AS formulario,
          f.categoria,
          p.texto           AS pregunta,
          r.texto_libre     AS respuesta,
          r.respondida_at
        FROM respuesta r
        JOIN sesion     s   ON s.id   = r.sesion_id
        JOIN estudiante e   ON e.id   = s.estudiante_id
        JOIN grupo      g   ON g.id   = e.grupo_id
        JOIN evaluacion ev  ON ev.id  = s.evaluacion_id
        JOIN colegio    c   ON c.id   = ev.colegio_id
        JOIN pregunta   p   ON p.id   = r.pregunta_id
        JOIN seccion    sec ON sec.id = p.seccion_id
        JOIN formulario f   ON f.id   = s.formulario_id
        WHERE s.evaluacion_id = ${id}
          AND (
            ${categoria}::categoria_formulario IS NULL
            OR f.categoria = ${categoria}::categoria_formulario
          )
        ORDER BY g.nombre, e.nombre_completo, f.categoria, sec.orden, p.orden
      `;

      if (filas.length === 0) {
        return Response.json(
          { error: "No hay respuestas registradas para esta evaluación" },
          { status: 404 }
        );
      }

      // Genera el Excel con ExcelJS (bun add exceljs)
      const ExcelJS = await import("exceljs");
      const wb      = new ExcelJS.default.Workbook();
      const ws      = wb.addWorksheet("Respuestas");

      ws.columns = [
        { header: "Colegio",       key: "colegio",       width: 28 },
        { header: "Evaluación",    key: "evaluacion",    width: 24 },
        { header: "Fecha",         key: "fecha",         width: 14 },
        { header: "Grupo",         key: "grupo",         width: 12 },
        { header: "Alumno",        key: "alumno",        width: 30 },
        { header: "CURP",          key: "curp",          width: 20 },
        { header: "Formulario",    key: "formulario",    width: 28 },
        { header: "Categoría",     key: "categoria",     width: 22 },
        { header: "Pregunta",      key: "pregunta",      width: 50 },
        { header: "Respuesta",     key: "respuesta",     width: 20 },
        { header: "Respondida en", key: "respondidaAt",  width: 22 },
      ];

      // Estilo de encabezado con color PSYEVA
      ws.getRow(1).eachCell(cell => {
        cell.font      = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8D54FF" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      ws.getRow(1).height = 22;

      filas.forEach(f => {
        ws.addRow({
          colegio:      f.colegio,
          evaluacion:   f.evaluacion,
          fecha:        f.fecha,
          grupo:        f.grupo,
          alumno:       f.alumno,
          curp:         f.curp ?? "",
          formulario:   f.formulario,
          categoria:    f.categoria,
          pregunta:     f.pregunta,
          respuesta:    f.respuesta,
          respondidaAt: f.respondidaAt,
        });
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