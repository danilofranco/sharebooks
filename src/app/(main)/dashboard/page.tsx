import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Plus, MessageCircle, BookOpen } from "lucide-react";
import { STATUSES } from "@/lib/constants";
import { formatPrice, timeAgo } from "@/lib/utils";

export const metadata = { title: "Painel — ShareBooks" };

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirectTo=/dashboard");

  // Meus anúncios
  const { data: listings } = await supabase
    .from("listings")
    .select("*, listing_photos (url, sort_order)")
    .eq("user_id", user.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  // Minhas conversas
  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      `
      *,
      listings!listing_id (id, title, listing_photos (url)),
      buyer:profiles!buyer_id (id, full_name),
      seller:profiles!seller_id (id, full_name)
    `,
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  // Contar mensagens não lidas
  const { count: unreadCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .neq("sender_id", user.id)
    .is("read_at", null)
    .in(
      "conversation_id",
      (conversations || []).map((c) => c.id),
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meu Painel</h1>
        <Link href="/listings/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Novo anúncio
        </Link>
      </div>

      {/* Meus anúncios */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="h-5 w-5" />
          Meus anúncios ({listings?.length || 0})
        </h2>
        {!listings || listings.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            Você ainda não tem anúncios.{" "}
            <Link href="/listings/new" className="text-brand-600 underline">
              Criar primeiro anúncio
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => {
              const photo = listing.listing_photos?.sort(
                (a: any, b: any) => a.sort_order - b.sort_order,
              )[0];
              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="card flex items-center gap-4 p-4 transition-colors hover:bg-gray-50"
                >
                  {photo ? (
                    <img
                      src={photo.url}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                      Sem foto
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{listing.title}</p>
                    <p className="text-sm text-gray-500">
                      {listing.school_name} · {listing.grade}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`badge text-xs ${
                          listing.status === "active"
                            ? "bg-green-100 text-green-700"
                            : listing.status === "paused"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUSES[listing.status as keyof typeof STATUSES]}
                      </span>
                      <span className="text-sm font-semibold text-brand-600">
                        {formatPrice(listing.price_cents)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {timeAgo(listing.created_at)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Conversas */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <MessageCircle className="h-5 w-5" />
          Conversas ({conversations?.length || 0})
          {unreadCount ? (
            <span className="badge bg-red-500 text-white">
              {unreadCount} não lida{unreadCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </h2>
        {!conversations || conversations.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            Nenhuma conversa ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv: any) => {
              const other =
                conv.buyer_id === user.id ? conv.seller : conv.buyer;
              const photo = conv.listings?.listing_photos?.[0]?.url;
              return (
                <Link
                  key={conv.id}
                  href={`/conversations/${conv.id}`}
                  className="card flex items-center gap-4 p-4 transition-colors hover:bg-gray-50"
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {conv.listings?.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      Com {other?.full_name || "Usuário"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {timeAgo(conv.updated_at)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
