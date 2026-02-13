/**
 * Validação e sanitização de inputs — OWASP ASVS L1
 */

// ─── Sanitização ────────────────────────────────────────────
/** Remove tags HTML para prevenir XSS stored */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/** Sanitiza texto genérico: strip HTML + limita tamanho */
export function sanitizeText(input: string, maxLength = 500): string {
  return stripHtml(input).slice(0, maxLength);
}

/** Sanitiza body de mensagem */
export function sanitizeMessage(body: string): string {
  return stripHtml(body).slice(0, 2000);
}

// ─── Validação de senha (OWASP) ─────────────────────────────
export type PasswordCheck = {
  valid: boolean;
  errors: string[];
};

export function validatePassword(password: string): PasswordCheck {
  const errors: string[] = [];

  if (password.length < 10) {
    errors.push("Mínimo de 10 caracteres");
  }
  if (password.length > 128) {
    errors.push("Máximo de 128 caracteres");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Inclua uma letra minúscula");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Inclua uma letra maiúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Inclua um número");
  }

  return { valid: errors.length === 0, errors };
}

// ─── Validação de upload ─────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export type UploadCheck = {
  valid: boolean;
  error?: string;
};

export function validateUpload(file: File): UploadCheck {
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return { valid: false, error: "Apenas JPG, PNG ou WebP" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Arquivo excede 5 MB" };
  }
  return { valid: true };
}

export function validateUploads(files: File[], maxCount = 5): UploadCheck {
  if (files.length > maxCount) {
    return { valid: false, error: `Máximo de ${maxCount} fotos` };
  }
  for (const file of files) {
    const check = validateUpload(file);
    if (!check.valid) return check;
  }
  return { valid: true };
}

// ─── Validação de campos do listing ──────────────────────────
export type FieldError = Record<string, string>;

export function validateListingFields(data: {
  title: string;
  school_name: string;
  grade: string;
  condition: string;
  deal_type: string;
  price?: string;
}): FieldError {
  const errors: FieldError = {};

  if (!data.title.trim() || data.title.length < 3) {
    errors.title = "Título precisa ter pelo menos 3 caracteres";
  }
  if (data.title.length > 200) {
    errors.title = "Título muito longo (máx 200)";
  }
  if (!data.school_name.trim()) {
    errors.school_name = "Escola é obrigatória";
  }
  if (data.school_name.length > 200) {
    errors.school_name = "Nome da escola muito longo (máx 200)";
  }
  if (!data.grade) {
    errors.grade = "Série é obrigatória";
  }
  if (!["new", "good", "marked"].includes(data.condition)) {
    errors.condition = "Estado inválido";
  }
  if (!["sale", "donation"].includes(data.deal_type)) {
    errors.deal_type = "Tipo inválido";
  }
  if (data.deal_type === "sale") {
    const price = parseFloat(data.price || "0");
    if (isNaN(price) || price <= 0) {
      errors.price = "Preço obrigatório para venda";
    }
    if (price > 99999) {
      errors.price = "Preço muito alto";
    }
  }

  return errors;
}

// ─── Anti-enumeração (mensagens genéricas) ───────────────────
export const AUTH_ERROR_GENERIC = "Email ou senha incorretos.";
export const SIGNUP_ERROR_GENERIC = "Não foi possível criar a conta. Tente novamente.";
