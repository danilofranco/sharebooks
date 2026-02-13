import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Checar se o user precisa completar MFA
      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
        const mfaUrl = new URL("/auth/mfa-verify", origin);
        mfaUrl.searchParams.set("redirectTo", next);
        return NextResponse.redirect(mfaUrl.toString());
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=auth`);
}
