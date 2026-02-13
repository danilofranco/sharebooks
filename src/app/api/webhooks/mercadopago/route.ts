import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPayment, mapMPStatus } from "@/lib/mercadopago";
import { secLog } from "@/lib/security-logger";
import { createHmac } from "crypto";

/**
 * Verifica assinatura HMAC do webhook MercadoPago.
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
function verifyWebhookSignature(
  request: Request,
  dataId: string,
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  // Se não configurou secret, aceita (dev/sandbox)
  if (!secret) return true;

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  if (!xSignature || !xRequestId) return false;

  // Parse ts e v1 do header x-signature
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );

  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  // Template de assinatura do MP
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  return expected === hash;
}

/**
 * POST /api/webhooks/mercadopago
 *
 * Webhook do MercadoPago — recebe notificações de pagamento.
 *
 * Segurança (OWASP A08):
 * 1. Verifica assinatura HMAC do webhook
 * 2. Consulta API real do MP (nunca confia no payload)
 * 3. Não regride status de order
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // MercadoPago envia diferentes tipos de notificação.
    // Nos interessa apenas "payment".
    const topic = body.type || body.topic;
    const dataId = body.data?.id || body.id;

    // Ignora notificações que não são de pagamento
    if (topic !== "payment" && topic !== "payment.updated") {
      return NextResponse.json({ ignored: true });
    }

    if (!dataId) {
      secLog("webhook_invalid", { reason: "missing_data_id", topic });
      return NextResponse.json({ error: "Sem ID de pagamento" }, { status: 400 });
    }

    // ── Verificar assinatura HMAC (OWASP A08) ──
    if (!verifyWebhookSignature(request, String(dataId))) {
      secLog("webhook_signature_failed", { dataId: String(dataId) });
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 403 });
    }

    // ── Consultar pagamento real na API do MP ──
    // Isso é o passo de segurança principal: nunca confiar apenas no payload
    let payment;
    try {
      payment = await getPayment(String(dataId));
    } catch (err) {
      console.error("MP getPayment failed:", err);
      // Retorna 200 mesmo assim para o MP não ficar retentando
      return NextResponse.json({ error: "Falha ao consultar pagamento" });
    }

    const orderId = payment.external_reference;
    if (!orderId) {
      console.warn("Webhook MP: sem external_reference", payment.id);
      return NextResponse.json({ ignored: true });
    }

    // ── Mapear status ──
    const newStatus = mapMPStatus(payment.status);

    const supabase = createAdminClient();

    // Buscar order
    const { data: order } = await supabase
      .from("orders")
      .select("id, listing_id, seller_id, seller_amount_cents, status")
      .eq("id", orderId)
      .single();

    if (!order) {
      console.warn("Webhook MP: order não encontrada", orderId);
      return NextResponse.json({ ignored: true });
    }

    // Não regredir status (ex: de paid para pending_payment)
    const statusOrder = ["created", "pending_payment", "paid", "completed"];
    const currentIdx = statusOrder.indexOf(order.status);
    const newIdx = statusOrder.indexOf(newStatus);
    // Permite cancelado/refunded de qualquer estado
    const isTerminal = ["canceled", "refunded"].includes(newStatus);

    if (!isTerminal && newIdx <= currentIdx) {
      return NextResponse.json({ ignored: true, reason: "status_not_advanced" });
    }

    // ── Atualizar order ──
    await supabase
      .from("orders")
      .update({
        status: newStatus,
        provider_payment_id: String(payment.id),
      })
      .eq("id", order.id);

    // ── Ações pós-pagamento ──
    if (newStatus === "paid") {
      // Pausar listing para evitar dupla venda
      await supabase
        .from("listings")
        .update({ status: "paused" })
        .eq("id", order.listing_id);

      // Criar payout pendente (repasse manual no MVP)
      const { data: existingPayout } = await supabase
        .from("payouts")
        .select("id")
        .eq("order_id", order.id)
        .single();

      if (!existingPayout) {
        await supabase.from("payouts").insert({
          order_id: order.id,
          seller_id: order.seller_id,
          amount_cents: order.seller_amount_cents,
          status: "pending",
        });
      }
    }

    if (newStatus === "canceled" || newStatus === "refunded") {
      // Se cancelou/reembolsou, reativar listing
      await supabase
        .from("listings")
        .update({ status: "active" })
        .eq("id", order.listing_id);
    }

    secLog("payment_confirmed", {
      orderId: order.id,
      paymentId: payment.id,
      mpStatus: payment.status,
      internalStatus: newStatus,
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    secLog("webhook_invalid", { error: String(err) });
    // Retorna 200 para evitar retentativas infinitas do MP
    return NextResponse.json({ error: "Erro interno" });
  }
}
