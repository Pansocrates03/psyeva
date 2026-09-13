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

// Debe preservarse el nombre original del archivo tal como lo sube el usuario
// para evitar cambios silenciosos al momento de elegir imágenes o hacer la
// referencia desde un formulario. Si ya existe ese nombre en la carpeta, se
// agrega un sufijo incremental (`nombre-1.png`) para evitar sobreescribir.
function crearKeyUnico(carpeta: string, nombreOriginal: string, usados: Set<string>): string {
  const nombre = nombreOriginal.trim();
  const baseNombre = nombre || "imagen";
  const indiceExtension = baseNombre.lastIndexOf(".");
  const nombreSinExtension = indiceExtension > 0 ? baseNombre.slice(0, indiceExtension) : baseNombre;
  const extension = indiceExtension > 0 ? baseNombre.slice(indiceExtension) : "";

  let clave = `${carpeta}/${baseNombre}`;
  let contador = 1;

  while (usados.has(clave)) {
    clave = `${carpeta}/${nombreSinExtension}-${contador}${extension}`;
    contador += 1;
  }

  usados.add(clave);
  return clave;
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
      const form = await req.formData();
      const carpeta = form.get("carpeta") as string | null;
      const archivos = form.getAll("archivo").filter((file): file is File => file instanceof File);

      if (!carpeta || !CARPETAS_PERMITIDAS.has(carpeta)) {
        return Response.json(
          { error: `carpeta debe ser una de: ${[...CARPETAS_PERMITIDAS].join(", ")}` },
          { status: 400 }
        );
      }
      if (archivos.length === 0) {
        return Response.json({ error: "archivo es requerido" }, { status: 400 });
      }

      const archivosInvalidos = archivos.filter(archivo => !TIPOS_PERMITIDOS.has(archivo.type));
      if (archivosInvalidos.length > 0) {
        return Response.json(
          { error: "El archivo debe ser una imagen (PNG, JPEG o WEBP)" },
          { status: 400 }
        );
      }

      const keysExistentes = new Set((await listFiles(`${carpeta}/`)).map(archivo => archivo.key));
      const subidas = [] as Array<{ key: string; url: string }>;

      for (const archivo of archivos) {
        const key = crearKeyUnico(carpeta, archivo.name, keysExistentes);
        await uploadFile(key, await archivo.arrayBuffer(), archivo.type);
        const url = await getObjectUrl(key);
        subidas.push({ key, url });
      }

      return Response.json({ data: subidas.length === 1 ? subidas[0] : subidas }, { status: 201 });
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
