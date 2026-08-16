import sharp from "sharp";

const SUPPORTED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "tiff"]);

/**
 * Valida se o buffer é uma imagem decodificável (JPEG, PNG, WebP, etc.).
 * Retorna false para arquivos corrompidos, truncados ou que não são imagens.
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(buffer).metadata();
    return !!meta.format && SUPPORTED_FORMATS.has(meta.format);
  } catch {
    return false;
  }
}