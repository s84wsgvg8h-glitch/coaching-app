export function mapStorageHttpError(
  status: number,
  rawText: string,
  statusText = "",
): string {
  const trimmed = rawText.trim();
  const statusLabel = statusText ? ` ${statusText}` : "";

  if (
    status === 413 ||
    trimmed.startsWith("Request Entity Too Large") ||
    trimmed.includes("Payload Too Large")
  ) {
    return "Bestand is te groot voor deze upload route";
  }
  if (status === 401) {
    return "Je bent niet ingelogd";
  }
  if (status === 403) {
    return trimmed || "Geen toestemming voor deze upload";
  }
  if (status === 500) {
    return trimmed || "Serverfout bij upload";
  }
  if (trimmed) {
    return trimmed;
  }
  return `Verzoek mislukt (HTTP ${status}${statusLabel})`.trim();
}

export function formatStorageFetchFailure(params: {
  stage: string;
  url: string;
  error: unknown;
}): string {
  const message =
    params.error instanceof Error ? params.error.message : String(params.error);

  if (message === "Failed to fetch" && params.stage === "r2-put") {
    return (
      "Directe R2 upload geblokkeerd. Stel CORS in op je R2 bucket " +
      "(PUT toegestaan vanaf https://limitlesscoaching.app) en herlaad de pagina."
    );
  }

  return `Upload request failed (${params.stage}): ${message}`;
}

export async function parseStorageApiResponse<T extends Record<string, unknown>>(
  response: Response,
  stage: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const rawText = await response.text();

  if (!rawText.trim()) {
    if (!response.ok) {
      return {
        ok: false,
        error: mapStorageHttpError(
          response.status,
          rawText,
          response.statusText,
        ),
      };
    }
    return { ok: false, error: `Lege server response (${stage}).` };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      error: `[${stage}] HTTP ${response.status} ${response.statusText}: ${rawText.slice(0, 300)}`,
    };
  }

  if (!response.ok || payload.ok === false) {
    const message =
      (typeof payload.error === "string" && payload.error) ||
      mapStorageHttpError(response.status, rawText, response.statusText);
    return { ok: false, error: `[${stage}] ${message}` };
  }

  return { ok: true, data: payload as T };
}
