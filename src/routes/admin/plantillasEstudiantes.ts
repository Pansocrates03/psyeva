// GET /api/admin/plantillas/estudiantes
// Genera un .xlsx de ejemplo con el formato que espera
// POST /api/admin/grupos/:id/estudiantes/importar.
export const plantillasEstudiantesRoutes = {

  async GET(_req: Request) {
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.default.Workbook();
      const ws = wb.addWorksheet("Alumnos");

      ws.columns = [
        { header: "Nombre completo", key: "nombreCompleto", width: 34 },
        { header: "CURP",            key: "curp",           width: 22 },
      ];

      ws.getRow(1).eachCell(cell => {
        cell.font      = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8D54FF" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      ws.getRow(1).height = 22;

      ws.addRow({ nombreCompleto: "Juan Pérez López", curp: "PELJ080101HDFRZN01" });
      ws.addRow({ nombreCompleto: "María García Ruiz", curp: "" });

      const buffer = await wb.xlsx.writeBuffer();

      return new Response(buffer, {
        headers: {
          "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="plantilla-estudiantes.xlsx"`,
        },
      });
    } catch (err) {
      console.error("[GET /api/admin/plantillas/estudiantes]", err);
      return Response.json({ error: "Error al generar la plantilla" }, { status: 500 });
    }
  },
};
