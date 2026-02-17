import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ChatRoom } from "@/components/chat/chat-room";
import type { Conversation } from "@/lib/types/database";

export const metadata = { title: "Conversa — ShareBooks" };

export default async function ConversationPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const resolvedParams = (params as any) && typeof (params as any).then === "function" ? await params : params;
  const convoId = (resolvedParams as any).id;

  const { data: conversation } = (await supabase
    .from("conversations")
    .select(
      `
      *,
      listings!listing_id (id, title, status, listing_photos (url)),
      buyer:profiles!buyer_id (id, full_name),
      seller:profiles!seller_id (id, full_name)
    `,
    )
    .eq("id", convoId)
    .single()) as { data: Conversation | null };

  if (!conversation) notFound();

  // Verificar se é participante
  if (
    conversation.buyer_id !== user.id &&
    conversation.seller_id !== user.id
  ) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", convoId)
    .order("created_at", { ascending: true });

  // Marcar como lido
  await (supabase as any)
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", convoId)
    .neq("sender_id", user.id)
    .is("read_at", null);

  // Generate signed URL for listing photo if needed
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const listing = (conversation as any).listings;
    const photo = listing?.listing_photos?.[0];
    if (photo && !(photo.url && (photo.url.includes("token=") || photo.url.includes("X-Amz-Signature")))) {
      let pathToUse = photo.path || null;
      if (!pathToUse && photo.url) {
        try {
          const parsed = new URL(photo.url);
          const m = parsed.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (m && m[1]) pathToUse = decodeURIComponent(m[1]);
        } catch (e) {}
      }
      if (pathToUse) {
        try {
          const { data: signed, error } = await (admin as any)
            .storage
            .from("listing-photos")
            .createSignedUrl(pathToUse, 60);
          if (!error && signed?.signedUrl) photo.url = signed.signedUrl;
        } catch (e) {}
      }
    }
  } catch (e) {}
  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <ChatRoom
        conversation={conversation as any}
        initialMessages={messages || []}
        currentUserId={user.id}
      />
    </div>
  );
}
