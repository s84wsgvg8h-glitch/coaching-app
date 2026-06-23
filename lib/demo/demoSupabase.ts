import type { SupabaseClient } from "@supabase/supabase-js";
import {
  disableDemoMode,
  getDemoAuthUser,
  getDemoSession,
  isDemoMode,
} from "@/lib/demo/demoMode";
import { demoFrom } from "@/lib/demo/demoQueryEngine";

type RealtimeChannel = {
  on: () => RealtimeChannel;
  subscribe: () => RealtimeChannel;
  unsubscribe: () => void;
};

function noopChannel(): RealtimeChannel {
  const channel: RealtimeChannel = {
    on: () => channel,
    subscribe: () => channel,
    unsubscribe: () => undefined,
  };
  return channel;
}

export function createDemoAwareSupabaseClient(
  realClient: SupabaseClient,
): SupabaseClient {
  const demoAuth = {
    getUser: async () => {
      const real = await realClient.auth.getUser();
      if (real.data.user) {
        if (isDemoMode()) disableDemoMode();
        return real;
      }
      if (!isDemoMode()) return real;
      return { data: { user: getDemoAuthUser() }, error: null };
    },
    getSession: async () => {
      const real = await realClient.auth.getSession();
      if (real.data.session) {
        if (isDemoMode()) disableDemoMode();
        return real;
      }
      if (!isDemoMode()) return real;
      return { data: { session: getDemoSession() }, error: null };
    },
    signOut: async () => {
      disableDemoMode();
      return realClient.auth.signOut();
    },
    signInWithPassword: async (
      ...args: Parameters<SupabaseClient["auth"]["signInWithPassword"]>
    ) => {
      disableDemoMode();
      return realClient.auth.signInWithPassword(...args);
    },
    onAuthStateChange: (
      callback: Parameters<SupabaseClient["auth"]["onAuthStateChange"]>[0],
    ) => realClient.auth.onAuthStateChange(callback),
  };

  const demoStorage = {
    from: () => ({
      upload: async () => ({
        data: { path: "demo/mock.jpg" },
        error: null,
      }),
      getPublicUrl: (path: string) => ({
        data: {
          publicUrl: `/app-screenshots/athlete-dashboard.png?demo=${encodeURIComponent(path)}`,
        },
      }),
    }),
  };

  const handler: ProxyHandler<SupabaseClient> = {
    get(target, prop, receiver) {
      if (prop === "auth") {
        return new Proxy(target.auth, {
          get(_authTarget, authProp) {
            if (authProp in demoAuth) {
              return demoAuth[authProp as keyof typeof demoAuth];
            }
            return Reflect.get(target.auth, authProp, target.auth);
          },
        });
      }

      if (prop === "from") {
        return (table: string) => {
          if (isDemoMode()) return demoFrom(table);
          return target.from(table);
        };
      }

      if (prop === "storage") {
        if (isDemoMode()) return demoStorage;
        return target.storage;
      }

      if (prop === "channel") {
        if (isDemoMode()) return () => noopChannel();
        return target.channel.bind(target);
      }

      if (prop === "removeChannel") {
        if (isDemoMode()) return () => undefined;
        return target.removeChannel.bind(target);
      }

      if (prop === "rpc") {
        if (isDemoMode()) {
          return async () => ({ data: null, error: null });
        }
        return target.rpc.bind(target);
      }

      return Reflect.get(target, prop, receiver);
    },
  };

  return new Proxy(realClient, handler);
}
