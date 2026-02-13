"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function MfaVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Foca no primeiro input ao montar
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Aceita apenas dígitos
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance para próximo input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace volta pro input anterior
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || "";
    }
    setCode(newCode);

    // Foca no último input preenchido ou no próximo vazio
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async () => {
    const totpCode = code.join("");
    if (totpCode.length !== 6) {
      setError("Digite o código de 6 dígitos.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      // Buscar fatores TOTP do usuário
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError || !factorsData?.totp?.length) {
        setError("Nenhum fator MFA encontrado. Configure o 2FA nas configurações.");
        setLoading(false);
        return;
      }

      const factor = factorsData.totp[0];

      // Criar challenge
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: factor.id });

      if (challengeError || !challenge) {
        setError("Erro ao criar desafio MFA. Tente novamente.");
        setLoading(false);
        return;
      }

      // Verificar código TOTP
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.id,
        code: totpCode,
      });

      if (verifyError) {
        setError("Código inválido. Tente novamente.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      // Verificação bem-sucedida — redirecionar
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  };

  // Submete automaticamente quando 6 dígitos forem preenchidos
  useEffect(() => {
    if (code.every((d) => d !== "") && !loading) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.jpg"
              alt="ShareBooks"
              width={180}
              height={50}
              className="mx-auto h-12 w-auto"
              priority
            />
          </Link>
        </div>

        <div className="card p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
              <ShieldCheck className="h-6 w-6 text-brand-600" />
            </div>
            <h1 className="text-lg font-semibold">Verificação em duas etapas</h1>
            <p className="text-sm text-gray-500">
              Digite o código de 6 dígitos do seu aplicativo autenticador.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* OTP Input com 6 campos */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-12 w-12 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={loading}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={loading || code.join("").length !== 6}
            className="btn-primary w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Verificar"
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Abra o Google Authenticator, Microsoft Authenticator ou app similar
            para obter o código.
          </p>
        </div>
      </div>
    </div>
  );
}
