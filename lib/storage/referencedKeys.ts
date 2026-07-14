import { getR2Config } from "@/lib/storage/env";

function normalizeKey(key: string | null | undefined) {
  if (!key?.trim()) return null;
  return key.trim().replace(/^\/+/, "");
}

export function extractR2KeyFromUrl(
  url: string | null | undefined,
  publicUrlBase?: string,
) {
  const raw = url?.trim();
  if (!raw) return null;

  const base = (publicUrlBase || getR2Config()?.publicUrl || "").replace(
    /\/$/,
    "",
  );

  if (base && raw.startsWith(base)) {
    return normalizeKey(raw.slice(base.length));
  }

  return null;
}

export function addReferencedKey(
  set: Set<string>,
  value: string | null | undefined,
  publicUrlBase?: string,
) {
  const direct = normalizeKey(value);
  if (direct && !direct.startsWith("http")) {
    set.add(direct);
    return;
  }

  const fromUrl = extractR2KeyFromUrl(value, publicUrlBase);
  if (fromUrl) set.add(fromUrl);
}

export function addReferencedKeysFromRow(
  set: Set<string>,
  row: Record<string, unknown>,
  options: {
    urlFields?: string[];
    pathFields?: string[];
    publicUrlBase?: string;
  },
) {
  const base = options.publicUrlBase;

  for (const field of options.pathFields || []) {
    addReferencedKey(set, row[field] as string | null, base);
  }

  for (const field of options.urlFields || []) {
    addReferencedKey(set, row[field] as string | null, base);
  }
}

export function addFeedbackMediaUrls(
  set: Set<string>,
  feedbackMedia: unknown,
  publicUrlBase?: string,
) {
  if (!Array.isArray(feedbackMedia)) return;

  for (const item of feedbackMedia) {
    if (item && typeof item === "object" && "url" in item) {
      addReferencedKey(set, (item as { url?: string }).url, publicUrlBase);
    }
  }
}

export function addImageUrlsArray(
  set: Set<string>,
  urls: unknown,
  publicUrlBase?: string,
) {
  if (!Array.isArray(urls)) return;
  for (const url of urls) {
    if (typeof url === "string") {
      addReferencedKey(set, url, publicUrlBase);
    }
  }
}
