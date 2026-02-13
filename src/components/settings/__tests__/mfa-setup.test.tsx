import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MfaSetup } from "../mfa-setup";

// ─── Mocks ──────────────────────────────────────────────────

const mockEnroll = vi.fn();
const mockChallenge = vi.fn();
const mockVerify = vi.fn();
const mockListFactors = vi.fn();
const mockUnenroll = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      mfa: {
        enroll: mockEnroll,
        challenge: mockChallenge,
        verify: mockVerify,
        listFactors: mockListFactors,
        unenroll: mockUnenroll,
      },
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: mockRefresh,
  }),
}));

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  mockEnroll.mockResolvedValue({
    data: {
      id: "factor-new",
      totp: {
        qr_code: "data:image/svg+xml;base64,MOCKQR",
        secret: "TESTSECRET123",
        uri: "otpauth://totp/test",
      },
    },
    error: null,
  });

  mockChallenge.mockResolvedValue({
    data: { id: "challenge-1" },
    error: null,
  });

  mockVerify.mockResolvedValue({ error: null });

  mockListFactors.mockResolvedValue({
    data: { totp: [{ id: "factor-existing" }] },
    error: null,
  });

  mockUnenroll.mockResolvedValue({ data: {}, error: null });
});

// ─── Tests: Estado sem MFA ──────────────────────────────────

describe("MfaSetup - sem MFA", () => {
  it("mostra aviso de 2FA desativado", () => {
    render(<MfaSetup initialHasMfa={false} />);

    expect(screen.getByText("2FA desativado")).toBeInTheDocument();
    expect(screen.getByText("Configurar 2FA")).toBeInTheDocument();
  });

  it("inicia enrollment ao clicar em Configurar 2FA", async () => {
    const user = userEvent.setup();
    render(<MfaSetup initialHasMfa={false} />);

    await user.click(screen.getByText("Configurar 2FA"));

    // Deve mostrar QR code e instruções
    expect(await screen.findByText("Escaneie o QR Code")).toBeInTheDocument();
    expect(screen.getByText("Confirme o código")).toBeInTheDocument();
    expect(screen.getByAltText("QR Code para 2FA")).toBeInTheDocument();
  });

  it("mostra secret manual como fallback", async () => {
    const user = userEvent.setup();
    render(<MfaSetup initialHasMfa={false} />);

    await user.click(screen.getByText("Configurar 2FA"));

    // Details summary para código manual
    const summary = await screen.findByText(
      /Não consegue escanear/,
    );
    expect(summary).toBeInTheDocument();

    await user.click(summary);
    expect(screen.getByText("TESTSECRET123")).toBeInTheDocument();
  });

  it("ativa 2FA após verificar código correto", async () => {
    const user = userEvent.setup();
    render(<MfaSetup initialHasMfa={false} />);

    await user.click(screen.getByText("Configurar 2FA"));

    // Aguardar QR aparecer
    await screen.findByText("Escaneie o QR Code");

    // Digitar código nos inputs OTP
    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("123456");

    // Clicar ativar
    await user.click(screen.getByText("Ativar 2FA"));

    // Deve mostrar sucesso
    expect(
      await screen.findByText("2FA ativado com sucesso!"),
    ).toBeInTheDocument();

    expect(mockEnroll).toHaveBeenCalledOnce();
    expect(mockChallenge).toHaveBeenCalledWith({ factorId: "factor-new" });
    expect(mockVerify).toHaveBeenCalledWith({
      factorId: "factor-new",
      challengeId: "challenge-1",
      code: "123456",
    });
  });

  it("mostra erro se enrollment falha", async () => {
    mockEnroll.mockResolvedValueOnce({
      data: null,
      error: { message: "enroll failed" },
    });

    const user = userEvent.setup();
    render(<MfaSetup initialHasMfa={false} />);

    await user.click(screen.getByText("Configurar 2FA"));

    expect(
      await screen.findByText(/Erro ao iniciar configuração/),
    ).toBeInTheDocument();
  });

  it("mostra erro se código de verificação inválido", async () => {
    mockVerify.mockResolvedValueOnce({
      error: { message: "invalid code" },
    });

    const user = userEvent.setup();
    render(<MfaSetup initialHasMfa={false} />);

    await user.click(screen.getByText("Configurar 2FA"));
    await screen.findByText("Escaneie o QR Code");

    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("000000");

    await user.click(screen.getByText("Ativar 2FA"));

    expect(
      await screen.findByText(/Código inválido/),
    ).toBeInTheDocument();
  });

  it("cancela enrollment e volta ao estado inicial", async () => {
    const user = userEvent.setup();
    render(<MfaSetup initialHasMfa={false} />);

    await user.click(screen.getByText("Configurar 2FA"));
    await screen.findByText("Escaneie o QR Code");

    await user.click(screen.getByText("Cancelar"));

    expect(screen.getByText("2FA desativado")).toBeInTheDocument();
  });
});

// ─── Tests: Estado com MFA ──────────────────────────────────

describe("MfaSetup - com MFA ativado", () => {
  it("mostra status de 2FA ativado", () => {
    render(<MfaSetup initialHasMfa={true} />);

    expect(screen.getByText("2FA ativado")).toBeInTheDocument();
    expect(screen.getByText("Desativar 2FA")).toBeInTheDocument();
  });

  it("mostra confirmação ao clicar Desativar", async () => {
    const user = userEvent.setup();
    render(<MfaSetup initialHasMfa={true} />);

    await user.click(screen.getByText("Desativar 2FA"));

    expect(
      screen.getByText("Confirme a desativação"),
    ).toBeInTheDocument();
  });

  it("desativa 2FA com código válido", async () => {
    const user = userEvent.setup();
    render(<MfaSetup initialHasMfa={true} />);

    await user.click(screen.getByText("Desativar 2FA"));

    // Digitar código de confirmação
    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("123456");

    await user.click(screen.getByText("Confirmar desativação"));

    // Deve voltar ao estado sem MFA
    expect(
      await screen.findByText("2FA desativado"),
    ).toBeInTheDocument();

    expect(mockUnenroll).toHaveBeenCalledWith({ factorId: "factor-existing" });
  });

  it("mostra erro ao tentar desativar com código inválido", async () => {
    mockVerify.mockResolvedValueOnce({
      error: { message: "invalid" },
    });

    const user = userEvent.setup();
    render(<MfaSetup initialHasMfa={true} />);

    await user.click(screen.getByText("Desativar 2FA"));

    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("000000");

    await user.click(screen.getByText("Confirmar desativação"));

    expect(
      await screen.findByText(/Código inválido/),
    ).toBeInTheDocument();
  });

  it("cancela desativação e volta ao estado normal", async () => {
    const user = userEvent.setup();
    render(<MfaSetup initialHasMfa={true} />);

    await user.click(screen.getByText("Desativar 2FA"));
    expect(screen.getByText("Confirme a desativação")).toBeInTheDocument();

    await user.click(screen.getByText("Cancelar"));

    expect(screen.queryByText("Confirme a desativação")).not.toBeInTheDocument();
    expect(screen.getByText("2FA ativado")).toBeInTheDocument();
  });
});
