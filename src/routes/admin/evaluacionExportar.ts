import sql from "../../db";
import { CATEGORIAS, CATEGORIA_LABELS } from "../../utils/categorias";
import type { CategoriaFormulario } from "../../utils/types";

const CATEGORIA_COLORES: Record<CategoriaFormulario, string> = {
  emociones: "FF8D54FF",
  bienestar_psicologico: "FF7FD858",
  aprendizaje: "FF37B7FF",
};

// GET /api/admin/evaluaciones/:id/exportar
// Genera y devuelve un archivo Excel (.xlsx) con las respuestas
// del grupo seleccionado, separado por categoría.
//
// Query params:
//   ?grupoId=<id> (requerido)
//   &categoria=emociones|bienestar_psicologico|aprendizaje (opcional)
export const evaluacionExportarRoutes = {

  async GET(req: Request) {
    try {
      const url       = new URL(req.url);
      const partes    = url.pathname.split("/");
      // /api/admin/evaluaciones/:id/exportar → id en índice -2
      const id        = partes.at(-2)!;
      const grupoId   = url.searchParams.get("grupoId");
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

      if (!grupoId) {
        return Response.json({ error: "Se requiere seleccionar un grupo" }, { status: 400 });
      }

      const [grupo] = await sql`
        SELECT id, nombre
        FROM grupo
        WHERE id = ${grupoId} AND evaluacion_id = ${id}
      `;

      if (!grupo) {
        return Response.json({ error: "Grupo no encontrado en esta evaluación" }, { status: 404 });
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
          AND g.id = ${grupoId}
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
          r.texto_libre    AS respuesta,
          f.categoria
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
          AND g.id = ${grupoId}
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

      // Genera una hoja independiente para cada categoría.
      const ExcelJS = await import("exceljs");
      const wb      = new ExcelJS.default.Workbook();
      const estudiantes = new Map<string, string>();
      filas.forEach(fila => estudiantes.set(fila.estudianteId, fila.alumno));

      const categorias = categoria
        ? [categoria as CategoriaFormulario]
        : CATEGORIAS;

      categorias.forEach(categoriaHoja => {
        const preguntasCategoria = preguntas.filter(pregunta => pregunta.categoria === categoriaHoja);
        const ws = wb.addWorksheet(CATEGORIA_LABELS[categoriaHoja]);
        const encabezados = [
          "Estudiante",
          ...preguntasCategoria.map((pregunta, index) => `${index + 1}. ${pregunta.texto}`),
        ];
        ws.columns = encabezados.map((header, index) => ({
          header,
          key: index === 0 ? "estudiante" : `pregunta${index}`,
          width: index === 0 ? 30 : 44,
        }));

        ws.getRow(1).eachCell(cell => {
          cell.font      = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: CATEGORIA_COLORES[categoriaHoja] } };
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        });
        ws.getRow(1).height = 30;

        const respuestasPorEstudiante = new Map<string, Map<string, string>>();
        filas.forEach(fila => {
          if (!fila.preguntaId || fila.categoria !== categoriaHoja) return;
          const respuestas = respuestasPorEstudiante.get(fila.estudianteId) ?? new Map<string, string>();
          respuestas.set(fila.preguntaId, fila.respuesta ?? "");
          respuestasPorEstudiante.set(fila.estudianteId, respuestas);
        });

        estudiantes.forEach((nombre, estudianteId) => {
          const respuestas = respuestasPorEstudiante.get(estudianteId);
          ws.addRow([
            nombre,
            ...preguntasCategoria.map(pregunta => respuestas?.get(pregunta.id) ?? ""),
          ]);
        });

        ws.eachRow((row, idx) => {
          if (idx === 1) return;
          row.eachCell(cell => {
            cell.fill = {
              type: "pattern", pattern: "solid",
              fgColor: { argb: idx % 2 === 0 ? "FFF7F6F3" : "FFFFFFFF" },
            };
          });
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const nombreArchivo = `${evaluacion.colegioNombre}_${evaluacion.nombre}_${grupo.nombre}_respuestas.xlsx`
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