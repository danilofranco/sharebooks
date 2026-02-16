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
    .eq("id", params.id)
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
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true });

  // Marcar como lido
  await (supabase as any)
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", params.id)
    .neq("sender_id", user.id)
    .is("read_at", null);

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
