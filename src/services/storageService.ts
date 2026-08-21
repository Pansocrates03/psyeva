// Capa única de acceso a almacenamiento de objetos (S3-compatible).
//
// En local apunta a un MinIO corriendo en Docker (ver docker-compose.yml).
// En producción (Railway) apunta al bucket S3-compatible de Railway.
// El código es idéntico en ambos casos — solo cambian las env vars.
//
// No usa ACL por objeto (PutObjectCommand sin `ACL`): varios proveedores
// S3-compatible (R2, buckets de Railway) no soportan ACLs y devuelven error
// si se manda ese header. La visibilidad pública se controla a nivel de
// bucket (bucket policy), no por objeto — ver README / docker-compose.yml
// para el comando que deja el bucket de MinIO en modo público de lectura.
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;

  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      "S3_ENDPOINT no está configurado. Ver .env.example para las variables S3_* requeridas."
    );
  }

  client = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId:     process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
    // MinIO y los buckets S3-compatible de Railway resuelven por path
    // (https://host/bucket/key), no por subdominio (https://bucket.host/key)
    // como el S3 real de AWS.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  });
  return client;
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error(
      "S3_BUCKET no está configurado. Ver .env.example para las variables S3_* requeridas."
    );
  }
  return bucket;
}

// Base pública para construir la URL del objeto. Por defecto es el mismo
// S3_ENDPOINT (sirve para MinIO local con el bucket en modo público), pero
// en Railway normalmente hay un dominio público distinto del endpoint de
// la API S3 — de ahí S3_PUBLIC_URL como override opcional.
function getPublicBase(): string {
  return (process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT ?? "").replace(/\/$/, "");
}

/**
 * Sube un archivo al bucket configurado y devuelve su URL pública.
 * `key` es la ruta dentro del bucket (p. ej. "reportes/general_123_x.pdf").
 */
export async function uploadFile(
  key: string,
  data: Uint8Array | ArrayBuffer,
  contentType: string
): Promise<string> {
  const bucket = getBucket();

  await getClient().send(
    new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      Body:        data instanceof ArrayBuffer ? new Uint8Array(data) : data,
      ContentType: contentType,
    })
  );

  return `${getPublicBase()}/${bucket}/${key}`;
}

export interface ArchivoBucket {
  key: string;
  url: string;
}

/**
 * Lista los objetos del bucket bajo un prefijo (p. ej.
 * "assets/form_emociones/preguntas/") y devuelve su URL pública. Se usa
 * para el selector de imágenes predefinidas del admin (ver
 * src/routes/admin/imagenes.ts) — nunca se expone directo a rutas sin
 * validar el prefijo primero, para no poder listar todo el bucket
 * (incluidos los PDFs de reportes) desde ahí.
 */
export async function listFiles(prefix: string): Promise<ArchivoBucket[]> {
  const bucket = getBucket();
  const base   = getPublicBase();

  const res = await getClient().send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
  );

  return (res.Contents ?? [])
    .filter((obj): obj is { Key: string } => Boolean(obj.Key) && !obj.Key!.endsWith("/"))
    .map(obj => ({ key: obj.Key, url: `${base}/${bucket}/${obj.Key}` }))
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
}
