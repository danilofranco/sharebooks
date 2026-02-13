import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateFee, createPreference } from "@/lib/mercadopago";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { secLog } from "@/lib/security-logger";

/**
 * POST /api/payments/mercadopago/create-preference
 *
 * Cria order + preference no MercadoPago e retorna checkout_url.
 * Body: { listing_id: string }
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

    // Rate limit
    const rl = checkRateLimit(`checkout:${user.id}`, RATE_LIMITS.api);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde." },
        { status: 429 },
      );
    }

    const { listing_id } = await request.json();

    if (!listing_id) {
      return NextResponse.json(
        { error: "listing_id obrigatório" },
        { status: 400 },
      );
    }

    // Buscar listing
    const { data: listing } = await supabase
      .from("listings")
      .select("id, user_id, title, school_name, grade, price_cents, status, deal_type")
      .eq("id", listing_id)
      .eq("status", "active")
      .single();

    if (!listing) {
      return NextResponse.json(
        { error: "Anúncio não encontrado ou indisponível" },
        { status: 404 },
      );
    }

    if (listing.user_id === user.id) {
      return NextResponse.json(
        { error: "Não pode comprar seu próprio anúncio" },
        { status: 400 },
      );
    }

    if (listing.deal_type === "donation" || !listing.price_cents) {
      return NextResponse.json(
        { error: "Doações não passam por checkout" },
        { status: 400 },
      );
    }

    // Verificar se já existe order pendente para esse listing+buyer
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, checkout_url, status")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
      .in("status", ["created", "pending_payment"])
      .single();

    if (existingOrder?.checkout_url) {
      return NextResponse.json({
        checkout_url: existingOrder.checkout_url,
        order_id: existingOrder.id,
      });
    }

    // Calcular comissão
    const { platformFeeCents, sellerAmountCents, feePercent } = calculateFee(
      listing.price_cents,
    );

    // Criar order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.user_id,
        amount_cents: listing.price_cents,
        platform_fee_cents: platformFeeCents,
        seller_amount_cents: sellerAmountCents,
        fee_percent: feePercent,
        status: "created",
        provider: "mercadopago",
      })
      .select("id")
      .single();

    if (orderErr) {
      console.error("Order insert error:", orderErr);
      return NextResponse.json(
        { error: "Erro ao criar pedido" },
        { status: 500 },
      );
    }

    // Criar preference no MercadoPago
    const preference = await createPreference({
      orderId: order.id,
      title: listing.title,
      description: `${listing.school_name} — ${listing.grade}`,
      amountCents: listing.price_cents,
      buyerEmail: user.email,
    });

    // Salvar preference no order
    await supabase
      .from("orders")
      .update({
        provider_preference_id: preference.id,
        checkout_url: preference.init_point,
      })
      .eq("id", order.id);

    secLog("order_created", {
      orderId: order.id,
      listingId: listing.id,
      buyerId: user.id,
      amountCents: listing.price_cents,
    });

    return NextResponse.json({
      checkout_url: preference.init_point,
      order_id: order.id,
    });
  } catch (err) {
    secLog("db_error", { action: "createPreference", error: String(err) });
    return NextResponse.json(
      { error: "Erro ao processar pagamento" },
      { status: 500 },
    );
  }
}
