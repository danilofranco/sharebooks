import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = { title: "Pagamento aprovado — ShareBooks" };

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">Pagamento aprovado!</h1>
      <p className="mb-6 text-gray-500">
        Seu pagamento foi confirmado. O vendedor será notificado e vocês podem
        combinar a entrega pelo chat.
      </p>
      <div className="flex gap-3">
        <Link href="/dashboard" className="btn-primary">
          Ir para o Painel
        </Link>
        <Link href="/listings" className="btn-secondary">
          Continuar buscando
        </Link>
      </div>
    </div>
  );
}
