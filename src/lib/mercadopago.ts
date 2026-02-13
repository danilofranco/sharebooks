/**
 * MercadoPago — Client e helpers para Checkout Pro.
 * Docs: https://www.mercadopago.com.br/developers/pt/reference
 */

const MP_BASE_URL = "https://api.mercadopago.com";

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  return token;
}

// ─── Comissão ────────────────────────────────────────────────

const FEE_PERCENT = parseFloat(process.env.PAYMENT_FEE_PERCENT || "0.10");
const MIN_FEE_CENTS = parseInt(process.env.PAYMENT_MIN_FEE_CENTS || "500", 10);

export function calculateFee(amountCents: number) {
  const rawFee = Math.round(amountCents * FEE_PERCENT);
  const platformFeeCents = Math.max(rawFee, MIN_FEE_CENTS);
  const sellerAmountCents = amountCents - platformFeeCents;

  return {
    platformFeeCents,
    sellerAmountCents,
    feePercent: FEE_PERCENT * 100,
  };
}

// ─── Criar preferência (Checkout Pro) ────────────────────────

export type CreatePreferenceInput = {
  orderId: string;
  title: string;
  description: string;
  amountCents: number;
  buyerEmail?: string;
};

export type PreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point: string;
};

export async function createPreference(
  input: CreatePreferenceInput,
): Promise<PreferenceResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const body = {
    items: [
      {
        id: input.orderId,
        title: input.title,
        description: input.description,
        quantity: 1,
        currency_id: "BRL",
        unit_price: input.amountCents / 100, // MP usa reais, não centavos
      },
    ],
    external_reference: input.orderId,
    ...(input.buyerEmail && {
      payer: { email: input.buyerEmail },
    }),
    back_urls: {
      success: `${appUrl}/payments/success`,
      failure: `${appUrl}/payments/failure`,
      pending: `${appUrl}/payments/pending`,
    },
    auto_return: "approved" as const,
    notification_url: `${appUrl}/api/webhooks/mercadopago`,
    statement_descriptor: "ShareBooks",
  };

  const res = await fetch(`${MP_BASE_URL}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("MP create preference error:", res.status, err);
    throw new Error(`MercadoPago error: ${res.status}`);
  }

  return res.json();
}

// ─── Consultar pagamento (para validar webhook) ─────────────

export type PaymentInfo = {
  id: number;
  status: string; // approved | pending | rejected | cancelled | refunded | in_process
  status_detail: string;
  external_reference: string; // nosso order_id
  transaction_amount: number;
  date_approved: string | null;
};

export async function getPayment(paymentId: string): Promise<PaymentInfo> {
  const res = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error(`MP getPayment error: ${res.status}`);
  }

  return res.json();
}

// ─── Mapear status do MP para nosso status ───────────────────

export function mapMPStatus(
  mpStatus: string,
): "pending_payment" | "paid" | "canceled" | "refunded" {
  switch (mpStatus) {
    case "approved":
      return "paid";
    case "pending":
    case "in_process":
    case "authorized":
      return "pending_payment";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "rejected":
    case "cancelled":
    default:
      return "canceled";
  }
}
