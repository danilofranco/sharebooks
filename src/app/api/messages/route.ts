import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS, isSpamMessage } from "@/lib/rate-limit";
import { sanitizeMessage } from "@/lib/validation";
import { secLog } from "@/lib/security-logger";

/**
 * POST /api/messages
 *
 * Envia mensagem com rate limiting e anti-spam server-side.
 * Body: { conversation_id: string, body: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Rate limit por user
    const rl = checkRateLimit(`msg:${user.id}`, RATE_LIMITS.messages);
    if (!rl.allowed) {
      secLog("rate_limit_hit", { userId: user.id, action: "sendMessage" });
      return NextResponse.json(
        { error: `Muitas mensagens. Aguarde ${rl.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const { conversation_id, body: rawBody } = await request.json();

    if (!conversation_id || !rawBody) {
      return NextResponse.json(
        { error: "conversation_id e body são obrigatórios" },
        { status: 400 },
      );
    }

    // Sanitizar
    const body = sanitizeMessage(rawBody);
    if (!body.trim()) {
      return NextResponse.json(
        { error: "Mensagem não pode ser vazia" },
        { status: 400 },
      );
    }

    // Anti-spam: bloquear mensagem idêntica repetida
    if (isSpamMessage(user.id, body)) {
      return NextResponse.json(
        { error: "Mensagem duplicada. Aguarde alguns segundos." },
        { status: 429 },
      );
    }

    // Verificar participação na conversa
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id")
      .eq("id", conversation_id)
      .single();

    if (!conv || (conv.buyer_id !== user.id && conv.seller_id !== user.id)) {
      secLog("unauthorized_access", {
        userId: user.id,
        action: "sendMessage",
        conversationId: conversation_id,
      });
      return NextResponse.json(
        { error: "Conversa não encontrada" },
        { status: 404 },
      );
    }

    // Inserir mensagem
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        sender_id: user.id,
        body,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Erro ao enviar mensagem" },
        { status: 500 },
      );
    }

    // Atualizar updated_at da conversa
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return NextResponse.json(message, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 },
    );
  }
}
