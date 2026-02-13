"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import type { Message, ConversationWithDetails } from "@/lib/types/database";

type Props = {
  conversation: ConversationWithDetails;
  initialMessages: Message[];
  currentUserId: string;
};

export function ChatRoom({ conversation, initialMessages, currentUserId }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const otherUser =
    currentUserId === conversation.buyer_id
      ? conversation.seller
      : conversation.buyer;

  const listingPhoto = conversation.listings?.listing_photos?.[0]?.url;

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark as read if not sender
          if (newMsg.sender_id !== currentUserId) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMsg.id)
              .then();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, currentUserId]);

  // Enviar via API route (rate limit + anti-spam server-side)
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversation.id,
          body: trimmed,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao enviar.");
        // Limpa erro após 4 segundos
        setTimeout(() => setError(""), 4000);
      } else {
        setBody("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Erro de conexão.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header — estilo WhatsApp */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white pb-3">
        <Link href="/dashboard" className="btn-ghost p-1.5">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {listingPhoto ? (
          <img
            src={listingPhoto}
            alt=""
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-400">
            {(otherUser?.full_name || "U").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {conversation.listings?.title}
          </p>
          <p className="text-xs text-gray-500">
            {otherUser?.full_name || "Usuário"}
          </p>
        </div>
        <Link
          href={`/listings/${conversation.listing_id}`}
          className="text-xs text-brand-600 hover:underline"
        >
          Ver anúncio
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400">
              Nenhuma mensagem ainda.
            </p>
            <p className="text-xs text-gray-300">
              Diga oi para o {currentUserId === conversation.buyer_id ? "vendedor" : "comprador"}!
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? "rounded-br-md bg-brand-600 text-white"
                    : "rounded-bl-md bg-gray-100 text-gray-900"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {msg.body}
                </p>
                <div
                  className={`mt-1 flex items-center gap-1 text-[10px] ${
                    isMine ? "text-brand-200 justify-end" : "text-gray-400"
                  }`}
                >
                  {timeAgo(msg.created_at)}
                  {isMine && msg.read_at && (
                    <span className="ml-1">lido</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-2 mb-2 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Input fixo — estilo WhatsApp */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-gray-200 bg-white px-2 py-3"
      >
        <input
          ref={inputRef}
          className="input flex-1 rounded-full py-3"
          placeholder="Digite sua mensagem..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          autoFocus
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}
