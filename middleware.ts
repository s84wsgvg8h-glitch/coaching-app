import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth guards run client-side in AuthProvider (Supabase session lives in
 * localStorage with the browser client). Server middleware cannot read that
 * session, so we must not redirect unauthenticated requests here — doing so
 * breaks login with an endless /login loop after signInWithPassword.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
