import { uploadFileViaApi } from "@/lib/storage/clientUpload";

export async function uploadMerchImage(userId: string, file: File) {
  if (!file.type.startsWith("image/")) {
    return {
      url: null as string | null,
      storage: null,
      error: new Error("Alleen afbeeldingen zijn toegestaan."),
    };
  }

  const result = await uploadFileViaApi({
    file,
    filename: file.name,
    uploadType: "merch-images",
    upsert: true,
  });

  if (result.error || !result.url) {
    return {
      url: null as string | null,
      storage: null,
      error: result.error || new Error("Upload mislukt."),
    };
  }

  return {
    url: result.url,
    storage: result,
    error: null as Error | null,
  };
}
