import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

let cachedS3Client: S3Client | null = null;

/**
 * Retorna una instancia reutilizable del cliente S3 autenticado.
 */
export function getS3Client(): S3Client {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Credenciales de AWS S3 no configuradas en las variables de entorno",
    );
  }

  cachedS3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedS3Client;
}

/**
 * Resetea el cliente en memoria (útil para pruebas unitarias).
 */
export function resetS3Client(): void {
  cachedS3Client = null;
}

/**
 * Valida el tipo MIME y tamaño de la imagen proporcionada.
 */
export function validateImageFile(file: File | Blob): void {
  if (!file.type || !ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
    throw new Error(
      "Formato de imagen no soportado. Usa JPEG, PNG, WebP o AVIF",
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("La imagen excede el tamaño máximo permitido de 5MB");
  }
}

/**
 * Construye la URL pública permanente del objeto en S3 o CloudFront.
 */
export function getS3PublicUrl(key: string): string {
  const customDomain = process.env.AWS_S3_CUSTOM_DOMAIN?.trim();
  if (customDomain) {
    const cleanDomain = customDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
    return `https://${cleanDomain}/${key}`;
  }

  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || "us-east-1";

  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME no configurado");
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Sube una imagen de platillo a S3 y retorna su URL pública persistente.
 * Genera una ruta sanitizada: ${tenant_id}/menu-items/${Date.now()}-${uuid}.${extension}
 */
export async function uploadMenuItemImage(
  imageFile: File,
  tenantId: string,
): Promise<string> {
  validateImageFile(imageFile);

  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME no configurado");
  }

  const extension = EXTENSION_MAP[imageFile.type];

  const sanitizedTenantId = tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
  const uniqueId = crypto.randomUUID();
  const key = `${sanitizedTenantId}/menu-items/${Date.now()}-${uniqueId}.${extension}`;

  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const s3 = getS3Client();

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: imageFile.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    console.error("Error uploading to AWS S3:", error);
    throw new Error(
      `Error al subir la imagen a S3: ${error instanceof Error ? error.message : "Error desconocido"}`,
    );
  }

  return getS3PublicUrl(key);
}
