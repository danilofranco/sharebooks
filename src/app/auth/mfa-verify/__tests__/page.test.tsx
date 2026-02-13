import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MfaVerifyPage from "../page";

// ─── Mock do Supabase ───────────────────────────────────────

const mockListFactors = vi.fn();
const mockChallenge = vi.fn();
const mockVerify = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      mfa: {
        listFactors: mockListFactors,
        challenge: mockChallenge,
        verify: mockVerify,
      },
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams("redirectTo=/dashboard"),
}));

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  mockListFactors.mockResolvedValue({
    data: { totp: [{ id: "factor-1" }] },
    error: null,
  });

  mockChallenge.mockResolvedValue({
    data: { id: "challenge-1" },
    error: null,
  });

  mockVerify.mockResolvedValue({ error: null });
});

// ─── Tests ──────────────────────────────────────────────────

describe("MfaVerifyPage", () => {
  it("renderiza título e inputs OTP", () => {
    render(<MfaVerifyPage />);

    expect(screen.getByText("Verificação em duas etapas")).toBeInTheDocument();
    expect(screen.getByText(/código de 6 dígitos/)).toBeInTheDocument();

    // 6 inputs OTP
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);
  });

  it("aceita apenas dígitos nos inputs", async () => {
    const user = userEvent.setup();
    render(<MfaVerifyPage />);

    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("a");

    expect(inputs[0]).toHaveValue("");

    await user.keyboard("5");
    expect(inputs[0]).toHaveValue("5");
  });

  it("avança foco automaticamente ao digitar", async () => {
    const user = userEvent.setup();
    render(<MfaVerifyPage />);

    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("1");

    // Segundo input deve estar focado
    expect(inputs[1]).toHaveFocus();
  });

  it("mostra erro se nenhum fator MFA encontrado", async () => {
    mockListFactors.mockResolvedValueOnce({
      data: { totp: [] },
      error: null,
    });

    const user = userEvent.setup();
    render(<MfaVerifyPage />);

    // Digitar código completo para disparar verificação
    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("123456");

    // Aguardar mensagem de erro
    expect(
      await screen.findByText(/Nenhum fator MFA encontrado/),
    ).toBeInTheDocument();
  });

  it("mostra erro para código inválido", async () => {
    mockVerify.mockResolvedValueOnce({
      error: { message: "Invalid code" },
    });

    const user = userEvent.setup();
    render(<MfaVerifyPage />);

    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("999999");

    expect(
      await screen.findByText("Código inválido. Tente novamente."),
    ).toBeInTheDocument();
  });

  it("redireciona após verificação bem-sucedida", async () => {
    const user = userEvent.setup();
    render(<MfaVerifyPage />);

    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("123456");

    // Aguardar redirect
    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("suporta paste de código completo", async () => {
    const user = userEvent.setup();
    render(<MfaVerifyPage />);

    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);

    // Simular paste
    await user.paste("654321");

    expect(inputs[0]).toHaveValue("6");
    expect(inputs[1]).toHaveValue("5");
    expect(inputs[2]).toHaveValue("4");
    expect(inputs[3]).toHaveValue("3");
    expect(inputs[4]).toHaveValue("2");
    expect(inputs[5]).toHaveValue("1");
  });

  it("botão Verificar desabilitado com código incompleto", () => {
    render(<MfaVerifyPage />);

    const button = screen.getByRole("button", { name: "Verificar" });
    expect(button).toBeDisabled();
  });
});
