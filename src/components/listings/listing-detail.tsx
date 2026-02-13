"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Eye,
  MessageCircle,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Tag,
  Pause,
  Play,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CONDITIONS, DEAL_TYPES, STATUSES } from "@/lib/constants";
import { formatPrice, timeAgo } from "@/lib/utils";
import type { ListingWithPhotos } from "@/lib/types/database";

type Props = {
  listing: ListingWithPhotos;
  currentUserId: string | null;
};

export function ListingDetail({ listing, currentUserId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [sendingMsg, setSendingMsg] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  const photos = listing.listing_photos.sort((a, b) => a.sort_order - b.sort_order);
  const isOwner = currentUserId === listing.user_id;
  const profile = listing.profiles;

  // Touch swipe para galeria mobile
  const [touchStart, setTouchStart] = useState(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setPhotoIdx((i) => Math.min(i + 1, photos.length - 1));
      else setPhotoIdx((i) => Math.max(i - 1, 0));
    }
  };

  const handleContact = async () => {
    if (!currentUserId) {
      router.push(`/auth/sign-in?redirectTo=/listings/${listing.id}`);
      return;
    }
    setSendingMsg(true);

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", currentUserId)
      .eq("seller_id", listing.user_id)
      .single();

    if (existing) {
      router.push(`/conversations/${existing.id}`);
      return;
    }

    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        listing_id: listing.id,
        buyer_id: currentUserId,
        seller_id: listing.user_id,
      })
      .select("id")
      .single();

    if (error) {
      alert("Erro ao iniciar conversa.");
      setSendingMsg(false);
      return;
    }

    router.push(`/conversations/${conv.id}`);
  };

  // Compra via MercadoPago
  const [buying, setBuying] = useState(false);

  const handleBuy = async () => {
    if (!currentUserId) {
      router.push(`/auth/sign-in?redirectTo=/listings/${listing.id}`);
      return;
    }
    setBuying(true);
    try {
      const res = await fetch("/api/payments/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listing.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erro ao iniciar pagamento");
        setBuying(false);
        return;
      }
      // Redireciona para o checkout do MercadoPago
      window.location.href = data.checkout_url;
    } catch {
      alert("Erro ao iniciar pagamento");
      setBuying(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await supabase
      .from("listings")
      .update({ status: newStatus })
      .eq("id", listing.id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Galeria com swipe */}
      {photos.length > 0 && (
        <div
          ref={galleryRef}
          className="relative overflow-hidden rounded-xl bg-gray-100"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="aspect-[4/3] relative">
            <Image
              src={photos[photoIdx].url}
              alt={listing.title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 800px"
              priority
            />
          </div>
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIdx((i) => Math.max(0, i - 1))}
                disabled={photoIdx === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPhotoIdx((i) => Math.min(photos.length - 1, i + 1))}
                disabled={photoIdx === photos.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              {/* Indicador */}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === photoIdx ? "w-4 bg-white" : "w-2 bg-white/50"
                    }`}
                  />
                ))}
              </div>
              {/* Counter */}
              <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-0.5 text-xs text-white">
                {photoIdx + 1}/{photos.length}
              </span>
            </>
          )}
        </div>
      )}

      {/* Info + Sidebar */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`badge ${
                listing.deal_type === "donation"
                  ? "bg-accent-100 text-accent-700"
                  : "bg-brand-100 text-brand-700"
              }`}
            >
              {DEAL_TYPES[listing.deal_type]}
            </span>
            <span className="badge bg-gray-100 text-gray-700">
              {CONDITIONS[listing.condition]}
            </span>
            {listing.status !== "active" && (
              <span className="badge bg-yellow-100 text-yellow-700">
                {STATUSES[listing.status]}
              </span>
            )}
          </div>

          {/* Título + Preço */}
          <div>
            <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
            <p className="mt-2 text-3xl font-bold text-brand-600">
              {formatPrice(listing.price_cents)}
            </p>
          </div>

          {/* Detalhes em grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-400">Escola</p>
              <p className="font-medium">{listing.school_name}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-400">Série</p>
              <p className="font-medium">{listing.grade}</p>
            </div>
            {listing.subject && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Matéria</p>
                <p className="font-medium">{listing.subject}</p>
              </div>
            )}
            {listing.publisher && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Editora</p>
                <p className="font-medium">{listing.publisher}</p>
              </div>
            )}
            {listing.edition && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Edição</p>
                <p className="font-medium">{listing.edition}</p>
              </div>
            )}
            {listing.location_text && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Local</p>
                <p className="flex items-center gap-1 font-medium">
                  <MapPin className="h-3 w-3" />
                  {listing.location_text}
                </p>
              </div>
            )}
          </div>

          <p className="flex items-center gap-1 text-xs text-gray-400">
            <Eye className="h-3 w-3" />
            {listing.views_count} visualizações · publicado {timeAgo(listing.created_at)}
          </p>
        </div>

        {/* Sidebar — desktop */}
        <div className="hidden space-y-3 md:block">
          <div className="card sticky top-20 p-4 space-y-3">
            {profile && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
                  {(profile.full_name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {profile.full_name || "Usuário"}
                  </p>
                  {profile.location_text && (
                    <p className="text-xs text-gray-400">{profile.location_text}</p>
                  )}
                </div>
              </div>
            )}

            {!isOwner && listing.status === "active" && (
              <div className="space-y-2">
                {listing.deal_type === "sale" && listing.price_cents && (
                  <button
                    onClick={handleBuy}
                    disabled={buying}
                    className="btn-primary w-full text-base py-3"
                  >
                    {buying ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-5 w-5" />
                    )}
                    {buying ? "Redirecionando..." : "Comprar agora"}
                  </button>
                )}
                <button
                  onClick={handleContact}
                  disabled={sendingMsg}
                  className="btn-secondary w-full text-base py-3"
                >
                  <MessageCircle className="h-5 w-5" />
                  Enviar mensagem
                </button>
              </div>
            )}

            {isOwner && (
              <>
                <Link
                  href={`/listings/${listing.id}/edit`}
                  className="btn-secondary w-full"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
                {listing.status === "active" && (
                  <>
                    <button
                      onClick={() => handleStatusChange("paused")}
                      className="btn-secondary w-full"
                    >
                      <Pause className="h-4 w-4" />
                      Pausar
                    </button>
                    <button
                      onClick={() =>
                        handleStatusChange(
                          listing.deal_type === "donation" ? "donated" : "sold",
                        )
                      }
                      className="btn-primary w-full"
                    >
                      <Tag className="h-4 w-4" />
                      Marcar como{" "}
                      {listing.deal_type === "donation" ? "doado" : "vendido"}
                    </button>
                  </>
                )}
                {listing.status === "paused" && (
                  <button
                    onClick={() => handleStatusChange("active")}
                    className="btn-primary w-full"
                  >
                    <Play className="h-4 w-4" />
                    Reativar
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── CTA fixo mobile (estilo Airbnb) ─── */}
      {!isOwner && listing.status === "active" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-shrink">
              <p className="text-lg font-bold text-brand-600">
                {formatPrice(listing.price_cents)}
              </p>
              <p className="truncate text-xs text-gray-500">{listing.school_name}</p>
            </div>
            <div className="flex gap-2">
              {listing.deal_type === "sale" && listing.price_cents && (
                <button
                  onClick={handleBuy}
                  disabled={buying}
                  className="btn-primary px-5 py-3"
                >
                  {buying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-4 w-4" />
                  )}
                  Comprar
                </button>
              )}
              <button
                onClick={handleContact}
                disabled={sendingMsg}
                className="btn-secondary px-4 py-3"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isOwner && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-4 py-3 md:hidden">
          <div className="flex gap-2">
            <Link
              href={`/listings/${listing.id}/edit`}
              className="btn-secondary flex-1"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
            {listing.status === "active" && (
              <button
                onClick={() =>
                  handleStatusChange(
                    listing.deal_type === "donation" ? "donated" : "sold",
                  )
                }
                className="btn-primary flex-1"
              >
                <Tag className="h-4 w-4" />
                {listing.deal_type === "donation" ? "Doado" : "Vendido"}
              </button>
            )}
            {listing.status === "paused" && (
              <button
                onClick={() => handleStatusChange("active")}
                className="btn-primary flex-1"
              >
                <Play className="h-4 w-4" />
                Reativar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
