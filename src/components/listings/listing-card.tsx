"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { DEAL_TYPES } from "@/lib/constants";
import { formatPrice, timeAgo } from "@/lib/utils";
import type { ListingWithPhotos } from "@/lib/types/database";

type Props = {
  listing: ListingWithPhotos;
};

/**
 * Hierarquia fixa: Foto → Título → Série/Escola → Preço → Local
 * Inspirado OLX: card simples, preço em destaque
 */
export function ListingCard({ listing }: Props) {
  const firstPhoto = listing.listing_photos?.sort(
    (a, b) => a.sort_order - b.sort_order,
  )[0];
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(firstPhoto?.url);

  useEffect(() => {
    let mounted = true;
    async function ensureSigned() {
      const p = firstPhoto;
      if (!p || !p.url) return;
      if (p.url.includes("token=") || p.url.includes("X-Amz-Signature")) {
        setPhotoUrl(p.url);
        return;
      }
      try {
        const parsed = new URL(p.url);
        const m = parsed.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
        if (!m || !m[1]) {
          setPhotoUrl(p.url);
          return;
        }
        const path = decodeURIComponent(m[1]);
        const res = await fetch(`/api/storage/signed?path=${encodeURIComponent(path)}`);
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          if (json?.signedUrl) setPhotoUrl(json.signedUrl);
          else setPhotoUrl(p.url);
        } else {
          setPhotoUrl(p.url);
        }
      } catch {
        if (mounted) setPhotoUrl(p.url);
      }
    }
    ensureSigned();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstPhoto?.url]);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card group overflow-hidden transition-shadow hover:shadow-md"
    >
      {/* Foto */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {firstPhoto ? (
          <Image
            src={photoUrl || firstPhoto.url}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-300">
            Sem foto
          </div>
        )}

        {/* Badge tipo */}
        <span
          className={`absolute left-2 top-2 badge text-xs shadow-sm ${
            listing.deal_type === "donation"
              ? "bg-accent-500 text-white"
              : "bg-brand-600 text-white"
          }`}
        >
          {DEAL_TYPES[listing.deal_type]}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        {/* Título */}
        <p className="line-clamp-2 text-sm font-semibold leading-tight group-hover:text-brand-600">
          {listing.title}
        </p>

        {/* Série · Escola */}
        <p className="truncate text-xs text-gray-500">
          {listing.grade} · {listing.school_name}
        </p>

        {/* Preço destaque */}
        <p className="text-lg font-bold text-brand-600">
          {formatPrice(listing.price_cents)}
        </p>

        {/* Local + tempo */}
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          {listing.location_text ? (
            <span className="flex items-center gap-0.5 truncate">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {listing.location_text}
            </span>
          ) : (
            <span />
          )}
          <span className="flex-shrink-0">{timeAgo(listing.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
