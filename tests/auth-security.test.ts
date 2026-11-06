import { describe, it, expect, beforeEach } from "vitest";
import { validatePasswordResetToken, completePasswordDefinition } from "../src/lib/store";

describe("Segurança de Autenticação e Tokens (Auth Security)", () => {
  it("deve rejeitar validação de token vazio ou nulo", async () => {
    const resEmpty = await validatePasswordResetToken("");
    expect(resEmpty.valid).toBe(false);
    expect(resEmpty.error).toMatch(/inválido ou incompleto/i);
  });

  it("deve rejeitar tokens inexistentes ou forjados", async () => {
    const resFake = await validatePasswordResetToken("token_forjado_123456");
    expect(resFake.valid).toBe(false);
    expect(resFake.error).toMatch(/já foi utilizado ou expirou/i);
  });

  it("deve BLOQUEAR tentativa de bypass passando apenas o email de vítima com token falso (SEC-05)", async () => {
    // Tentativa de Account Takeover: Atacante conhece o e-mail mas não tem o token criptográfico
    const resAttack = await validatePasswordResetToken(
      "token_falso_atacante",
      "comercial@ccargo.com.br"
    );
    expect(resAttack.valid).toBe(false);
    expect(resAttack.user).toBeUndefined();
  });

  it("deve exigir no mínimo 8 caracteres para definição de nova senha", async () => {
    const resShort = await completePasswordDefinition({
      token: "any_token",
      emailHint: "test@ccargo.com.br",
      novaSenha: "123", // Apenas 3 caracteres
    });
    expect(resShort.success).toBe(false);
    expect(resShort.error).toMatch(/no mínimo 8 caracteres/i);
  });
});

