import { deleteFile, getObjectUrl, listFiles, uploadFile } from "../../services/storageService";

// GET    /api/admin/imagenes?carpeta=assets/preguntas_emociones
//   → lista las imágenes del catálogo (usado por SelectorImagen.tsx)
// POST   /api/admin/imagenes
//   → sube una imagen nueva al catálogo — FormData: { carpeta, archivo }
//   → usado por la sección "Imágenes de formularios" en Configuración
// DELETE /api/admin/imagenes?carpeta=assets/preguntas_emociones&key=assets/preguntas_emociones/123_foo.png
//   → borra una imagen del catálogo
//
// `carpeta` está restringida a un allowlist a propósito: es la única
// forma de que este endpoint no termine listando/tocando archivos que no
// debería (p. ej. los PDFs de reportes, que viven bajo "reportes/" en el
// mismo bucket). Una carpeta de "preguntas" por categoría (en vez de una
// sola compartida) para que el selector de un formulario de Emociones no
// muestre imágenes de Aprendizaje, etc. — "instrucciones" en cambio es
// una sola carpeta global, misma idea en ambos lados: ver
// CARPETA_INSTRUCCIONES / CARPETA_PREGUNTAS_POR_CATEGORIA en
// src/utils/categorias.ts (ese archivo es la fuente de verdad del lado
// del frontend; acá se repite literal porque las rutas de este proyecto
// no importan de src/utils/ — mantener ambos lados en sync a mano).
const CARPETAS_PERMITIDAS = new Set([
  "assets/instrucciones",
  "assets/preguntas_emociones",
  "assets/preguntas_aprendizaje",
  "assets/preguntas_psico",
]);

const TIPOS_PERMITIDOS = new Set(["image/png", "image/jpeg", "image/webp"]);

// Evita nombres con espacios/acentos/caracteres raros en el key del
// bucket (mismo criterio que scripts/upload-form-emociones-assets.ts).
function sanitizarNombre(nombreOriginal: string): string {
  const puntoIndex = nombreOriginal.lastIndexOf(".");
  const base = puntoIndex > 0 ? nombreOriginal.slice(0, puntoIndex) : nombreOriginal;
  const ext  = puntoIndex > 0 ? nombreOriginal.slice(puntoIndex).toLowerCase() : "";

  const diacriticos = new RegExp("[\\u0300-\\u036f]", "g");
  const limpio = base
    .normalize("NFD").replace(diacriticos, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  return `${limpio || "imagen"}${ext}`;
}

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

  async POST(req: Request) {
    try {
      const form    = await req.formData();
      const carpeta = form.get("carpeta") as string | null;
      const archivo = form.get("archivo") as File | null;

      if (!carpeta || !CARPETAS_PERMITIDAS.has(carpeta)) {
        return Response.json(
          { error: `carpeta debe ser una de: ${[...CARPETAS_PERMITIDAS].join(", ")}` },
          { status: 400 }
        );
      }
      if (!archivo) {
        return Response.json({ error: "archivo es requerido" }, { status: 400 });
      }
      if (!TIPOS_PERMITIDOS.has(archivo.type)) {
        return Response.json(
          { error: "El archivo debe ser una imagen (PNG, JPEG o WEBP)" },
          { status: 400 }
        );
      }

      const key = `${carpeta}/${Date.now()}_${sanitizarNombre(archivo.name)}`;
      await uploadFile(key, await archivo.arrayBuffer(), archivo.type);
      const url = await getObjectUrl(key);

      return Response.json({ data: { key, url } }, { status: 201 });
    } catch (err) {
      console.error("[POST /api/admin/imagenes]", err);
      return Response.json({ error: "Error al subir la imagen" }, { status: 500 });
    }
  },

  async DELETE(req: Request) {
    try {
      const url     = new URL(req.url);
      const carpeta = url.searchParams.get("carpeta");
      const key     = url.searchParams.get("key");

      if (!carpeta || !CARPETAS_PERMITIDAS.has(carpeta)) {
        return Response.json(
          { error: `carpeta debe ser una de: ${[...CARPETAS_PERMITIDAS].join(", ")}` },
          { status: 400 }
        );
      }
      // El key tiene que pertenecer a la carpeta indicada — si no, cualquiera
      // con acceso a este endpoint podría borrar objetos fuera del catálogo
      // de imágenes (p. ej. un PDF de reportes) con solo cambiar el query param.
      if (!key || !key.startsWith(`${carpeta}/`)) {
        return Response.json(
          { error: "key es requerido y debe pertenecer a la carpeta indicada" },
          { status: 400 }
        );
      }

      await deleteFile(key);
      return Response.json({ data: { key, eliminado: true } });
    } catch (err) {
      console.error("[DELETE /api/admin/imagenes]", err);
      return Response.json({ error: "Error al eliminar la imagen" }, { status: 500 });
    }
  },
};
