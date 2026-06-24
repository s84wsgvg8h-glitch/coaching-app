export interface Env {
  APP_URL: string;
  CRON_SECRET: string;
}

async function triggerBroadcasts(env: Env): Promise<Response> {
  if (!env.CRON_SECRET?.trim()) {
    return new Response("CRON_SECRET not configured", { status: 500 });
  }

  const url = `${env.APP_URL.replace(/\/$/, "")}/api/cron/broadcasts`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET.trim()}`,
      Accept: "application/json",
    },
  });

  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token || token !== env.CRON_SECRET?.trim()) {
      return new Response("Unauthorized", { status: 401 });
    }
    return triggerBroadcasts(env);
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const response = await triggerBroadcasts(env);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Broadcasts cron failed (${response.status}): ${text}`);
    }
  },
};
