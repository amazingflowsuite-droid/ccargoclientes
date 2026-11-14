import { describe, it, expect } from "vitest";
import { Account } from "@/types";
import { sortStageLeads, computeDropOrderUpdates } from "@/lib/kanban-order";

function makeLead(id: string, kanban_order?: number, estagio: Account["estagio"] = "prospeccao_inicial"): Account {
  return {
    id,
    cnpj: `111111110001${id.slice(-2).padStart(2, "0")}`,
    cnpj_raiz: "11111111",
    cnpj_formatado: "11.111.111/0001-00",
    razao_social: `Empresa ${id}`,
    status: "lead",
    estagio,
    kanban_order,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("sortStageLeads", () => {
  it("sorts leads with kanban_order ascending and places unordered leads after", () => {
    const a = makeLead("a", 3000);
    const b = makeLead("b", undefined);
    const c = makeLead("c", 1000);
    const d = makeLead("d", 2000);

    const sorted = sortStageLeads([a, b, c, d]);
    expect(sorted.map((l) => l.id)).toEqual(["c", "d", "a", "b"]);
  });
});

describe("computeDropOrderUpdates", () => {
  it("reorders a card within the same column using midpoint when orders exist", () => {
    const a = makeLead("a", 1000);
    const b = makeLead("b", 2000);
    const c = makeLead("c", 3000);

    const updates = computeDropOrderUpdates({
      draggedAccount: a,
      targetStage: "prospeccao_inicial",
      targetStageLeads: [a, b, c],
      dropTarget: { cardId: "b", position: "after" },
    });

    expect(updates).toEqual([
      { id: "a", cnpj: a.cnpj, kanban_order: 2500 },
    ]);
  });

  it("rebalances column when cards do not yet have kanban_order", () => {
    const a = makeLead("a");
    const b = makeLead("b");
    const c = makeLead("c");

    const updates = computeDropOrderUpdates({
      draggedAccount: c,
      targetStage: "prospeccao_inicial",
      targetStageLeads: [a, b, c],
      dropTarget: { cardId: "a", position: "before" },
    });

    expect(updates.map((u) => ({ id: u.id, order: u.kanban_order }))).toEqual([
      { id: "c", order: 1000 },
      { id: "a", order: 2000 },
      { id: "b", order: 3000 },
    ]);
  });

  it("moves a card to another column at a specific position", () => {
    const x = makeLead("x", 1000, "qualificacao_logistica");
    const y = makeLead("y", 2000, "qualificacao_logistica");
    const dragged = makeLead("a", 1000, "prospeccao_inicial");

    const updates = computeDropOrderUpdates({
      draggedAccount: dragged,
      targetStage: "qualificacao_logistica",
      targetStageLeads: [x, y],
      dropTarget: { cardId: "x", position: "after" },
    });

    expect(updates).toEqual([
      {
        id: "a",
        cnpj: dragged.cnpj,
        estagio: "qualificacao_logistica",
        kanban_order: 1500,
      },
    ]);
  });

  it("returns empty array when dropped in the exact same position", () => {
    const a = makeLead("a", 1000);
    const b = makeLead("b", 2000);

    const updates = computeDropOrderUpdates({
      draggedAccount: a,
      targetStage: "prospeccao_inicial",
      targetStageLeads: [a, b],
      dropTarget: { cardId: "b", position: "before" },
    });

    expect(updates).toEqual([]);
  });
});
