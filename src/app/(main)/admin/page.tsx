import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminListings } from "@/components/admin/admin-listings";

export const metadata = { title: "Admin — ShareBooks" };

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: listings } = await supabase
    .from("listings")
    .select("*, listing_photos (url, sort_order), profiles!user_id (full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-red-600">Painel Admin</h1>
      <AdminListings listings={(listings as any) || []} />
    </div>
  );
}
