import type { Session, User } from "@supabase/supabase-js";
import { getRealSupabase } from "@/lib/supabaseClient";

/**
 * Read the persisted session from local storage without a network round-trip.
 */
export async function getPersistedAuthSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await getRealSupabase().auth.getSession();
  return session;
}

/**
 * Prefer the locally persisted session; fall back to getUser() when needed.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const session = await getPersistedAuthSession();
  if (session?.user) return session.user;

  const {
    data: { user },
  } = await getRealSupabase().auth.getUser();
  return user;
}
