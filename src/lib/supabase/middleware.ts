import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rotas protegidas
  const protectedPaths = ["/dashboard", "/listings/new", "/conversations", "/admin", "/settings"];
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // MFA: verificar se o user precisa completar 2FA
  // Não redireciona se já está na página de verificação MFA ou na de configurações
  const mfaExemptPaths = ["/auth/mfa-verify", "/settings"];
  const isMfaExempt = mfaExemptPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (user && isProtected && !isMfaExempt) {
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
      // User tem MFA ativado mas não verificou nesta sessão
      const url = request.nextUrl.clone();
      url.pathname = "/auth/mfa-verify";
      url.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  // Rota de admin
  if (request.nextUrl.pathname.startsWith("/admin") && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
