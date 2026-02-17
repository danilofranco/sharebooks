import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AmplitudeInit from "@/components/AmplitudeInit";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShareBooks - Marketplace de Livros Didáticos",
  description:
    "Compre, venda ou doe livros didáticos usados na sua comunidade escolar.",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
    shortcut: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className} suppressHydrationWarning={true}>
        {children}
        {/* Inicializa Amplitude no client */}
        <AmplitudeInit />
      </body>
    </html>
  );
}
