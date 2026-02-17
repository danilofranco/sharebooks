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
  const resolvedParams = (params as any) && typeof (params as any).then === "function" ? await params : params;
  const listingId = (resolvedParams as any).id;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const { data: listing } = await supabase
    .from("listings")
    .select("*, listing_photos (*)")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .single();

  if (!listing) notFound();

  // Generate signed URLs for existing photos if bucket is private
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const photos = (listing as any).listing_photos || [];
    await Promise.all(
      (photos as any[]).map(async (p) => {
        if (!p) return;
        if (p.url && (p.url.includes("token=") || p.url.includes("X-Amz-Signature"))) return;
        let pathToUse = p.path || null;
        if (!pathToUse && p.url) {
          try {
            const parsed = new URL(p.url);
            const m = parsed.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
            if (m && m[1]) pathToUse = decodeURIComponent(m[1]);
          } catch (e) {}
        }
        if (!pathToUse) return;
        try {
          const { data: signed, error } = await (admin as any)
            .storage
            .from("listing-photos")
            .createSignedUrl(pathToUse, 60);
          if (!error && signed?.signedUrl) p.url = signed.signedUrl;
        } catch (e) {}
      }),
    );
  } catch (e) {
    // ignore
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Editar anúncio</h1>
      <ListingForm userId={user.id} listing={listing as any} />
    </div>
  );
}
