import { describe, it, expect } from "vitest";
import {
  KANBAN_STAGES,
  ACTIVE_PIPELINE_STAGES,
  ORDERED_STAGE_KEYS,
  normalizeLeadStage,
  getStageLabel,
} from "../src/lib/kanban-stages";

describe("Configuração das Colunas do Kanban (5 Etapas)", () => {
  it("deve definir exatamente 5 colunas na sequência acordada com o cliente", () => {
    expect(KANBAN_STAGES.map((s) => s.title)).toEqual([
      "1. Primeiro Contato",
      "2. Oportunidade de Negócio",
      "3. Negociação",
      "4. Proposta Enviada",
      "5. Fechado / Ganho",
    ]);

    expect(ORDERED_STAGE_KEYS).toEqual([
      "prospeccao_inicial",
      "qualificacao_logistica",
      "negociacao",
      "proposta_enviada",
      "fechado_ganho",
    ]);
  });

  it("deve excluir fechado_ganho das etapas ativas de cálculo de Cycle Time", () => {
    expect(ACTIVE_PIPELINE_STAGES).toHaveLength(4);
    expect(ACTIVE_PIPELINE_STAGES.some((s) => s.key === "fechado_ganho")).toBe(false);
  });

  it("deve normalizar o estágio legado cotacao_frete para negociacao", () => {
    expect(normalizeLeadStage("cotacao_frete")).toBe("negociacao");
    expect(getStageLabel("cotacao_frete")).toBe("3. Negociação");
    expect(getStageLabel("qualificacao_logistica")).toBe("2. Oportunidade de Negócio");
  });
});
