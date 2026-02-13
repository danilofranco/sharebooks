import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/listings/listing-form";

export const metadata = { title: "Novo Anúncio — ShareBooks" };

export default async function NewListingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirectTo=/listings/new");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Criar anúncio</h1>
      <ListingForm userId={user.id} />
    </div>
  );
}
