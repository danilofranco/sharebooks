"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Global Error Boundary — OWASP A10:2025
 *
 * Captura erros não tratados em qualquer rota.
 * Nunca expõe stack traces ou detalhes internos ao usuário.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log estruturado do erro (server-side via console — capturado por plataforma de deploy)
    console.error("[UNHANDLED_ERROR]", {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="mb-2 text-xl font-bold">Algo deu errado</h2>
      <p className="mb-6 text-gray-500">
        Ocorreu um erro inesperado. Tente novamente ou volte para a página
        inicial.
      </p>
      {/* Nunca exibir error.message ao usuário — pode conter dados sensíveis */}
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary">
          Tentar novamente
        </button>
        <a href="/" className="btn-secondary">
          Página inicial
        </a>
      </div>
    </div>
  );
}
