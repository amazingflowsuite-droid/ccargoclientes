import { Account, LeadStage, StageTransition } from "@/types";
import { normalizeLeadStage } from "./kanban-stages";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Deriva o mapa `stage_history` (última entrada em cada estágio) e `fechado_em`
 * a partir dos eventos reais persistidos em `account_stage_history`.
 */
export function buildStageHistoryMapFromTransitions(
  transitions: StageTransition[],
  account?: Pick<Account, "created_at" | "estagio" | "status">
): { stage_history: Partial<Record<LeadStage, string>>; fechado_em?: string } {
  const sorted = [...transitions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const stage_history: Partial<Record<LeadStage, string>> = {};
  let fechado_em: string | undefined;

  for (const t of sorted) {
    const normalized = normalizeLeadStage(t.to_stage);
    stage_history[normalized] = t.created_at;
    if (normalized === "fechado_ganho" || t.to_status === "cliente_ativo") {
      fechado_em = t.created_at;
    }
  }

  if (sorted.length === 0 && account?.created_at) {
    const fallbackStage =
      account.status === "cliente_ativo"
        ? "fechado_ganho"
        : normalizeLeadStage(account.estagio);
    stage_history[fallbackStage] = account.created_at;
    if (fallbackStage === "fechado_ganho") {
      fechado_em = account.created_at;
    }
  }

  return { stage_history, fechado_em };
}

/**
 * Calcula o tempo total (em dias) que um card permaneceu em cada estágio do funil
 * somando todos os intervalos reais registrados em `account_stage_history`.
 */
export function computeStageDurationsFromTransitions(
  transitions: StageTransition[],
  fallbackEndMs: number
): Partial<Record<LeadStage, number>> {
  const sorted = [...transitions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const accumulatedMs: Partial<Record<LeadStage, number>> = {};

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const stage = normalizeLeadStage(curr.to_stage);

    const isTerminal =
      stage === "fechado_ganho" ||
      stage === "perdido" ||
      curr.to_status === "cliente_ativo" ||
      curr.to_status === "desqualificado";

    if (isTerminal) continue;

    const startMs = new Date(curr.created_at).getTime();
    const nextMs =
      i + 1 < sorted.length
        ? new Date(sorted[i + 1].created_at).getTime()
        : fallbackEndMs;

    if (!Number.isFinite(startMs) || !Number.isFinite(nextMs) || nextMs < startMs) {
      continue;
    }

    accumulatedMs[stage] = (accumulatedMs[stage] || 0) + (nextMs - startMs);
  }

  const perStageDays: Partial<Record<LeadStage, number>> = {};
  for (const [stageKey, ms] of Object.entries(accumulatedMs)) {
    if (typeof ms === "number" && ms >= 0) {
      perStageDays[stageKey as LeadStage] = Math.max(
        0.3,
        Number((ms / DAY_MS).toFixed(1))
      );
    }
  }

  return perStageDays;
}
