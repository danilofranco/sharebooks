/**
 * Security Logger — OWASP A09:2025
 *
 * Logging estruturado de eventos de segurança.
 * Em produção, substituir console por serviço externo
 * (Datadog, Sentry, LogTail, etc).
 */

type SecurityEvent =
  | "auth_success"
  | "auth_failure"
  | "rate_limit_hit"
  | "unauthorized_access"
  | "validation_failed"
  | "webhook_invalid"
  | "webhook_signature_failed"
  | "suspicious_activity"
  | "listing_created"
  | "listing_updated"
  | "order_created"
  | "payment_confirmed"
  | "db_error"
  | "file_upload_rejected";

type LogContext = Record<string, unknown>;

export function secLog(event: SecurityEvent, context: LogContext = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level: getSeverity(event),
    event,
    ...sanitizeContext(context),
  };

  // Em produção: enviar para serviço de logging externo
  // Ex: await fetch("https://logs.example.com", { body: JSON.stringify(entry) })
  if (entry.level === "warn" || entry.level === "error") {
    console.warn(`[SEC] ${JSON.stringify(entry)}`);
  } else {
    console.log(`[SEC] ${JSON.stringify(entry)}`);
  }
}

function getSeverity(event: SecurityEvent): "info" | "warn" | "error" {
  switch (event) {
    case "unauthorized_access":
    case "webhook_signature_failed":
    case "suspicious_activity":
      return "error";
    case "rate_limit_hit":
    case "validation_failed":
    case "webhook_invalid":
    case "file_upload_rejected":
    case "auth_failure":
      return "warn";
    default:
      return "info";
  }
}

/**
 * Remove dados sensíveis do contexto de log.
 * Nunca loga senhas, tokens, emails completos, etc.
 */
function sanitizeContext(ctx: LogContext): LogContext {
  const sanitized = { ...ctx };

  // Nunca logar campos sensíveis
  const sensitiveKeys = ["password", "token", "secret", "authorization", "cookie"];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    }
  }

  // Mascarar email se presente
  if (typeof sanitized.email === "string") {
    const [local, domain] = sanitized.email.split("@");
    sanitized.email = `${local?.slice(0, 2)}***@${domain}`;
  }

  // Truncar mensagens de erro longas
  if (typeof sanitized.error === "string" && sanitized.error.length > 200) {
    sanitized.error = sanitized.error.slice(0, 200) + "...";
  }

  return sanitized;
}
