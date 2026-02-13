import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ListingDetail } from "@/components/listings/listing-detail";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("listings")
    .select("title, school_name")
    .eq("id", params.id)
    .single();

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

  // Incrementar views
  await supabase.rpc("increment_views" as any, { listing_id: params.id }).catch(() => {});

  const { data: listing } = await supabase
    .from("listings")
    .select(
      `
      *,
      listing_photos (id, url, path, sort_order),
      profiles!user_id (id, full_name, location_text)
    `,
    )
    .eq("id", params.id)
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
