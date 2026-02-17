import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LISTINGS_PER_PAGE } from "@/lib/constants";
import { ListingCard } from "@/components/listings/listing-card";
import { SearchFilters } from "@/components/listings/search-filters";
import type { ListingWithPhotos } from "@/lib/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Buscar Livros — ShareBooks" };

type SearchParams = {
  q?: string;
  school?: string;
  grade?: string;
  condition?: string;
  deal_type?: string;
  min_price?: string;
  max_price?: string;
  location?: string;
  sort?: string;
  page?: string;
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createServerSupabaseClient();
  // Unwrap searchParams if it's a Promise in this runtime
  const resolvedSearchParams = (searchParams as any) && typeof (searchParams as any).then === "function"
    ? await searchParams
    : searchParams;
  const page = Math.max(1, parseInt((resolvedSearchParams.page as string) || "1"));
  const from = (page - 1) * LISTINGS_PER_PAGE;
  const to = from + LISTINGS_PER_PAGE - 1;

  let query = supabase
    .from("listings")
    .select("*, listing_photos (id, url, path, sort_order)", { count: "exact" })
    .eq("status", "active");

  // Filtros
  if (resolvedSearchParams.q) {
    query = query.or(
      `title.ilike.%${resolvedSearchParams.q}%,school_name.ilike.%${resolvedSearchParams.q}%`,
    );
  }
  if (resolvedSearchParams.school) {
    query = query.ilike("school_name", `%${resolvedSearchParams.school}%`);
  }
  if (resolvedSearchParams.grade) {
    query = query.eq("grade", resolvedSearchParams.grade);
  }
  if (resolvedSearchParams.condition) {
    query = query.eq("condition", resolvedSearchParams.condition);
  }
  if (resolvedSearchParams.deal_type) {
    query = query.eq("deal_type", resolvedSearchParams.deal_type);
  }
  if (resolvedSearchParams.min_price) {
    query = query.gte("price_cents", parseInt(resolvedSearchParams.min_price) * 100);
  }
  if (resolvedSearchParams.max_price) {
    query = query.lte("price_cents", parseInt(resolvedSearchParams.max_price) * 100);
  }
  if (resolvedSearchParams.location) {
    query = query.ilike("location_text", `%${resolvedSearchParams.location}%`);
  }

  // Ordenação
  switch (searchParams.sort) {
    case "price_asc":
      query = query.order("price_cents", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("price_cents", { ascending: false, nullsFirst: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data: listings, count } = await query.range(from, to);

  // If storage is private, generate signed URLs server-side for the first photo of each listing
  try {
    if (listings && listings.length > 0) {
      const admin = createAdminClient();
      await Promise.all(
        (listings as ListingWithPhotos[]).map(async (l) => {
          const photos = l.listing_photos || [];
          if (photos.length === 0) return;
          const first = photos.sort((a, b) => a.sort_order - b.sort_order)[0];
          // Determine storage path: prefer explicit `path`, fallback to extracting from public URL
          let pathToUse: string | null = null;
          if (first.path) {
            pathToUse = first.path;
          } else if (first.url && typeof first.url === "string") {
            try {
              // If URL already looks signed, skip
              if (first.url.includes("token=") || first.url.includes("X-Amz-Signature")) {
                return;
              }
              const parsed = new URL(first.url);
              const m = parsed.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
              if (m && m[1]) {
                pathToUse = decodeURIComponent(m[1]);
              }
            } catch (e) {
              // ignore parse errors
            }
          }

          if (!pathToUse) return;

          try {
            const { data: signed, error } = await (admin as any)
              .storage
              .from("listing-photos")
              .createSignedUrl(pathToUse, 60);
            if (!error && signed?.signedUrl) {
              first.url = signed.signedUrl;
            }
          } catch (e) {
            // ignore per-image errors
          }
        }),
      );
    }
  } catch (err) {
    // fail silently; images will try to use original URL
  }
  const totalPages = Math.ceil((count || 0) / LISTINGS_PER_PAGE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">Buscar livros</h1>

      <SearchFilters searchParams={searchParams} />

      {!listings || listings.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          Nenhum livro encontrado. Tente ajustar os filtros.
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">
            {count} resultado{count !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(listings as ListingWithPhotos[]).map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const params = new URLSearchParams(
                  resolvedSearchParams as Record<string, string>,
                );
                params.set("page", p.toString());
                return (
                  <a
                    key={p}
                    href={`/listings?${params.toString()}`}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      p === page
                        ? "bg-brand-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </a>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
