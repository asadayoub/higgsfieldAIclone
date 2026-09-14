import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readServerEnv } from "@/config/env";
import { ensureProfile } from "@/server/auth/bootstrap";
import { safeReturnPath } from "@/server/auth/return-path";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeReturnPath(
    request.nextUrl.searchParams.get("next"),
    "/assets",
  );
  const env = readServerEnv();
  if (
    !code ||
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return NextResponse.redirect(
      new URL("/account?error=invalid_link", request.url),
    );

  const response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (entries, headers) => {
          entries.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error)
    return NextResponse.redirect(
      new URL("/account?error=expired_link", request.url),
    );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await ensureProfile(user);
  return response;
}
