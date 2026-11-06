"use client";

import React from "react";
import { Account, DisqualificationReason } from "@/types";
import { formatCNPJ } from "@/lib/utils";
import { AlertOctagon } from "lucide-react";

interface DisqualifyModalProps {
  account: Account;
  motivoRecusa: DisqualificationReason;
  setMotivoRecusa: (v: DisqualificationReason) => void;
  detalheRecusa: string;
  setDetalheRecusa: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DisqualifyModal: React.FC<DisqualifyModalProps> = ({
  account,
  motivoRecusa,
  setMotivoRecusa,
  detalheRecusa,
  setDetalheRecusa,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#E7E5E4] max-w-lg w-full p-6 shadow-floating space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 text-red-600 border-b border-[#E7E5E4] pb-3">
          <AlertOctagon className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="font-serif font-bold text-base text-[#1C1917]">
              Desqualificar Oportunidade
            </h3>
            <p className="text-xs text-[#57534E]">
              Alimente a memória da CCargo para evitar retrabalho futuro.
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#FAFAF9] rounded border border-[#E7E5E4] text-xs">
          <strong>Empresa:</strong> {account.razao_social} ({formatCNPJ(account.cnpj)})
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1">
              Motivo Principal de Recusa <span className="text-red-500">*</span>
            </label>
            <select
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value as DisqualificationReason)}
              className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-xs focus-ring"
            >
              <option value="baixa_rentabilidade">
                Baixa Rentabilidade (Frete inviável / abaixo da margem)
              </option>
              <option value="rota_incompativel">
                Rota Incompatível (Sem carga de retorno / praça não atendida)
              </option>
              <option value="inadimplencia_historica">
                Inadimplência / Restrição Financeira
              </option>
              <option value="incompatibilidade_veiculo">
                Incompatibilidade de Veículo (Tipo de carroceria indisponível)
              </option>
              <option value="tabela_abaixo_piso">
                Tabela de Preço abaixo do piso mínimo
              </option>
              <option value="outro">Outro motivo operacional</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1">
              Justificativa Detalhada{" "}
              <span className="text-red-500">* (mín. 15 caracteres)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Cliente exige R$ 3,00/km para rota SP-GO, sem retorno garantido. Margem inviável para caminhão truck."
              value={detalheRecusa}
              onChange={(e) => setDetalheRecusa(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-xs focus-ring"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E5E4]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-[#D6D3D1] rounded-md text-xs font-medium text-[#1C1917] hover:bg-[#F5F5F4]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold shadow-sm"
          >
            Confirmar Desqualificação
          </button>
        </div>
      </div>
    </div>
  );
};

