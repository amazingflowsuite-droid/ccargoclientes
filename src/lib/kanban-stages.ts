import { LeadStage } from "@/types";

export interface KanbanStageConfig {
  key: LeadStage;
  title: string;
  shortTitle: string;
  color: string;
  badgeColor: string;
  barColor: string;
  badgeBg: string;
}

export const KANBAN_STAGES: KanbanStageConfig[] = [
  {
    key: "prospeccao_inicial",
    title: "1. Primeiro Contato",
    shortTitle: "1. 1º Contato",
    color: "border-slate-400",
    badgeColor: "bg-slate-100 text-slate-800",
    barColor: "bg-slate-600",
    badgeBg: "bg-slate-100 text-slate-800 border-slate-300",
  },
  {
    key: "qualificacao_logistica",
    title: "2. Oportunidade de Negócio",
    shortTitle: "2. Oportunidade",
    color: "border-blue-500",
    badgeColor: "bg-blue-100 text-blue-800",
    barColor: "bg-blue-600",
    badgeBg: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    key: "negociacao",
    title: "3. Negociação",
    shortTitle: "3. Negociação",
    color: "border-amber-500",
    badgeColor: "bg-amber-100 text-amber-800",
    barColor: "bg-amber-500",
    badgeBg: "bg-amber-50 text-amber-900 border-amber-200",
  },
  {
    key: "proposta_enviada",
    title: "4. Proposta Enviada",
    shortTitle: "4. Proposta",
    color: "border-purple-500",
    badgeColor: "bg-purple-100 text-purple-800",
    barColor: "bg-purple-600",
    badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
  },
  {
    key: "fechado_ganho",
    title: "5. Fechado / Ganho",
    shortTitle: "5. Fechado/Ganho",
    color: "border-teal-600",
    badgeColor: "bg-teal-100 text-teal-900",
    barColor: "bg-teal-600",
    badgeBg: "bg-teal-50 text-teal-900 border-teal-300",
  },
];

export const ORDERED_STAGE_KEYS: LeadStage[] = KANBAN_STAGES.map((s) => s.key);

export const ACTIVE_PIPELINE_STAGES: KanbanStageConfig[] = KANBAN_STAGES.filter(
  (s) => s.key !== "fechado_ganho"
);

export const NEGOTIATION_AND_PROPOSAL_STAGES: LeadStage[] = [
  "negociacao",
  "proposta_enviada",
  "fechado_ganho",
];

/**
 * Normaliza estágios legados (ex.: "cotacao_frete") para o fluxo atual de 5 colunas.
 */
export function normalizeLeadStage(stage?: LeadStage): LeadStage {
  if (!stage) return "prospeccao_inicial";
  if (stage === "cotacao_frete") return "negociacao";
  return stage;
}

export function getStageLabel(stage?: LeadStage): string {
  const normalized = normalizeLeadStage(stage);
  if (normalized === "perdido") return "Perdido / Sem Fit";
  const found = KANBAN_STAGES.find((s) => s.key === normalized);
  return found ? found.title : "1. Primeiro Contato";
}
