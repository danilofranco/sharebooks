import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetAAL = vi.fn();
const mockFrom = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
      mfa: {
        getAuthenticatorAssuranceLevel: mockGetAAL,
      },
    },
    from: mockFrom,
  }),
}));

import { updateSession } from "../middleware";

// ─── Helpers ────────────────────────────────────────────────

function createMockRequest(pathname: string) {
  const url = new URL(`http://localhost:3000${pathname}`);

  return {
    nextUrl: {
      pathname,
      clone: () => new URL(`http://localhost:3000${pathname}`),
    },
    url: url.toString(),
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
    headers: new Headers(),
  } as any;
}

/** Configura mocks padrão: user logado, sem MFA */
function setupMocks(overrides: {
  user?: { id: string } | null;
  aal?: { currentLevel: string; nextLevel: string };
  profileRole?: string;
} = {}) {
  const {
    user = { id: "user-1" },
    aal = { currentLevel: "aal1", nextLevel: "aal1" },
    profileRole,
  } = overrides;

  mockGetUser.mockResolvedValue({
    data: { user },
    error: null,
  });

  mockGetAAL.mockResolvedValue({
    data: aal,
    error: null,
  });

  if (profileRole !== undefined) {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: profileRole },
            error: null,
          }),
        }),
      }),
    });
  }
}

// ─── Reset total entre testes ───────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── Tests: Rotas protegidas ────────────────────────────────

describe("updateSession - Rotas protegidas", () => {
  it("redireciona para sign-in se user não autenticado em rota protegida", async () => {
    setupMocks({ user: null });

    const response = await updateSession(createMockRequest("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/sign-in");
    expect(response.headers.get("location")).toContain("redirectTo=%2Fdashboard");
  });

  it("permite acesso a rota pública sem autenticação", async () => {
    setupMocks({ user: null });

    const response = await updateSession(createMockRequest("/listings"));

    expect(response.status).not.toBe(307);
  });

  it("permite acesso a rota protegida com user autenticado (sem MFA)", async () => {
    setupMocks();

    const response = await updateSession(createMockRequest("/dashboard"));

    expect(response.status).not.toBe(307);
  });
});

// ─── Tests: MFA / AAL ──────────────────────────────────────

describe("updateSession - MFA / AAL check", () => {
  it("redireciona para mfa-verify se user tem MFA mas não verificou", async () => {
    setupMocks({ aal: { currentLevel: "aal1", nextLevel: "aal2" } });

    const response = await updateSession(createMockRequest("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/mfa-verify");
    expect(response.headers.get("location")).toContain("redirectTo=%2Fdashboard");
  });

  it("não redireciona MFA na própria página de mfa-verify (não é rota protegida)", async () => {
    setupMocks({ aal: { currentLevel: "aal1", nextLevel: "aal2" } });

    const response = await updateSession(createMockRequest("/auth/mfa-verify"));

    expect(response.status).not.toBe(307);
  });

  it("não redireciona MFA na página de settings (exempta)", async () => {
    setupMocks({ aal: { currentLevel: "aal1", nextLevel: "aal2" } });

    const response = await updateSession(createMockRequest("/settings"));

    expect(response.status).not.toBe(307);
  });

  it("permite acesso se MFA já verificado (aal2)", async () => {
    setupMocks({ aal: { currentLevel: "aal2", nextLevel: "aal2" } });

    const response = await updateSession(createMockRequest("/dashboard"));

    expect(response.status).not.toBe(307);
  });

  it("permite acesso se user não tem MFA configurado", async () => {
    setupMocks({ aal: { currentLevel: "aal1", nextLevel: "aal1" } });

    const response = await updateSession(createMockRequest("/dashboard"));

    expect(response.status).not.toBe(307);
  });

  it("redireciona MFA em /conversations (rota protegida)", async () => {
    setupMocks({ aal: { currentLevel: "aal1", nextLevel: "aal2" } });

    const response = await updateSession(createMockRequest("/conversations"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/mfa-verify");
  });
});

// ─── Tests: Admin ───────────────────────────────────────────

describe("updateSession - Admin", () => {
  it("redireciona para dashboard se user não tem role admin", async () => {
    setupMocks({ profileRole: "user" });

    const response = await updateSession(createMockRequest("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });
});
