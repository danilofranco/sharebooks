"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldOff,
  Loader2,
  QrCode,
  Check,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type EnrollStep = "idle" | "qr" | "verify" | "done";

export function MfaSetup({ initialHasMfa }: { initialHasMfa: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  const [hasMfa, setHasMfa] = useState(initialHasMfa);
  const [step, setStep] = useState<EnrollStep>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Enrollment state
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Disable state
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableCode, setDisableCode] = useState(["", "", "", "", "", ""]);
  const disableInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ─── Enrollment ───────────────────────────────────────────

  const startEnroll = async () => {
    setError("");
    setLoading(true);

    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "ShareBooks Authenticator",
      });

      if (enrollError || !data) {
        setError("Erro ao iniciar configuração. Tente novamente.");
        setLoading(false);
        return;
      }

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep("qr");
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const verifyEnrollment = async () => {
    const totpCode = code.join("");
    if (totpCode.length !== 6) {
      setError("Digite o código de 6 dígitos.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Criar challenge
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError || !challenge) {
        setError("Erro ao criar desafio. Tente novamente.");
        setLoading(false);
        return;
      }

      // Verificar
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: totpCode,
      });

      if (verifyError) {
        setError("Código inválido. Verifique e tente novamente.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      setStep("done");
      setHasMfa(true);
      router.refresh();
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Desativar MFA ────────────────────────────────────────

  const handleDisable = async () => {
    const totpCode = disableCode.join("");
    if (totpCode.length !== 6) {
      setError("Digite o código para confirmar a desativação.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Listar fatores para pegar o ID
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp?.[0];

      if (!factor) {
        setError("Nenhum fator MFA encontrado.");
        setLoading(false);
        return;
      }

      // Verificar código antes de desativar (segurança)
      const { data: challenge } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });

      if (!challenge) {
        setError("Erro ao criar desafio. Tente novamente.");
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.id,
        code: totpCode,
      });

      if (verifyError) {
        setError("Código inválido. Não foi possível desativar.");
        setDisableCode(["", "", "", "", "", ""]);
        disableInputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      // Unenroll (remover fator)
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });

      if (unenrollError) {
        setError("Erro ao desativar 2FA. Tente novamente.");
        setLoading(false);
        return;
      }

      setHasMfa(false);
      setShowDisableConfirm(false);
      setDisableCode(["", "", "", "", "", ""]);
      router.refresh();
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP Input handler genérico ───────────────────────────

  const handleOtpChange = (
    index: number,
    value: string,
    otp: string[],
    setOtp: (v: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) refs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    otp: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (
    e: React.ClipboardEvent,
    otp: string[],
    setOtp: (v: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || "";
    setOtp(newOtp);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ─── OTP Input component ─────────────────────────────────

  const OtpInput = ({
    otp,
    setOtp,
    refs,
    disabled,
  }: {
    otp: string[];
    setOtp: (v: string[]) => void;
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    disabled: boolean;
  }) => (
    <div
      className="flex justify-center gap-2"
      onPaste={(e) => handleOtpPaste(e, otp, setOtp, refs)}
    >
      {otp.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          onChange={(e) => handleOtpChange(i, e.target.value, otp, setOtp, refs)}
          onKeyDown={(e) => handleOtpKeyDown(i, e, otp, refs)}
          className="h-12 w-12 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          disabled={disabled}
        />
      ))}
    </div>
  );

  // ─── Render: 2FA já ativado ───────────────────────────────

  if (hasMfa && step !== "done") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">2FA ativado</p>
            <p className="text-sm text-green-600">
              Sua conta está protegida com autenticação em duas etapas.
            </p>
          </div>
        </div>

        {!showDisableConfirm ? (
          <button
            type="button"
            onClick={() => {
              setShowDisableConfirm(true);
              setError("");
              setTimeout(() => disableInputRefs.current[0]?.focus(), 100);
            }}
            className="btn-ghost text-sm text-red-600 hover:bg-red-50"
          >
            <ShieldOff className="h-4 w-4" />
            Desativar 2FA
          </button>
        ) : (
          <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Confirme a desativação
                </p>
                <p className="text-xs text-red-600">
                  Digite o código do seu autenticador para confirmar.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <OtpInput
              otp={disableCode}
              setOtp={setDisableCode}
              refs={disableInputRefs}
              disabled={loading}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDisable}
                disabled={loading || disableCode.join("").length !== 6}
                className="btn-primary bg-red-600 hover:bg-red-700 text-sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirmar desativação"
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDisableConfirm(false);
                  setError("");
                  setDisableCode(["", "", "", "", "", ""]);
                }}
                className="btn-ghost text-sm"
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Render: Sucesso ──────────────────────────────────────

  if (step === "done") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
          <Check className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">2FA ativado com sucesso!</p>
            <p className="text-sm text-green-600">
              Na próxima vez que fizer login, será necessário digitar o código do
              autenticador.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: QR Code + verificação ────────────────────────

  if (step === "qr" || step === "verify") {
    return (
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Passo 1: QR Code */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
              1
            </div>
            <div>
              <p className="font-medium">Escaneie o QR Code</p>
              <p className="text-sm text-gray-500">
                Abra seu app autenticador e escaneie o código abaixo.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="QR Code para 2FA" className="h-48 w-48" />
            </div>
          </div>

          {/* Código manual como fallback */}
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
              Não consegue escanear? Insira o código manualmente
            </summary>
            <div className="mt-2 rounded-lg bg-gray-50 p-3">
              <code className="break-all text-xs text-gray-700">{secret}</code>
            </div>
          </details>
        </div>

        {/* Passo 2: Verificar código */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
              2
            </div>
            <div>
              <p className="font-medium">Confirme o código</p>
              <p className="text-sm text-gray-500">
                Digite o código de 6 dígitos exibido no seu autenticador.
              </p>
            </div>
          </div>

          <OtpInput
            otp={code}
            setOtp={setCode}
            refs={inputRefs}
            disabled={loading}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={verifyEnrollment}
              disabled={loading || code.join("").length !== 6}
              className="btn-primary text-sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Ativar 2FA"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("idle");
                setError("");
                setCode(["", "", "", "", "", ""]);
              }}
              className="btn-ghost text-sm"
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Estado inicial (sem MFA) ─────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4">
        <ShieldOff className="h-5 w-5 text-yellow-600" />
        <div>
          <p className="font-medium text-yellow-800">2FA desativado</p>
          <p className="text-sm text-yellow-600">
            Recomendamos ativar a autenticação em duas etapas para proteger sua
            conta.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={startEnroll}
        disabled={loading}
        className="btn-primary text-sm"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <QrCode className="h-4 w-4" />
            Configurar 2FA
          </>
        )}
      </button>
    </div>
  );
}
