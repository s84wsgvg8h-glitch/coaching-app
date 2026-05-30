import { supabase } from "@/lib/supabaseClient";

const BUCKET = "chat-media";

export async function uploadMerchImage(userId: string, file: File) {
  if (!file.type.startsWith("image/")) {
    return {
      url: null as string | null,
      error: new Error("Alleen afbeeldingen zijn toegestaan."),
    };
  }

  const extension = file.name.split(".").pop() || "jpg";
  const filePath = `merch/${userId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) {
    return { url: null as string | null, error: uploadError };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return { url: data.publicUrl, error: null as Error | null };
}
