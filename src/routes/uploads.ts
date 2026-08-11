// GET /uploads/:filename
// Sirve los PDFs subidos por el admin (ver POST /api/admin/reportes).
// Sin esto, archivo_url apunta a un path que nadie sirve y cae en el
// catch-all del SPA (devuelve index.html en vez del archivo real).
export const uploadsRoutes = {

  async GET(req: Request) {
    const filename = new URL(req.url).pathname.split("/").at(-1) ?? "";

    // Nombre de archivo plano, sin separadores ni "..": evita path traversal.
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return new Response("No encontrado", { status: 404 });
    }

    const uploadsDir = process.env.UPLOADS_DIR ?? "./uploads";
    const file = Bun.file(`${uploadsDir}/${filename}`);

    if (!(await file.exists())) {
      return new Response("No encontrado", { status: 404 });
    }

    return new Response(file, {
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
  },
};
