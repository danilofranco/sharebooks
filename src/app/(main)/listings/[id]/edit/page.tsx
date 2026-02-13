import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/listings/listing-form";

export const metadata = { title: "Editar Anúncio — ShareBooks" };

export default async function EditListingPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const { data: listing } = await supabase
    .from("listings")
    .select("*, listing_photos (*)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Editar anúncio</h1>
      <ListingForm userId={user.id} listing={listing as any} />
    </div>
  );
}
