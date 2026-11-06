import { describe, it, expect } from "vitest";

const DAY_MS = 24 * 60 * 60 * 1000;

function calculateLeadTimeDays(startIso: string, endIso: string): number {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  return Math.max(0.5, Number(((Math.max(startMs, endMs) - startMs) / DAY_MS).toFixed(1)));
}

function calculateCycleTime(t1Iso: string, t2Iso: string): number {
  const t1 = new Date(t1Iso).getTime();
  const t2 = new Date(t2Iso).getTime();
  if (t2 < t1) return 0;
  return Math.max(0.3, Number(((t2 - t1) / DAY_MS).toFixed(1)));
}

describe("Cálculos de Lead Time e Cycle Time Comercial (Relatórios / Funil)", () => {
  it("deve calcular corretamente o Lead Time de um lead ganho", () => {
    const start = new Date(Date.now() - 10 * DAY_MS).toISOString();
    const end = new Date().toISOString();
    const leadTime = calculateLeadTimeDays(start, end);

    expect(leadTime).toBeCloseTo(10, 0.1);
  });

  it("deve garantir piso mínimo de 0.5 dias para Lead Time ponta a ponta", () => {
    const now = new Date().toISOString();
    const leadTime = calculateLeadTimeDays(now, now);
    expect(leadTime).toBe(0.5);
  });

  it("deve calcular o Cycle Time entre etapas consecutivas no funil", () => {
    const etapa1 = new Date("2026-11-01T10:00:00Z").toISOString();
    const etapa2 = new Date("2026-11-04T10:00:00Z").toISOString(); // 3 dias depois

    const cycleTime = calculateCycleTime(etapa1, etapa2);
    expect(cycleTime).toBe(3);
  });
});

