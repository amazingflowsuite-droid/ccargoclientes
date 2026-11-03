import React from "react";
import { CollisionCheckResult } from "@/types";
import { ShieldAlert, AlertTriangle, Info, CheckCircle2, Building2 } from "lucide-react";
import { formatCNPJ } from "@/lib/utils";

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
      return (
        <div className="p-4 rounded-md border border-blue-300 bg-blue-50 text-blue-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-blue-800">
                LEAD JÁ CADASTRADO NO PIPELINE
              </h4>
              <p className="text-xs text-blue-800">
                Esta conta já está sendo prospectada por <strong>{exact_match.sdr_responsavel_nome || "outro operador"}</strong> no estágio <strong>{exact_match.estagio}</strong>.
              </p>
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

