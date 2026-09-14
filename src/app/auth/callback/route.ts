import { NextResponse, type NextRequest } from "next/server";
import { ensureProfile } from "@/server/auth/bootstrap";
import { safeReturnPath } from "@/server/auth/return-path";
import { createSupabaseServerClient } from "@/server/supabase/client";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeReturnPath(
    request.nextUrl.searchParams.get("next"),
    "/assets",
  );
  const supabase = await createSupabaseServerClient();
  if (!code || !supabase)
    return NextResponse.redirect(
      new URL("/account?error=invalid_link", request.url),
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
  return NextResponse.redirect(new URL(next, request.url));
}
