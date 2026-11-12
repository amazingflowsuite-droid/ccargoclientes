import React from "react";
import Link from "next/link";
import { CollisionCheckResult } from "@/types";
import { ShieldAlert, AlertTriangle, Info, CheckCircle2, Building2, ExternalLink } from "lucide-react";
import { formatCNPJ } from "@/lib/utils";

const STAGE_LABELS: Record<string, string> = {
  prospeccao_inicial: "1. Primeiro Contato",
  qualificacao_logistica: "2. Perfil & Frota",
  cotacao_frete: "3. Cotação de Frete",
  proposta_enviada: "4. Proposta Enviada",
  negociacao: "5. Negociação",
  fechado_ganho: "6. Fechado / Ganho",
  perdido: "Perdido",
};

interface CollisionAlertProps {
  collision: CollisionCheckResult | null;
  checking: boolean;
}

export const CollisionAlert: React.FC<CollisionAlertProps> = ({ collision, checking }) => {
  if (checking) {
    return (
      <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-sm flex items-center gap-2.5 animate-pulse">
        <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
        Consultando base da CCargo para validação de duplicidade e carteira ativa...
      </div>
    );
  }

  if (!collision) return null;

  const { has_exact_collision, exact_match, has_related_collision, related_accounts } = collision;

  // 1. BLOQUEIO RÍGIDO: CNPJ EXATO ENCONTRADO
  if (has_exact_collision && exact_match) {
    if (exact_match.status === "cliente_ativo") {
      return (
        <div className="p-4 rounded-md border-2 border-red-400 bg-red-50 text-red-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-base text-red-700 flex items-center gap-2">
                ⛔ CONTATO BLOQUEADO: EMPRESA JÁ É CLIENTE ATIVO DA CCARGO
              </h4>
              <p className="text-sm text-red-800">
                Esta empresa já faz parte da carteira ativa de clientes. É <strong>estritamente proibido</strong> ligar oferecendo serviços ou prospecção.
              </p>
              <div className="mt-3 p-3 bg-white/80 rounded border border-red-200 text-xs space-y-1">
                <div><strong>Razão Social:</strong> {exact_match.razao_social}</div>
                <div><strong>CNPJ:</strong> {formatCNPJ(exact_match.cnpj)}</div>
                <div><strong>Executivo de Contas Responsável:</strong> {exact_match.gerente_conta_nome || "Diretoria Comercial"}</div>
                {exact_match.volume_mensal_estimado && (
                  <div><strong>Volume Atual:</strong> {exact_match.volume_mensal_estimado}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (exact_match.status === "desqualificado") {
      return (
        <div className="p-4 rounded-md border-2 border-amber-500 bg-amber-50 text-amber-950 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-base text-amber-800">
                ⚠️ ALERTA CRÍTICO: CONTA RECUSADA ANTERIORMENTE POR INVIABILIDADE
              </h4>
              <p className="text-sm text-amber-900">
                Esta conta já foi negociada no passado e <strong>recusada</strong> pela engenharia de frete. Evite retrabalho e desgaste sem autorização prévia.
              </p>
              <div className="mt-3 p-3 bg-white/90 rounded border border-amber-300 text-xs space-y-1.5">
                <div><strong>Motivo da Recusa:</strong> <span className="font-semibold text-red-700 uppercase">{exact_match.motivo_desqualificacao?.replace("_", " ")}</span></div>
                {exact_match.detalhe_desqualificacao && (
                  <div><strong>Justificativa Histórica:</strong> {exact_match.detalhe_desqualificacao}</div>
                )}
                {exact_match.data_desqualificacao && (
                  <div><strong>Data da Desqualificação:</strong> {new Date(exact_match.data_desqualificacao).toLocaleDateString("pt-BR")}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (exact_match.status === "lead") {
      const isLeadPerdido = exact_match.estagio === "perdido";

      if (isLeadPerdido) {
        return (
          <div className="p-4 rounded-md border border-slate-300 bg-slate-50 text-slate-800 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5 w-full">
                <h4 className="font-bold text-sm text-slate-900">
                  LEAD ANTERIOR ENCERRADO / PERDIDO
                </h4>
                <p className="text-xs text-slate-700">
                  Esta conta já foi trabalhada anteriormente por <strong>{exact_match.sdr_responsavel_nome || "outro operador"}</strong>, porém foi finalizada como perdida. Você pode dar continuidade ou cadastrar nova oportunidade se houver demanda atual.
                </p>
                <div className="pt-1">
                  <Link
                    href={`/?leadId=${exact_match.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium text-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Consultar Histórico no Funil
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      }

      const stageName =
        STAGE_LABELS[exact_match.estagio || "prospeccao_inicial"] || exact_match.estagio;

      return (
        <div className="p-4 rounded-md border-2 border-amber-400 bg-amber-50 text-amber-950 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 w-full">
              <div>
                <h4 className="font-bold text-base text-amber-900 flex items-center gap-2">
                  ⛔ PROSPECÇÃO IMPEDIDA: LEAD JÁ EM ANDAMENTO NO PIPELINE
                </h4>
                <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                  Esta empresa já possui uma oportunidade ativa em prospecção/negociação. Para evitar duplicidade e conflito de canal, <strong>não é permitido cadastrar outro lead para o mesmo CNPJ</strong> enquanto este estiver em aberto.
                </p>
              </div>

              <div className="p-3 bg-white/90 rounded border border-amber-200 text-xs space-y-1.5 text-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Razão Social</span>
                    <strong className="text-slate-900">{exact_match.razao_social}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">CNPJ</span>
                    <strong className="font-mono text-slate-900">{formatCNPJ(exact_match.cnpj)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">SDR / Operador Responsável</span>
                    <span className="font-semibold text-amber-800">{exact_match.sdr_responsavel_nome || "Comercial"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Estágio Atual no Funil</span>
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold text-[11px]">
                      {stageName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <Link
                  href={`/?leadId=${exact_match.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Visualizar Lead no Funil
                </Link>
                <span className="text-[11px] text-amber-800 italic">
                  💡 Caso necessite atuar nesta conta, alinhe previamente com o operador responsável.
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // 2. ALERTA HÍBRIDO: MESMA RAIZ DE CNPJ (GRUPO ECONÔMICO / FILIAIS)
  if (has_related_collision && related_accounts.length > 0) {
    return (
      <div className="p-4 rounded-md border border-amber-300 bg-amber-50/70 text-amber-900 shadow-sm animate-in fade-in duration-200">
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 w-full">
            <h4 className="font-bold text-sm text-amber-900 flex items-center justify-between">
              <span>ℹ️ ALERTA HÍBRIDO: GRUPO ECONÔMICO IDENTIFICADO (Mesma Raiz de CNPJ)</span>
              <span className="text-xs font-normal bg-amber-200 px-2 py-0.5 rounded text-amber-900">
                {related_accounts.length} registro(s) correlato(s)
              </span>
            </h4>
            <p className="text-xs text-amber-800">
              O CNPJ digitado é inédito, porém outra unidade (Matriz ou Filial) deste mesmo grupo empresarial já possui registro na CCargo:
            </p>
            <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {related_accounts.map((acc) => (
                <div key={acc.id} className="p-2 bg-white rounded border border-amber-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">{acc.razao_social}</span>
                    <span className="text-slate-500 ml-2">({formatCNPJ(acc.cnpj)})</span>
                  </div>
                  <div>
                    {acc.status === "cliente_ativo" && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded text-[11px]">
                        Cliente Ativo ({acc.gerente_conta_nome || "Carteira"})
                      </span>
                    )}
                    {acc.status === "desqualificado" && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 font-semibold rounded text-[11px]">
                        Recusado ({acc.motivo_desqualificacao})
                      </span>
                    )}
                    {acc.status === "lead" && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[11px]">
                        Em Prospecção
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-amber-700 italic mt-1">
              💡 Você pode prosseguir com o cadastro caso seja uma unidade com centro de custos ou logística independente, mas alinhe previamente com o executivo da conta.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. NENHUMA COLISÃO: LIBERADO
  return (
    <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      <span>
        <strong>CNPJ Inédito e Liberado:</strong> Nenhuma colisão encontrada na carteira ativa ou na lista de recusas.
      </span>
    </div>
  );
};

