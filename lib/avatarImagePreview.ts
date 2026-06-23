function isHeicFile(file: File) {
  return (
    /heic|heif/i.test(file.type) ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)
  );
}

function readFileAsDataUrl(file: File | Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Kon afbeelding niet laden."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Kon afbeelding niet laden."));
    reader.readAsDataURL(file);
  });
}

async function convertHeicToJpeg(file: File) {
  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  return Array.isArray(converted) ? converted[0] : converted;
}

export async function loadAvatarImagePreview(file: File) {
  if (isHeicFile(file)) {
    const jpegBlob = await convertHeicToJpeg(file);
    return readFileAsDataUrl(jpegBlob);
  }

  try {
    return await readFileAsDataUrl(file);
  } catch {
    const objectUrl = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        const probe = new Image();
        probe.onload = () => resolve();
        probe.onerror = () => reject(new Error("Kon afbeelding niet laden."));
        probe.src = objectUrl;
      });
      return objectUrl;
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }
}
