import { describe, it, expect } from "vitest";
import { cleanCNPJ, formatCNPJ, getCNPJRaiz, formatPhone } from "../src/lib/utils";
import { checkCNPJCollision } from "../src/lib/store";

describe("CNPJ e Utilitários de Entrada (Utils)", () => {
  it("deve limpar pontuações de CNPJ deixando apenas dígitos", () => {
    expect(cleanCNPJ("45.464.748/0001-33")).toBe("45464748000133");
    expect(cleanCNPJ("12.345.678/0001-90")).toBe("12345678000190");
    expect(cleanCNPJ("abc45-464.748/0001-33xyz")).toBe("45464748000133");
  });

  it("deve formatar CNPJ com máscara padrão brasileira", () => {
    expect(formatCNPJ("45464748000133")).toBe("45.464.748/0001-33");
    expect(formatCNPJ("12345678000190")).toBe("12.345.678/0001-90");
  });

  it("deve extrair a raiz de 8 dígitos para verificação de grupo econômico (matriz e filiais)", () => {
    const matriz = "45464748000133";
    const filial = "45464748000214";
    expect(getCNPJRaiz(matriz)).toBe("45464748");
    expect(getCNPJRaiz(filial)).toBe("45464748");
    expect(getCNPJRaiz(matriz)).toBe(getCNPJRaiz(filial));
  });

  it("deve formatar telefones celulares (11 dígitos) e fixos (10 dígitos)", () => {
    expect(formatPhone("11999998888")).toBe("(11) 99999-8888");
    expect(formatPhone("1434001122")).toBe("(14) 3400-1122");
  });
});

describe("Regra Anti-Colisão de CNPJ (checkCNPJCollision)", () => {
  it("deve identificar colisão exata de CNPJ de cliente ativo já cadastrado", async () => {
    // 12345678000190 = Ambev (Cliente Ativo nos dados iniciais)
    const res = await checkCNPJCollision("12.345.678/0001-90");
    expect(res.has_exact_collision).toBe(true);
    expect(res.exact_match?.status).toBe("cliente_ativo");
    expect(res.exact_match?.razao_social).toMatch(/AMBEV/i);
  });

  it("deve identificar colisão de raiz (filial) quando matriz é cliente ativo", async () => {
    // Filial com mesma raiz 12345678 mas final 0002-14
    const res = await checkCNPJCollision("12.345.678/0002-14");
    expect(res.has_exact_collision).toBe(false);
    expect(res.has_related_collision).toBe(true);
    expect(res.related_accounts.length).toBeGreaterThan(0);
    expect(res.related_accounts[0].razao_social).toMatch(/AMBEV/i);
  });

  it("deve liberar CNPJ inédito sem colisões", async () => {
    const res = await checkCNPJCollision("99.888.777/0001-66");
    expect(res.has_exact_collision).toBe(false);
    expect(res.has_related_collision).toBe(false);
    expect(res.exact_match).toBeNull();
  });
});

