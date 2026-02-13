import Link from "next/link";
import { Clock } from "lucide-react";

export const metadata = { title: "Pagamento pendente — ShareBooks" };

export default function PaymentPendingPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
        <Clock className="h-8 w-8 text-yellow-600" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">Pagamento pendente</h1>
      <p className="mb-6 text-gray-500">
        Seu pagamento está sendo processado (ex: boleto ou Pix aguardando
        confirmação). Assim que for aprovado, notificaremos você.
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
