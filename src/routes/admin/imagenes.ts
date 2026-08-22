import { listFiles } from "../../services/storageService";

// GET /api/admin/imagenes?carpeta=assets/form_emociones/preguntas
// Lista las imágenes predefinidas disponibles en el bucket para que el
// admin las elija como imagen de una pregunta o instrucción de sección,
// en vez de subir/pegar una URL a mano.
//
// `carpeta` está restringida a un allowlist a propósito: es la única
// forma de que este endpoint no termine listando archivos que no debería
// (p. ej. los PDFs de reportes, que viven bajo "reportes/" en el mismo
// bucket). Agregar un set nuevo de imágenes = agregar su prefijo acá.
const CARPETAS_PERMITIDAS = new Set([
  "assets/instrucciones",
  "assets/preguntas",
]);

export const imagenesRoutes = {

  async GET(req: Request) {
    try {
      const carpeta = new URL(req.url).searchParams.get("carpeta") ?? "";

      if (!CARPETAS_PERMITIDAS.has(carpeta)) {
        return Response.json(
          { error: `carpeta debe ser una de: ${[...CARPETAS_PERMITIDAS].join(", ")}` },
          { status: 400 }
        );
      }

      const archivos = await listFiles(`${carpeta}/`);
      return Response.json({ data: archivos });
    } catch (err) {
      console.error("[GET /api/admin/imagenes]", err);
      return Response.json({ error: "Error al listar imágenes" }, { status: 500 });
    }
  },
};
