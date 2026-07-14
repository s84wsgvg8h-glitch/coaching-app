const DEFAULT_SUPPORT_EMAIL = "support@limitlesscoaching.app";

export function getSupportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL;
}

export function getSupportMailto(): string {
  return `mailto:${getSupportEmail()}`;
}

export function getSupportUrl(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://limitlesscoaching.app"}/support`;
}
