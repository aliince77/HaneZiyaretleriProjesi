const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const COMPRESS_THRESHOLD_BYTES = 600 * 1024; // 600 KB

let captureCounter = 0;

export async function optimizeCameraOrGalleryPhotos(
  files: File[],
): Promise<File[]> {
  return Promise.all(files.map((file) => optimizeSinglePhoto(file)));
}

async function optimizeSinglePhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  captureCounter += 1;
  const isGenericCameraName =
    /^image\.(jpe?g|png|heic|webp)$/i.test(file.name) ||
    /^foto\.(jpe?g|png)$/i.test(file.name);
  const baseName = isGenericCameraName
    ? `ziyaret-foto-${captureCounter}`
    : file.name.replace(/\.[^.]+$/, "");

  if (file.size <= COMPRESS_THRESHOLD_BYTES && !isGenericCameraName) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );

    if (!blob || (blob.size >= file.size && !isGenericCameraName)) {
      return file;
    }

    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
