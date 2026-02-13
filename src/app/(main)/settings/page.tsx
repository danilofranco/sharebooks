import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Settings } from "lucide-react";
import { MfaSetup } from "@/components/settings/mfa-setup";

export const metadata = { title: "Configurações — ShareBooks" };

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirectTo=/settings");

  // Checar se o user já tem fatores MFA
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasMfa = (factors?.totp?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      {/* Seção de Segurança / 2FA */}
      <section className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Autenticação em duas etapas (2FA)</h2>
          <p className="mt-1 text-sm text-gray-500">
            Adicione uma camada extra de segurança à sua conta usando um aplicativo
            autenticador como Google Authenticator ou Microsoft Authenticator.
          </p>
        </div>

        <MfaSetup initialHasMfa={hasMfa} />
      </section>
    </div>
  );
}
