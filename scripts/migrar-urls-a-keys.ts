// Migración de datos, un solo uso: pasa reporte.archivo_url,
// pregunta.imagen_url y seccion.instruccion_imagen_url de "URL pública
// completa del bucket" (esquema de antes de la migración a presigned
// URLs) a "key dentro del bucket" (esquema nuevo — ver
// src/services/storageService.ts: getObjectUrl/resolveUrl firman recién
// al leer, así que esas columnas ya no deben guardar una URL final).
//
// Necesario porque el bucket de Railway es privado: cualquier fila vieja
// con la URL pública completa ya está rota (403) de todas formas — este
// script no “arregla” el acceso a esos archivos, solo dispone el dato en
// el formato que el código nuevo espera para volver a firmarlos al leer.
//
// Idempotente: una fila que ya tiene un key (no empieza con http) se
// deja intacta. Las filas cuya URL no contiene "/<bucket>/" (p. ej. las
// URLs de ejemplo del seed, https://example.com/...) se dejan intactas y
// se listan al final para revisión manual — no son objetos reales del
// bucket, no hay key que extraerles.
//
// Uso:
//   bun scripts/migrar-urls-a-keys.ts            → aplica los cambios
//   bun scripts/migrar-urls-a-keys.ts --dry-run   → solo muestra qué haría

import sql from "../src/db";

const dryRun = process.argv.includes("--dry-run");
const bucket = process.env.S3_BUCKET;

if (!bucket) {
  console.error("S3_BUCKET no está configurado. Ver .env.example.");
  process.exit(1);
}

// De "https://host/bucket/reportes/x.pdf" (con cualquier host) a
// "reportes/x.pdf". null si la URL no contiene "/<bucket>/" — no hay
// key seguro que extraerle.
function extraerKey(url: string): string | null {
  const marcador = `/${bucket}/`;
  const indice = url.indexOf(marcador);
  if (indice === -1) return null;
  return url.slice(indice + marcador.length);
}

interface Migracion {
  tabla: string;
  columna: string;
  idColumna: string;
}

const migraciones: Migracion[] = [
  { tabla: "reporte",  columna: "archivo_url",             idColumna: "id" },
  { tabla: "pregunta", columna: "imagen_url",               idColumna: "id" },
  { tabla: "seccion",  columna: "instruccion_imagen_url",   idColumna: "id" },
];

async function migrarTabla({ tabla, columna, idColumna }: Migracion) {
  const filas = await sql.unsafe(
    `SELECT ${idColumna} AS id, ${columna} AS valor FROM ${tabla} WHERE ${columna} LIKE 'http%'`
  );

  let actualizadas = 0;
  const sinKeyExtraible: { id: string; valor: string }[] = [];

  for (const fila of filas) {
    const key = extraerKey(fila.valor as string);
    if (key === null) {
      sinKeyExtraible.push({ id: fila.id as string, valor: fila.valor as string });
      continue;
    }

    console.log(`  [${tabla}.${columna}] ${fila.id}: ${fila.valor} → ${key}`);
    if (!dryRun) {
      await sql.unsafe(
        `UPDATE ${tabla} SET ${columna} = $1 WHERE ${idColumna} = $2`,
        [key, fila.id]
      );
    }
    actualizadas++;
  }

  console.log(
    `${tabla}.${columna}: ${actualizadas} fila(s) ${dryRun ? "se actualizarían" : "actualizadas"}, ` +
    `${sinKeyExtraible.length} sin key extraíble (revisar a mano)`
  );
  if (sinKeyExtraible.length > 0) {
    for (const { id, valor } of sinKeyExtraible) {
      console.log(`  ⚠ ${tabla}.${idColumna}=${id}: "${valor}" no contiene "/${bucket}/"`);
    }
  }

  return { actualizadas, sinKeyExtraible: sinKeyExtraible.length };
}

try {
  console.log(`Migrando URLs → keys${dryRun ? " (dry run, no se escribe nada)" : ""}...\n`);

  let totalActualizadas = 0;
  let totalSinKey = 0;
  for (const migracion of migraciones) {
    const resultado = await migrarTabla(migracion);
    totalActualizadas += resultado.actualizadas;
    totalSinKey += resultado.sinKeyExtraible;
  }

  console.log(`\nListo: ${totalActualizadas} fila(s) ${dryRun ? "a actualizar" : "actualizadas"} en total.`);
  if (totalSinKey > 0) {
    console.log(`${totalSinKey} fila(s) quedaron sin tocar por no poder extraerles un key — revisar arriba.`);
  }
} catch (error) {
  console.error("Error en la migración:", error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
