/**
 * Rate limiting in-memory simples para API routes.
 * Em produção, substituir por Redis/Upstash.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Limpa entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

type RateLimitConfig = {
  /** Janela em segundos */
  windowSec: number;
  /** Máximo de requests na janela */
  maxRequests: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowSec * 1000 });
    return { allowed: true, remaining: config.maxRequests - 1, retryAfterSec: 0 };
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    retryAfterSec: 0,
  };
}

// ─── Presets ─────────────────────────────────────────────────
export const RATE_LIMITS = {
  /** Login/signup: 5 tentativas por minuto */
  auth: { windowSec: 60, maxRequests: 5 },
  /** Mensagens: 30 por minuto */
  messages: { windowSec: 60, maxRequests: 30 },
  /** Criação de listing: 10 por hora */
  createListing: { windowSec: 3600, maxRequests: 10 },
  /** API genérica: 60 por minuto */
  api: { windowSec: 60, maxRequests: 60 },
} as const;

// ─── Anti-spam para mensagens ────────────────────────────────
const recentMessages = new Map<string, { body: string; at: number }>();

/**
 * Bloqueia mensagens idênticas repetidas em sequência (< 10s apart).
 */
export function isSpamMessage(userId: string, body: string): boolean {
  const key = `msg:${userId}`;
  const recent = recentMessages.get(key);
  const now = Date.now();

  if (recent && recent.body === body && now - recent.at < 10_000) {
    return true;
  }

  recentMessages.set(key, { body, at: now });
  return false;
}
