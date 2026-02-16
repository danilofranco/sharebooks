import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ListingDetail } from "@/components/listings/listing-detail";

import type { ListingWithPhotos } from "@/lib/types/database";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data } = (await supabase
    .from("listings")
    .select("title, school_name")
    .eq("id", params.id)
    .single()) as { data: Pick<ListingWithPhotos, "title" | "school_name"> | null };

  return {
    title: data ? `${data.title} — ${data.school_name} | ShareBooks` : "ShareBooks",
  };
}

export default async function ListingPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerSupabaseClient();
  // params pode ser uma Promise em alguns contexts — unwrappamos com segurança
  const resolvedParams = (params as any) && typeof (params as any).then === "function" ? await params : params;
  const listingId = (resolvedParams as any).id;

  // Incrementar views (try/catch, evitar usar .catch() após await)
  try {
    await (supabase as any).rpc("increment_views", { listing_id: listingId });
  } catch {
    // ignore
  }

  const { data: listing } = await (supabase as any)
    .from("listings")
    .select(
      `
      *,
      listing_photos (id, url, path, sort_order),
      profiles!user_id (id, full_name, location_text)
    `,
    )
    .eq("id", listingId)
    .neq("status", "removed")
    .single();

  if (!listing) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ListingDetail listing={listing as any} currentUserId={user?.id ?? null} />
    </div>
  );
}
