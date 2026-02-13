import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <Image
            src="/logo.jpg"
            alt="ShareBooks"
            width={100}
            height={28}
            className="h-6 w-auto opacity-60"
          />
          <span className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} — Livros que conectam
          </span>
        </div>
      </div>
    </footer>
  );
}
