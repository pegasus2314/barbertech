// Shrinks a photo in the browser before it's uploaded, so a 4MB phone photo
// becomes a ~150-300KB WebP. Public pages then load fast on mobile data, and
// storage stays small. Runs client-side only (canvas).

export type CompressOptions = {
  /** Longest side in pixels; larger images are scaled down, smaller ones are left alone. */
  maxSize: number;
  /** 0–1 WebP quality. */
  quality?: number;
};

export type CompressedImage = { blob: Blob; contentType: string; extension: string };

// Never throws: if anything about compression fails (old browser, odd file),
// the original file is uploaded untouched — a big photo beats a failed upload.
export async function compressImage(file: File, { maxSize, quality = 0.82 }: CompressOptions): Promise<CompressedImage> {
  const original = { blob: file as Blob, contentType: file.type, extension: extensionFor(file.type) };

  // Animated GIFs would lose their animation on a canvas.
  if (file.type === "image/gif") return original;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.type !== "image/webp") return original;

    // Already-optimized files can come out bigger; keep whichever is smaller.
    if (blob.size >= file.size && scale === 1) return original;

    return { blob, contentType: "image/webp", extension: "webp" };
  } catch {
    return original;
  }
}

function extensionFor(type: string): string {
  switch (type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}
