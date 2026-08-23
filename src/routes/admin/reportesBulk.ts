import sql from "../../db";
import { uploadFile } from "../../services/storageService";

interface EstudianteParaReporte {
  id: string;
  nombreCompleto: string;
  grupoId: string;
}

interface ResultadoBulk {
  archivo: string;
  estado: "asignado" | "sin_coincidencia" | "duplicado" | "invalido";
  estudianteId?: string;
  estudianteNombre?: string;
  porcentaje?: number;
  motivo?: string;
}

// Marcas diacríticas combinantes (acentos, tildes) que quedan sueltas tras
// normalizar a NFD — p. ej. "í".normalize("NFD") === "i" + (U+0301). Construido
// con String.fromCharCode en vez de un literal "\uXXXX-\uXXXX" a propósito:
// ese literal es fácil de mal-escapar (\\u en vez de \u) y el error queda mudo —
// el regex sigue siendo válido, solo deja de borrar acentos, y con eso rompe en
// silencio el matching de nombres del bulk upload (bug real que tenía este archivo).
const DIACRITICO_DESDE = 0x0300; // U+0300 COMBINING GRAVE ACCENT
const DIACRITICO_HASTA = 0x036f; // U+036F COMBINING LATIN SMALL LETTER X
const REGEX_DIACRITICOS = new RegExp(
  `[${String.fromCharCode(DIACRITICO_DESDE)}-${String.fromCharCode(DIACRITICO_HASTA)}]`,
  "g"
);

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(REGEX_DIACRITICOS, "")
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(texto: string): string[] {
  return normalizar(texto).split(/\s+/).filter(token => token.length > 1);
}

function distanciaLevenshtein(a: string, b: string): number {
  const filaInicial = Array.from({ length: b.length + 1 }, (_, index) => index);
  let anterior = filaInicial;

  for (let i = 1; i <= a.length; i++) {
    const actual: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      actual[j] = a[i - 1] === b[j - 1]
        ? (anterior[j - 1] ?? 0)
        : Math.min(anterior[j - 1] ?? 0, anterior[j] ?? 0, actual[j - 1] ?? 0) + 1;
    }
    anterior = actual;
  }

  return anterior[b.length] ?? 0;
}

function similitudNombre(nombre: string, archivo: string): number {
  const nombreNormalizado = normalizar(nombre);
  const archivoNormalizado = normalizar(archivo);

  if (archivoNormalizado.includes(nombreNormalizado)) return 1;

  const nombreTokens = tokens(nombre);
  const archivoTokens = new Set(tokens(archivo));
  const coincidencias = nombreTokens.filter(token => archivoTokens.has(token)).length;
  const coberturaTokens = nombreTokens.length === 0 ? 0 : coincidencias / nombreTokens.length;
  const distancia = distanciaLevenshtein(nombreNormalizado, archivoNormalizado);
  const similitudTexto = 1 - distancia / Math.max(nombreNormalizado.length, archivoNormalizado.length, 1);

  return coberturaTokens * 0.75 + Math.max(0, similitudTexto) * 0.25;
}

function nombreSeguro(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "") || "reporte.pdf";
}

export const reportesBulkRoutes = {
  async POST(req: Request) {
    try {
      const form = await req.formData();
      const evaluacionId = form.get("evaluacionId") as string | null;
      const archivos = form.getAll("archivos").filter((value): value is File => value instanceof File);

      if (!evaluacionId || archivos.length === 0) {
        return Response.json({ error: "evaluacionId y al menos un archivo son requeridos" }, { status: 400 });
      }

      if (archivos.length > 100) {
        return Response.json({ error: "No se pueden subir más de 100 archivos a la vez" }, { status: 400 });
      }

      const estudiantes = await sql<EstudianteParaReporte[]>`
        SELECT e.id, e.nombre_completo, e.grupo_id
        FROM estudiante e
        JOIN grupo g ON g.id = e.grupo_id
        WHERE g.evaluacion_id = ${evaluacionId}::uuid
        ORDER BY e.nombre_completo
      `;

      if (estudiantes.length === 0) {
        return Response.json({ error: "La evaluación no tiene alumnos registrados" }, { status: 404 });
      }

      const usados = new Set<string>();
      const resultados: ResultadoBulk[] = [];

      for (const archivo of archivos) {
        if (archivo.type !== "application/pdf" && !archivo.name.toLowerCase().endsWith(".pdf")) {
          resultados.push({ archivo: archivo.name, estado: "invalido", motivo: "Solo se permiten archivos PDF" });
          continue;
        }

        const candidatos = estudiantes
          .map(estudiante => ({ estudiante, score: similitudNombre(estudiante.nombreCompleto, archivo.name) }))
          .sort((a, b) => b.score - a.score);
        const mejor = candidatos[0];
        const segundo = candidatos[1];

        if (!mejor || mejor.score < 0.55) {
          resultados.push({ archivo: archivo.name, estado: "sin_coincidencia", porcentaje: Math.round((mejor?.score ?? 0) * 100), motivo: "No se encontró un alumno con coincidencia suficiente" });
          continue;
        }

        if (segundo && mejor.score - segundo.score < 0.08 && mejor.score < 1) {
          resultados.push({ archivo: archivo.name, estado: "sin_coincidencia", porcentaje: Math.round(mejor.score * 100), motivo: `Coincidencia ambigua entre ${mejor.estudiante.nombreCompleto} y ${segundo.estudiante.nombreCompleto}` });
          continue;
        }

        if (usados.has(mejor.estudiante.id)) {
          resultados.push({ archivo: archivo.name, estado: "duplicado", estudianteId: mejor.estudiante.id, estudianteNombre: mejor.estudiante.nombreCompleto, porcentaje: Math.round(mejor.score * 100), motivo: "Ya se asignó otro archivo a este alumno en esta carga" });
          continue;
        }

        const key = `reportes/evaluaciones/${evaluacionId}/estudiantes/${mejor.estudiante.id}/${Date.now()}_${nombreSeguro(archivo.name)}`;
        await uploadFile(key, await archivo.arrayBuffer(), "application/pdf");
        // Un reporte "individual" no lleva grupo_id — el constraint
        // reporte_individual_sin_grupo (db/schema.sql) lo exige NULL, el
        // grupo del alumno ya se puede derivar vía estudiante_id.
        // archivo_url guarda el key del bucket, no una URL (bucket
        // privado + URL firmada expira — no puede quedar grabada).
        await sql`
          INSERT INTO reporte (tipo, evaluacion_id, estudiante_id, archivo_url)
          VALUES ('individual', ${evaluacionId}::uuid, ${mejor.estudiante.id}::uuid, ${key})
        `;

        usados.add(mejor.estudiante.id);
        resultados.push({ archivo: archivo.name, estado: "asignado", estudianteId: mejor.estudiante.id, estudianteNombre: mejor.estudiante.nombreCompleto, porcentaje: Math.round(mejor.score * 100) });
      }

      return Response.json({ data: { resultados, asignados: resultados.filter(resultado => resultado.estado === "asignado").length } }, { status: 201 });
    } catch (err) {
      console.error("[POST /api/admin/reportes/bulk]", err);
      return Response.json({ error: "Error al subir los reportes" }, { status: 500 });
    }
  },
};
