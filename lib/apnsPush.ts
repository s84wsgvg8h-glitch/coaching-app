import { SignJWT, importPKCS8 } from "jose";
import {
  iosTokenFromEndpoint,
  isIosPushEndpoint,
} from "@/lib/pushEndpoint";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

type ApnsConfig = {
  keyId: string;
  teamId: string;
  privateKey: string;
  bundleId: string;
  useSandbox: boolean;
};

let cachedConfig: ApnsConfig | null = null;
let cachedJwt: { token: string; expiresAt: number } | null = null;

function getApnsConfig(): ApnsConfig | null {
  if (cachedConfig) return cachedConfig;

  const keyId = process.env.APNS_KEY_ID?.trim();
  const teamId = process.env.APNS_TEAM_ID?.trim();
  const privateKeyRaw = process.env.APNS_PRIVATE_KEY?.trim();
  const bundleId = process.env.APNS_BUNDLE_ID?.trim() || "app.limitlesscoaching";

  if (!keyId || !teamId || !privateKeyRaw) return null;

  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  cachedConfig = {
    keyId,
    teamId,
    privateKey,
    bundleId,
    useSandbox: process.env.APNS_USE_SANDBOX === "true",
  };
  return cachedConfig;
}

export function isApnsConfigured(): boolean {
  return getApnsConfig() !== null;
}

async function getApnsJwt(config: ApnsConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.expiresAt - 120 > now) {
    return cachedJwt.token;
  }

  const key = await importPKCS8(config.privateKey, "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: config.keyId })
    .setIssuer(config.teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  cachedJwt = { token, expiresAt: now + 3600 };
  return token;
}

export async function sendApnsNotification(
  deviceToken: string,
  payload: PushPayload,
): Promise<{ ok: true } | { ok: false; status: number; reason?: string }> {
  const config = getApnsConfig();
  if (!config) {
    return { ok: false, status: 503, reason: "APNS not configured" };
  }

  const host = config.useSandbox
    ? "api.sandbox.push.apple.com"
    : "api.push.apple.com";
  const jwt = await getApnsJwt(config);

  const body = {
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
    },
    url: payload.url ?? "/dashboard",
  };

  const response = await fetch(`https://${host}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": config.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.ok) return { ok: true };

  let reason: string | undefined;
  try {
    const json = (await response.json()) as { reason?: string };
    reason = json.reason;
  } catch {
    reason = await response.text().catch(() => undefined);
  }

  return { ok: false, status: response.status, reason };
}

export async function sendPushToSubscription(
  subscription: {
    endpoint: string;
    p256dh?: string | null;
    auth?: string | null;
  },
  payload: PushPayload,
  webpushSend?: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    body: string,
  ) => Promise<unknown>,
): Promise<boolean> {
  if (isIosPushEndpoint(subscription.endpoint)) {
    const token = iosTokenFromEndpoint(subscription.endpoint);
    const result = await sendApnsNotification(token, payload);
    return result.ok;
  }

  if (!webpushSend || !subscription.p256dh || !subscription.auth) {
    return false;
  }

  try {
    await webpushSend(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return true;
  } catch {
    return false;
  }
}
