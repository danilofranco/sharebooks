"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateListingFields, sanitizeText, stripHtml } from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { secLog } from "@/lib/security-logger";

/**
 * Server Action: Criar listing.
 * Toda validação e sanitização acontece server-side.
 * O client nunca insere direto no Supabase.
 */
export async function createListing(formData: {
  title: string;
  school_name: string;
  grade: string;
  subject?: string;
  publisher?: string;
  edition?: string;
  condition: string;
  deal_type: string;
  price?: string;
  location_text?: string;
  delivery_method: string;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado", status: 401 };
  }

  // Rate limit
  const rl = checkRateLimit(`listing:create:${user.id}`, RATE_LIMITS.createListing);
  if (!rl.allowed) {
    secLog("rate_limit_hit", { userId: user.id, action: "createListing" });
    return { error: "Muitas tentativas. Aguarde.", status: 429 };
  }

  // Validar campos server-side
  const fieldErrors = validateListingFields({
    title: formData.title,
    school_name: formData.school_name,
    grade: formData.grade,
    condition: formData.condition,
    deal_type: formData.deal_type,
    price: formData.price,
  });

  if (Object.keys(fieldErrors).length > 0) {
    secLog("validation_failed", { userId: user.id, action: "createListing", errors: fieldErrors });
    return { error: "Dados inválidos", fieldErrors, status: 400 };
  }

  // Sanitizar server-side (defesa em profundidade — mesmo que o client já sanitize)
  const priceCents =
    formData.deal_type === "sale" && formData.price
      ? Math.round(parseFloat(formData.price) * 100)
      : null;

  // Validar que preço é positivo e razoável
  if (priceCents !== null && (priceCents <= 0 || priceCents > 9999900)) {
    return { error: "Preço inválido", status: 400 };
  }

  const payload = {
    user_id: user.id,
    title: sanitizeText(formData.title, 200),
    school_name: sanitizeText(formData.school_name, 200),
    grade: stripHtml(formData.grade).slice(0, 50),
    subject: formData.subject ? sanitizeText(formData.subject, 100) : null,
    publisher: formData.publisher ? sanitizeText(formData.publisher, 100) : null,
    edition: formData.edition ? sanitizeText(formData.edition, 50) : null,
    condition: formData.condition,
    deal_type: formData.deal_type,
    price_cents: priceCents,
    location_text: formData.location_text
      ? sanitizeText(formData.location_text, 200)
      : null,
    delivery_method: formData.delivery_method,
  };

  const { data, error } = await supabase
    .from("listings")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    secLog("db_error", { userId: user.id, action: "createListing", error: error.message });
    return { error: "Erro ao criar anúncio", status: 500 };
  }

  secLog("listing_created", { userId: user.id, listingId: data.id });
  return { id: data.id };
}

/**
 * Server Action: Atualizar listing.
 */
export async function updateListing(
  listingId: string,
  formData: {
    title: string;
    school_name: string;
    grade: string;
    subject?: string;
    publisher?: string;
    edition?: string;
    condition: string;
    deal_type: string;
    price?: string;
    location_text?: string;
    delivery_method: string;
  },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado", status: 401 };
  }

  // UUID format check (previne injection no ID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(listingId)) {
    return { error: "ID inválido", status: 400 };
  }

  // Verificar ownership server-side (RLS já protege, mas explícito é melhor)
  const { data: existing } = await supabase
    .from("listings")
    .select("id, user_id")
    .eq("id", listingId)
    .single();

  if (!existing) {
    return { error: "Anúncio não encontrado", status: 404 };
  }

  if (existing.user_id !== user.id) {
    secLog("unauthorized_access", {
      userId: user.id,
      action: "updateListing",
      targetId: listingId,
    });
    return { error: "Sem permissão", status: 403 };
  }

  // Validar
  const fieldErrors = validateListingFields({
    title: formData.title,
    school_name: formData.school_name,
    grade: formData.grade,
    condition: formData.condition,
    deal_type: formData.deal_type,
    price: formData.price,
  });

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Dados inválidos", fieldErrors, status: 400 };
  }

  const priceCents =
    formData.deal_type === "sale" && formData.price
      ? Math.round(parseFloat(formData.price) * 100)
      : null;

  if (priceCents !== null && (priceCents <= 0 || priceCents > 9999900)) {
    return { error: "Preço inválido", status: 400 };
  }

  const payload = {
    title: sanitizeText(formData.title, 200),
    school_name: sanitizeText(formData.school_name, 200),
    grade: stripHtml(formData.grade).slice(0, 50),
    subject: formData.subject ? sanitizeText(formData.subject, 100) : null,
    publisher: formData.publisher ? sanitizeText(formData.publisher, 100) : null,
    edition: formData.edition ? sanitizeText(formData.edition, 50) : null,
    condition: formData.condition,
    deal_type: formData.deal_type,
    price_cents: priceCents,
    location_text: formData.location_text
      ? sanitizeText(formData.location_text, 200)
      : null,
    delivery_method: formData.delivery_method,
  };

  const { error } = await supabase
    .from("listings")
    .update(payload)
    .eq("id", listingId);

  if (error) {
    secLog("db_error", { userId: user.id, action: "updateListing", error: error.message });
    return { error: "Erro ao atualizar anúncio", status: 500 };
  }

  secLog("listing_updated", { userId: user.id, listingId });
  return { id: listingId };
}
