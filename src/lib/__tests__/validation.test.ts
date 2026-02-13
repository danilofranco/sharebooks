import { describe, it, expect } from "vitest";
import {
  stripHtml,
  sanitizeText,
  sanitizeMessage,
  validatePassword,
  validateUpload,
  validateUploads,
  validateListingFields,
} from "../validation";

// ─── stripHtml ──────────────────────────────────────────────

describe("stripHtml", () => {
  it("remove tags HTML simples", () => {
    expect(stripHtml("<b>texto</b>")).toBe("texto");
  });

  it("remove tags aninhadas", () => {
    expect(stripHtml("<div><p>hello</p></div>")).toBe("hello");
  });

  it("remove script tags (XSS)", () => {
    expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it("preserva texto sem HTML", () => {
    expect(stripHtml("texto limpo")).toBe("texto limpo");
  });

  it("faz trim do resultado", () => {
    expect(stripHtml("  espaços  ")).toBe("espaços");
  });
});

// ─── sanitizeText ───────────────────────────────────────────

describe("sanitizeText", () => {
  it("limita comprimento padrão a 500", () => {
    const longText = "a".repeat(600);
    expect(sanitizeText(longText).length).toBe(500);
  });

  it("aceita maxLength customizado", () => {
    expect(sanitizeText("abcdefghij", 5)).toBe("abcde");
  });

  it("remove HTML e limita", () => {
    const input = "<b>" + "x".repeat(100) + "</b>";
    const result = sanitizeText(input, 50);
    expect(result).not.toContain("<");
    expect(result.length).toBeLessThanOrEqual(50);
  });
});

// ─── sanitizeMessage ────────────────────────────────────────

describe("sanitizeMessage", () => {
  it("limita a 2000 caracteres", () => {
    const longMsg = "a".repeat(3000);
    expect(sanitizeMessage(longMsg).length).toBe(2000);
  });

  it("remove HTML de mensagens", () => {
    expect(sanitizeMessage("<img src=x onerror=alert(1)>oi")).toBe("oi");
  });
});

// ─── validatePassword ───────────────────────────────────────

describe("validatePassword", () => {
  it("aceita senha válida", () => {
    const result = validatePassword("SenhaForte123");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejeita senha curta (< 10 chars)", () => {
    const result = validatePassword("Ab1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Mínimo de 10 caracteres");
  });

  it("rejeita senha longa (> 128 chars)", () => {
    const result = validatePassword("A1" + "a".repeat(128));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Máximo de 128 caracteres");
  });

  it("rejeita sem minúscula", () => {
    const result = validatePassword("SENHAFORTE123");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Inclua uma letra minúscula");
  });

  it("rejeita sem maiúscula", () => {
    const result = validatePassword("senhaforte123");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Inclua uma letra maiúscula");
  });

  it("rejeita sem número", () => {
    const result = validatePassword("SenhaForteee");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Inclua um número");
  });

  it("acumula múltiplos erros", () => {
    const result = validatePassword("abc");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── validateUpload ─────────────────────────────────────────

describe("validateUpload", () => {
  const makeFile = (type: string, sizeBytes: number) =>
    new File(["x".repeat(sizeBytes)], "test.jpg", { type });

  it("aceita JPEG válido", () => {
    expect(validateUpload(makeFile("image/jpeg", 1000)).valid).toBe(true);
  });

  it("aceita PNG válido", () => {
    expect(validateUpload(makeFile("image/png", 1000)).valid).toBe(true);
  });

  it("aceita WebP válido", () => {
    expect(validateUpload(makeFile("image/webp", 1000)).valid).toBe(true);
  });

  it("rejeita tipo não permitido", () => {
    const result = validateUpload(makeFile("application/pdf", 1000));
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Apenas JPG, PNG ou WebP");
  });

  it("rejeita arquivo > 5MB", () => {
    const result = validateUpload(makeFile("image/jpeg", 6 * 1024 * 1024));
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Arquivo excede 5 MB");
  });
});

// ─── validateUploads ────────────────────────────────────────

describe("validateUploads", () => {
  const makeFile = () =>
    new File(["x"], "test.jpg", { type: "image/jpeg" });

  it("aceita até 5 arquivos", () => {
    const files = Array.from({ length: 5 }, makeFile);
    expect(validateUploads(files).valid).toBe(true);
  });

  it("rejeita mais de 5 arquivos", () => {
    const files = Array.from({ length: 6 }, makeFile);
    const result = validateUploads(files);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Máximo de 5 fotos");
  });

  it("aceita maxCount customizado", () => {
    const files = Array.from({ length: 3 }, makeFile);
    expect(validateUploads(files, 2).valid).toBe(false);
  });
});

// ─── validateListingFields ──────────────────────────────────

describe("validateListingFields", () => {
  const validData = {
    title: "Livro de Matemática",
    school_name: "Escola ABC",
    grade: "6ano",
    condition: "good",
    deal_type: "sale",
    price: "29.90",
  };

  it("aceita dados válidos", () => {
    expect(Object.keys(validateListingFields(validData))).toHaveLength(0);
  });

  it("rejeita título curto", () => {
    const errors = validateListingFields({ ...validData, title: "ab" });
    expect(errors.title).toBeDefined();
  });

  it("rejeita título longo", () => {
    const errors = validateListingFields({ ...validData, title: "a".repeat(201) });
    expect(errors.title).toBeDefined();
  });

  it("rejeita escola vazia", () => {
    const errors = validateListingFields({ ...validData, school_name: "" });
    expect(errors.school_name).toBeDefined();
  });

  it("rejeita condição inválida", () => {
    const errors = validateListingFields({ ...validData, condition: "invalid" });
    expect(errors.condition).toBeDefined();
  });

  it("rejeita deal_type inválido", () => {
    const errors = validateListingFields({ ...validData, deal_type: "trade" });
    expect(errors.deal_type).toBeDefined();
  });

  it("rejeita venda sem preço", () => {
    const errors = validateListingFields({ ...validData, price: "0" });
    expect(errors.price).toBeDefined();
  });

  it("rejeita preço muito alto", () => {
    const errors = validateListingFields({ ...validData, price: "100000" });
    expect(errors.price).toBeDefined();
  });

  it("não exige preço para doação", () => {
    const errors = validateListingFields({
      ...validData,
      deal_type: "donation",
      price: undefined,
    });
    expect(errors.price).toBeUndefined();
  });
});
