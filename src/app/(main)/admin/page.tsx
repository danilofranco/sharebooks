import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminListings } from "@/components/admin/admin-listings";
import type { Profile } from "@/lib/types/database";

export const metadata = { title: "Admin — ShareBooks" };

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: Pick<Profile, "role"> | null };

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: listings } = await supabase
    .from("listings")
    .select("*, listing_photos (url, sort_order), profiles!user_id (full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Generate signed URLs for listings images if needed
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const listArr = (listings as any[]) || [];
    await Promise.all(
      listArr.map(async (l) => {
        const photos = l.listing_photos || [];
        if (!photos.length) return;
        const first = photos.sort((a: any, b: any) => a.sort_order - b.sort_order)[0];
        if (!first) return;
        if (first.url && (first.url.includes("token=") || first.url.includes("X-Amz-Signature"))) return;
        let pathToUse = first.path || null;
        if (!pathToUse && first.url) {
          try {
            const parsed = new URL(first.url);
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
          if (!error && signed?.signedUrl) first.url = signed.signedUrl;
        } catch (e) {}
      }),
    );
  } catch (e) {}

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-red-600">Painel Admin</h1>
      <AdminListings listings={(listings as any) || []} />
    </div>
  );
}
