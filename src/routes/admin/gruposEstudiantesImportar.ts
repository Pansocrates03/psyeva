import sql from "../../db";

// POST /api/admin/grupos/:id/estudiantes/importar
// Carga masiva de alumnos desde un .xlsx (ver GET /api/admin/plantillas/estudiantes
// para el formato esperado: columnas "Nombre completo" y "CURP", datos desde la fila 2).
//
// Body: multipart/form-data con { archivo: File }
//
// No es todo-o-nada: cada fila se inserta por separado para que un CURP
// duplicado u otro error en una fila no tumbe la carga completa.
export const gruposEstudiantesImportarRoutes = {

  async POST(req: Request) {
    try {
      const grupoId = new URL(req.url).pathname.split("/").at(-3)!;

      const [grupo] = await sql`SELECT id FROM grupo WHERE id = ${grupoId}`;
      if (!grupo) {
        return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
      }

      const form = await req.formData();
      const archivo = form.get("archivo") as File | null;
      if (!archivo) {
        return Response.json({ error: "archivo es requerido" }, { status: 400 });
      }

      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.default.Workbook();
      await wb.xlsx.load(await archivo.arrayBuffer());
      const ws = wb.worksheets[0];

      if (!ws) {
        return Response.json({ error: "El archivo no tiene hojas" }, { status: 400 });
      }

      // Detecta las columnas por el texto del encabezado (fila 1), no por
      // posición fija — más tolerante a que reordenen las columnas.
      let colNombre = 1;
      let colCurp = 2;
      ws.getRow(1).eachCell((cell, colNumber) => {
        const texto = String(cell.value ?? "").toLowerCase();
        if (texto.includes("nombre")) colNombre = colNumber;
        else if (texto.includes("curp")) colCurp = colNumber;
      });

      const creados: unknown[] = [];
      const errores: Array<{ fila: number; motivo: string }> = [];

      for (let fila = 2; fila <= ws.rowCount; fila++) {
        const row = ws.getRow(fila);
        const nombreCompleto = String(row.getCell(colNombre).value ?? "").trim();
        const curp = String(row.getCell(colCurp).value ?? "").trim();

        if (!nombreCompleto) continue; // fila vacía, se ignora sin marcar error

        try {
          const [nuevo] = await sql`
            INSERT INTO estudiante (grupo_id, nombre_completo, curp)
            VALUES (${grupoId}, ${nombreCompleto}, ${curp || null})
            RETURNING *
          `;
          creados.push(nuevo);
        } catch (err: any) {
          if (err?.code === "23505") {
            errores.push({ fila, motivo: `CURP duplicado: ${curp}` });
          } else {
            errores.push({ fila, motivo: "No se pudo guardar esta fila" });
          }
        }
      }

      return Response.json({ data: { creados: creados.length, estudiantes: creados, errores } }, { status: 201 });
    } catch (err) {
      console.error("[POST /api/admin/grupos/:id/estudiantes/importar]", err);
      return Response.json({ error: "Error al importar el archivo" }, { status: 500 });
    }
  },
};
