import { Account, DeactivationReason } from "@/types";

export interface DeactivationReasonOption {
  value: DeactivationReason;
  label: string;
  restrictive: boolean;
}

export const DEACTIVATION_REASONS: DeactivationReasonOption[] = [
  { value: "fim_contrato", label: "Fim de contrato", restrictive: false },
  { value: "quebra_contrato", label: "Quebra de contrato / Rescisão", restrictive: true },
  { value: "inadimplencia", label: "Inadimplência", restrictive: true },
  { value: "migracao_concorrente", label: "Migração para concorrente / Preço", restrictive: false },
  { value: "encerramento_operacao", label: "Encerramento de operação do cliente", restrictive: false },
  { value: "outro", label: "Outro", restrictive: false },
];

const RESTRICTIVE_REASONS = new Set<string>(
  DEACTIVATION_REASONS.filter((r) => r.restrictive).map((r) => r.value)
);

export function isRestrictiveDeactivation(reason?: string | null): boolean {
  return Boolean(reason && RESTRICTIVE_REASONS.has(reason));
}

export function getDeactivationLabel(reason?: string | null): string {
  const found = DEACTIVATION_REASONS.find((r) => r.value === reason);
  return found ? found.label : reason ? reason.replace(/_/g, " ") : "Não informado";
}

/**
 * Reads deactivation metadata from dedicated columns or falls back to
 * encoded `[reason] detail` in `detalhe_desqualificacao` when the DB migration hasn't run yet.
 */
export function extractDeactivationInfo(account: Partial<Account>): {
  reason?: string;
  detail?: string;
  date?: string;
} {
  if (account.motivo_desativacao) {
    return {
      reason: account.motivo_desativacao,
      detail: account.detalhe_desativacao,
      date: account.data_desativacao || account.updated_at,
    };
  }

  const rawDetail = account.detalhe_desqualificacao || "";
  const match = rawDetail.match(/^\[([a-z_]+)\]\s*([\s\S]*)$/);
  if (match) {
    return {
      reason: match[1],
      detail: match[2]?.trim() || undefined,
      date: account.data_desqualificacao || account.updated_at,
    };
  }

  return {
    reason: undefined,
    detail: account.detalhe_desativacao || undefined,
    date: account.data_desativacao || account.data_desqualificacao || account.updated_at,
  };
}
