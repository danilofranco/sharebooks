import Link from "next/link";
import { XCircle } from "lucide-react";

export const metadata = { title: "Pagamento não aprovado — ShareBooks" };

export default function PaymentFailurePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <XCircle className="h-8 w-8 text-red-600" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">Pagamento não aprovado</h1>
      <p className="mb-6 text-gray-500">
        O pagamento foi recusado ou cancelado. Você pode tentar novamente com
        outro método de pagamento.
      </p>
      <div className="flex gap-3">
        <Link href="/listings" className="btn-primary">
          Voltar aos livros
        </Link>
        <Link href="/dashboard" className="btn-secondary">
          Meu Painel
        </Link>
      </div>
    </div>
  );
}
