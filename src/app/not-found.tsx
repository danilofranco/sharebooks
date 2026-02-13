import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Image
        src="/logo.jpg"
        alt="ShareBooks"
        width={160}
        height={44}
        className="mb-6 h-10 w-auto opacity-40"
      />
      <h1 className="mb-2 text-2xl font-bold">Página não encontrada</h1>
      <p className="mb-6 text-gray-500">
        O conteúdo que você procura não existe ou foi removido.
      </p>
      <Link href="/" className="btn-primary">
        Voltar ao início
      </Link>
    </div>
  );
}
