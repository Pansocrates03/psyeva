import sql from "../../db";
import { listDirectory } from "../../services/storageService";

function rutaCarpetaValida(ruta: string): boolean {
  return ruta === "" || ruta.split("/").every(segment =>
    segment.length > 0 && segment !== "." && segment !== ".." && !/[\\\u0000-\u001f\u007f]/.test(segment)
  );
}

export const facilitadorReportesStorageRoutes = {
  async GET(req: Request) {
    try {
      const url = new URL(req.url);
      const colegioId = req.headers.get("X-Colegio-Id");
      const evaluacionId = url.searchParams.get("evaluacionId");
      const folderPath = url.searchParams.get("folder") ?? "";

      if (!colegioId) {
        return Response.json({ error: "Header X-Colegio-Id requerido" }, { status: 401 });
      }
      if (!evaluacionId || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(evaluacionId)) {
        return Response.json({ error: "evaluacionId debe ser un UUID válido" }, { status: 400 });
      }
      if (!rutaCarpetaValida(folderPath)) {
        return Response.json({ error: "La carpeta solicitada no es válida" }, { status: 400 });
      }

      const [evaluacion] = await sql`
        SELECT id
        FROM evaluacion
        WHERE id = ${evaluacionId}::uuid
          AND colegio_id = ${colegioId}::uuid
          AND estado = 'publico'
      `;
      if (!evaluacion) {
        return Response.json({ error: "Evaluación no encontrada" }, { status: 404 });
      }

      const prefijo = `reportes/${evaluacionId}/${folderPath ? `${folderPath}/` : ""}`;
      return Response.json({ data: await listDirectory(prefijo) });
    } catch (err) {
      console.error("[GET /api/facilitador/reportes/archivos-storage]", err);
      return Response.json({ error: "Error al listar los archivos de reportes" }, { status: 500 });
    }
  },
};