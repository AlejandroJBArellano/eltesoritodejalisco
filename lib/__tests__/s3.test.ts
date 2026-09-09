import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  getS3Client,
  resetS3Client,
  validateImageFile,
  getS3PublicUrl,
  uploadMenuItemImage,
} from "../s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const { mockSend } = vi.hoisted(() => {
  const mockSend = vi.fn().mockResolvedValue({});
  return { mockSend };
});

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...actual,
    S3Client: class {
      send = mockSend;
    },
  };
});

describe("lib/s3", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    resetS3Client();
    process.env = {
      ...originalEnv,
      AWS_REGION: "us-east-1",
      AWS_ACCESS_KEY_ID: "test-access-key",
      AWS_SECRET_ACCESS_KEY: "test-secret-key",
      AWS_S3_BUCKET_NAME: "test-bucket",
    };
    delete process.env.AWS_S3_CUSTOM_DOMAIN;
  });

  afterEach(() => {
    process.env = originalEnv;
    resetS3Client();
  });

  describe("Constants & Validation", () => {
    it("should export allowed image types and max image size", () => {
      expect(ALLOWED_IMAGE_TYPES).toContain("image/jpeg");
      expect(ALLOWED_IMAGE_TYPES).toContain("image/png");
      expect(ALLOWED_IMAGE_TYPES).toContain("image/webp");
      expect(ALLOWED_IMAGE_TYPES).toContain("image/avif");
      expect(MAX_IMAGE_SIZE_BYTES).toBe(5 * 1024 * 1024);
    });

    it("should validate allowed image formats without throwing", () => {
      for (const mimeType of ALLOWED_IMAGE_TYPES) {
        const file = new File(["test data"], "test.jpg", { type: mimeType });
        expect(() => validateImageFile(file)).not.toThrow();
      }
    });

    it("should throw for missing or unsupported image format", () => {
      const emptyTypeFile = new File(["test"], "test", { type: "" });
      expect(() => validateImageFile(emptyTypeFile)).toThrow(
        "Formato de imagen no soportado. Usa JPEG, PNG, WebP o AVIF",
      );

      const gifFile = new File(["test"], "test.gif", { type: "image/gif" });
      expect(() => validateImageFile(gifFile)).toThrow(
        "Formato de imagen no soportado. Usa JPEG, PNG, WebP o AVIF",
      );

      const pdfFile = new File(["test"], "doc.pdf", { type: "application/pdf" });
      expect(() => validateImageFile(pdfFile)).toThrow(
        "Formato de imagen no soportado. Usa JPEG, PNG, WebP o AVIF",
      );
    });

    it("should throw when file size exceeds 5MB", () => {
      const largeFile = new File(["x"], "large.jpg", { type: "image/jpeg" });
      Object.defineProperty(largeFile, "size", {
        value: MAX_IMAGE_SIZE_BYTES + 1,
      });

      expect(() => validateImageFile(largeFile)).toThrow(
        "La imagen excede el tamaño máximo permitido de 5MB",
      );
    });
  });

  describe("getS3Client & resetS3Client", () => {
    it("should throw if AWS_REGION is missing", () => {
      delete process.env.AWS_REGION;
      expect(() => getS3Client()).toThrow(
        "Credenciales de AWS S3 no configuradas en las variables de entorno",
      );
    });

    it("should throw if AWS_ACCESS_KEY_ID is missing", () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      expect(() => getS3Client()).toThrow(
        "Credenciales de AWS S3 no configuradas en las variables de entorno",
      );
    });

    it("should throw if AWS_SECRET_ACCESS_KEY is missing", () => {
      delete process.env.AWS_SECRET_ACCESS_KEY;
      expect(() => getS3Client()).toThrow(
        "Credenciales de AWS S3 no configuradas en las variables de entorno",
      );
    });

    it("should return initialized client and reuse cached instance", () => {
      const client1 = getS3Client();
      const client2 = getS3Client();
      expect(client1).toBe(client2);
    });

    it("should create a new client after resetS3Client", () => {
      const client1 = getS3Client();
      resetS3Client();
      const client2 = getS3Client();
      expect(client1).not.toBe(client2);
    });
  });

  describe("getS3PublicUrl", () => {
    it("should return standard S3 URL when no custom domain is set", () => {
      const url = getS3PublicUrl("tenant-1/menu-items/photo.jpg");
      expect(url).toBe(
        "https://test-bucket.s3.us-east-1.amazonaws.com/tenant-1/menu-items/photo.jpg",
      );
    });

    it("should fallback to us-east-1 if AWS_REGION is not defined in getS3PublicUrl", () => {
      delete process.env.AWS_REGION;
      const url = getS3PublicUrl("tenant-1/menu-items/photo.jpg");
      expect(url).toBe(
        "https://test-bucket.s3.us-east-1.amazonaws.com/tenant-1/menu-items/photo.jpg",
      );
    });

    it("should throw if AWS_S3_BUCKET_NAME is missing", () => {
      delete process.env.AWS_S3_BUCKET_NAME;
      expect(() => getS3PublicUrl("photo.jpg")).toThrow(
        "AWS_S3_BUCKET_NAME no configurado",
      );
    });

    it("should use AWS_S3_CUSTOM_DOMAIN when provided", () => {
      process.env.AWS_S3_CUSTOM_DOMAIN = "https://cdn.trykittn.com/";
      const url = getS3PublicUrl("tenant-1/menu-items/photo.webp");
      expect(url).toBe("https://cdn.trykittn.com/tenant-1/menu-items/photo.webp");
    });
  });

  describe("uploadMenuItemImage", () => {
    it("should throw if file validation fails", async () => {
      const invalidFile = new File(["test"], "test.txt", { type: "text/plain" });
      await expect(uploadMenuItemImage(invalidFile, "tenant-1")).rejects.toThrow(
        "Formato de imagen no soportado. Usa JPEG, PNG, WebP o AVIF",
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should throw if AWS_S3_BUCKET_NAME is not set", async () => {
      delete process.env.AWS_S3_BUCKET_NAME;
      const file = new File(["test"], "taco.png", { type: "image/png" });
      await expect(uploadMenuItemImage(file, "tenant-1")).rejects.toThrow(
        "AWS_S3_BUCKET_NAME no configurado",
      );
    });

    it("should upload image successfully with correct command parameters and return public URL", async () => {
      mockSend.mockResolvedValueOnce({});
      const file = new File(["dummy image content"], "taco al pastor.jpeg", {
        type: "image/jpeg",
      });

      const url = await uploadMenuItemImage(file, "tenant@123_special!");

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input.Bucket).toBe("test-bucket");
      expect(command.input.ContentType).toBe("image/jpeg");
      expect(command.input.CacheControl).toBe("public, max-age=31536000, immutable");
      expect(command.input.Key).toMatch(/^tenant123_special\/menu-items\/\d+-[a-f0-9-]+\.jpg$/);
      expect(url).toContain("https://test-bucket.s3.us-east-1.amazonaws.com/tenant123_special/menu-items/");
    });

    it("should correctly detect extension for webp and png files", async () => {
      const webpFile = new File(["data"], "dish.webp", { type: "image/webp" });
      const webpUrl = await uploadMenuItemImage(webpFile, "tenant-1");
      expect(webpUrl).toMatch(/\.webp$/);

      const pngFile = new File(["data"], "dish.png", { type: "image/png" });
      const pngUrl = await uploadMenuItemImage(pngFile, "tenant-1");
      expect(pngUrl).toMatch(/\.png$/);
    });

    it("should handle S3 upload errors and throw friendly Spanish message", async () => {
      mockSend.mockRejectedValueOnce(new Error("AccessDenied: User not authorized"));
      const file = new File(["data"], "dish.jpg", { type: "image/jpeg" });

      await expect(uploadMenuItemImage(file, "tenant-1")).rejects.toThrow(
        "Error al subir la imagen a S3: AccessDenied: User not authorized",
      );
    });

    it("should handle non-Error exceptions gracefully", async () => {
      mockSend.mockRejectedValueOnce("Network timeout");
      const file = new File(["data"], "dish.jpg", { type: "image/jpeg" });

      await expect(uploadMenuItemImage(file, "tenant-1")).rejects.toThrow(
        "Error al subir la imagen a S3: Error desconocido",
      );
    });
  });
});
