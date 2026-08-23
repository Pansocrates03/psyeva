// Capa única de acceso a almacenamiento de objetos (S3-compatible).
//
// En local apunta a un MinIO corriendo en Docker (ver docker-compose.yml).
// En producción (Railway) apunta al bucket S3-compatible de Railway.
// El código es idéntico en ambos casos — solo cambian las env vars.
//
// El bucket es privado (sin bucket policy de lectura pública) — todo
// acceso de lectura desde el navegador pasa por una URL firmada de vida
// corta (getObjectUrl/resolveUrl), no por una URL pública fija. Por eso
// tampoco se usa ACL por objeto (PutObjectCommand sin `ACL`): no aplica
// cuando no hay lectura pública, y además varios proveedores S3-compatible
// (R2, buckets de Railway) ni siquiera soportan ese header.
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

// Cliente para operaciones servidor→bucket (subir, listar). Usa
// S3_ENDPOINT, que en Railway suele ser el endpoint interno de la red
// privada — más rápido y sin costo de egress, pero no resoluble desde
// el navegador del usuario (ver getPresignClient más abajo).
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

let presignClient: S3Client | null = null;

// Cliente exclusivo para firmar URLs de lectura (getObjectUrl). A
// propósito es una instancia separada de getClient(): el host que queda
// grabado en una URL firmada tiene que ser uno que el navegador del
// usuario pueda resolver, y en Railway ese host público normalmente NO es
// el mismo que S3_ENDPOINT (ver S3_PUBLIC_URL en .env.example). Si
// firmáramos con el cliente "interno", la URL resultante apuntaría a un
// host que solo existe dentro de la red privada de Railway — 100% roto
// para cualquiera fuera de ahí.
function getPresignClient(): S3Client {
  if (presignClient) return presignClient;

  const endpoint = process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      "S3_ENDPOINT no está configurado. Ver .env.example para las variables S3_* requeridas."
    );
  }

  presignClient = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId:     process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  });
  return presignClient;
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

const TTL_POR_DEFECTO = Number(process.env.S3_SIGNED_URL_TTL ?? 3600); // 1 hora

/**
 * Sube un archivo al bucket configurado. Devuelve solo confirmación, no
 * una URL — a diferencia de antes, ya no hay una URL pública fija que
 * construir al subir; la URL de lectura se firma recién al pedirse (ver
 * getObjectUrl/resolveUrl), porque una URL firmada expira y no puede
 * guardarse como valor permanente en la fila que la usa.
 */
export async function uploadFile(
  key: string,
  data: Uint8Array | ArrayBuffer,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket:      getBucket(),
      Key:         key,
      Body:        data instanceof ArrayBuffer ? new Uint8Array(data) : data,
      ContentType: contentType,
    })
  );
}

/** Firma una URL de lectura de vida corta para `key`. */
export async function getObjectUrl(key: string, ttlSegundos = TTL_POR_DEFECTO): Promise<string> {
  const comando = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(getPresignClient(), comando, { expiresIn: ttlSegundos });
}

// Antes de esta migración, columnas como reporte.archivo_url o
// pregunta.imagen_url guardaban la URL pública completa del bucket. Con
// el bucket privado esas filas viejas quedan con una URL que ya no sirve
// (403) — no se migran automáticamente. Filas nuevas guardan solo el key
// y se firman al leer, así que acá se distingue uno de otro: si ya
// parece una URL completa (dato viejo o fixture de test), se devuelve tal
// cual; si es un key, se firma.
export async function resolveUrl(
  valor: string | null | undefined,
  ttlSegundos = TTL_POR_DEFECTO
): Promise<string | null> {
  if (!valor) return null;
  if (/^https?:\/\//i.test(valor)) return valor;
  return getObjectUrl(valor, ttlSegundos);
}

export interface ArchivoBucket {
  key: string;
  url: string;
}

/**
 * Lista los objetos del bucket bajo un prefijo (p. ej.
 * "assets/preguntas/") con una URL firmada por objeto. Se
 * usa para el selector de imágenes predefinidas del admin (ver
 * src/routes/admin/imagenes.ts) — nunca se expone directo a rutas sin
 * validar el prefijo primero, para no poder listar todo el bucket
 * (incluidos los PDFs de reportes) desde ahí.
 */
export async function listFiles(prefix: string): Promise<ArchivoBucket[]> {
  const res = await getClient().send(
    new ListObjectsV2Command({ Bucket: getBucket(), Prefix: prefix })
  );

  const objetos = (res.Contents ?? [])
    .filter((obj): obj is { Key: string } => Boolean(obj.Key) && !obj.Key!.endsWith("/"))
    .sort((a, b) => a.Key!.localeCompare(b.Key!, undefined, { numeric: true }));

  return Promise.all(
    objetos.map(async obj => ({ key: obj.Key, url: await getObjectUrl(obj.Key) }))
  );
}
