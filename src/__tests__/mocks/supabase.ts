import { vi } from "vitest";

/**
 * Factory para criar um mock do Supabase client.
 * Cada teste pode customizar os retornos via overrides.
 */
export function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mfa = {
    enroll: vi.fn().mockResolvedValue({
      data: {
        id: "factor-123",
        totp: {
          qr_code: "data:image/svg+xml;base64,MOCK_QR",
          secret: "JBSWY3DPEHPK3PXP",
          uri: "otpauth://totp/ShareBooks:user@test.com?secret=JBSWY3DPEHPK3PXP",
        },
      },
      error: null,
    }),
    challenge: vi.fn().mockResolvedValue({
      data: { id: "challenge-456" },
      error: null,
    }),
    verify: vi.fn().mockResolvedValue({
      data: {},
      error: null,
    }),
    listFactors: vi.fn().mockResolvedValue({
      data: { totp: [] },
      error: null,
    }),
    unenroll: vi.fn().mockResolvedValue({
      data: {},
      error: null,
    }),
    getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal1" },
      error: null,
    }),
  };

  const auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "user-1", email: "user@test.com" } },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" }, session: {} },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    mfa,
    ...overrides,
  };

  return {
    auth,
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}

/**
 * Aplica o mock do Supabase client no módulo @/lib/supabase/client
 */
export function mockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const client = createMockSupabaseClient(overrides);

  vi.mock("@/lib/supabase/client", () => ({
    createClient: () => client,
  }));

  return client;
}
