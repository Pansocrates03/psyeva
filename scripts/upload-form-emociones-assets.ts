// Sube de una sola vez el catálogo de ilustraciones predefinidas
// (src/assets/form_emociones/**, el origen local) al bucket S3-compatible
// configurado en .env, bajo los prefijos planos "assets/instrucciones/" y
// "assets/preguntas/" — únicos que acepta el allowlist de imagenes.ts, no
// hay subcarpeta por set. Después de correr esto, el selector de imágenes
// del admin (SelectorImagen.tsx → GET /api/admin/imagenes) las puede
// listar y usar.
//
// Uso (necesita MinIO local corriendo — `docker compose up -d` — o
// apuntar S3_* en .env al bucket de Railway):
//   bun scripts/upload-form-emociones-assets.ts
//
// Es seguro correrlo más de una vez: sobreescribe los mismos keys, no
// duplica nada.
import { readdir } from "node:fs/promises";
import path from "node:path";
import { uploadFile } from "../src/services/storageService";

const ORIGEN = path.resolve(import.meta.dir, "../src/assets/form_emociones");
const SUBCARPETAS = ["instrucciones", "preguntas"] as const;

// Normaliza nombres de archivo con espacios/acentos a algo seguro para
// usar en una URL sin necesidad de encodeURIComponent en el frontend.
function slugify(filename: string): string {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g"); // marcas combinadas (acentos tras NFD)
  const limpio = base
    .normalize("NFD").replace(DIACRITICOS, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
  return `${limpio}${ext.toLowerCase()}`;
}

async function main() {
  let total = 0;

  for (const subcarpeta of SUBCARPETAS) {
    const dir = path.join(ORIGEN, subcarpeta);
    const archivos = (await readdir(dir)).filter(f => f.toLowerCase().endsWith(".png"));

    console.log(`\n${subcarpeta}/ — ${archivos.length} archivos`);

    for (const archivo of archivos) {
      const key = `assets/${subcarpeta}/${slugify(archivo)}`;
      const file = Bun.file(path.join(dir, archivo));
      const bytes = await file.arrayBuffer();

      await uploadFile(key, bytes, "image/png");
      console.log(`  ✓ ${archivo} → ${key}`);
      total++;
    }
  }

  console.log(`\nListo — ${total} imágenes subidas.`);
}

main().catch(err => {
  console.error("Error subiendo imágenes:", err);
  process.exit(1);
});
