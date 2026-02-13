import Link from "next/link";
import Image from "next/image";
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
  const photo = listing.listing_photos?.sort(
    (a, b) => a.sort_order - b.sort_order,
  )[0];

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card group overflow-hidden transition-shadow hover:shadow-md"
    >
      {/* Foto */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {photo ? (
          <Image
            src={photo.url}
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
