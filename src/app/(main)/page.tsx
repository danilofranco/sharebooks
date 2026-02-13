import Link from "next/link";
import Image from "next/image";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/listings/listing-card";
import { Search, BookOpen, MessageCircle } from "lucide-react";
import type { ListingWithPhotos } from "@/lib/types/database";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();

  const { data: recentListings } = await supabase
    .from("listings")
    .select("*, listing_photos (id, url, path, sort_order)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-accent-50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <Image
            src="/logo.jpg"
            alt="ShareBooks"
            width={220}
            height={60}
            className="mx-auto mb-6 h-14 w-auto"
            priority
          />
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
            Livros didáticos que{" "}
            <span className="text-brand-600">conectam</span>
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            Compre, venda ou doe livros escolares usados na sua comunidade.
            Economize dinheiro e ajude outros estudantes.
          </p>

          {/* Search bar */}
          <form action="/listings" method="GET" className="mx-auto max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="q"
                placeholder="Buscar livro, escola ou matéria..."
                className="w-full rounded-full border-2 border-brand-200 bg-white py-4 pl-12 pr-32 text-base shadow-sm focus:border-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Buscar
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500">
            <Link
              href="/listings?deal_type=donation"
              className="rounded-full border border-accent-300 bg-accent-50 px-4 py-1.5 text-accent-700 hover:bg-accent-100"
            >
              Doações
            </Link>
            <Link
              href="/listings?grade=6º+ano"
              className="rounded-full bg-white px-4 py-1.5 shadow-sm hover:shadow"
            >
              6º ano
            </Link>
            <Link
              href="/listings?grade=1º+EM"
              className="rounded-full bg-white px-4 py-1.5 shadow-sm hover:shadow"
            >
              1º EM
            </Link>
            <Link
              href="/listings?sort=price_asc"
              className="rounded-full bg-white px-4 py-1.5 shadow-sm hover:shadow"
            >
              Mais baratos
            </Link>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold">
            Como funciona
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                icon: BookOpen,
                title: "Anuncie",
                desc: "Cadastre seus livros usados em poucos minutos. Adicione fotos e defina o preço.",
                color: "bg-brand-100 text-brand-600",
              },
              {
                icon: Search,
                title: "Encontre",
                desc: "Busque por escola, série ou título. Filtre por preço e localização.",
                color: "bg-gray-100 text-gray-700",
              },
              {
                icon: MessageCircle,
                title: "Combine",
                desc: "Converse com o vendedor pelo chat e combinem a entrega ou retirada.",
                color: "bg-accent-100 text-accent-700",
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div
                  className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${step.color}`}
                >
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recentes */}
      {recentListings && recentListings.length > 0 && (
        <section className="bg-gray-50 px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Adicionados recentemente</h2>
              <Link
                href="/listings"
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(recentListings as ListingWithPhotos[]).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-4 py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">
          Tem livros parados em casa?
        </h2>
        <p className="mb-6 text-gray-500">
          Anuncie grátis e ajude outro estudante a economizar.
        </p>
        <Link href="/listings/new" className="btn-primary text-base px-8 py-3">
          Anunciar agora
        </Link>
      </section>
    </div>
  );
}
