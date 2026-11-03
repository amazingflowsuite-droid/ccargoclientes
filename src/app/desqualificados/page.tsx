"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAllAccounts, updateAccount } from "@/lib/store";
import { Account } from "@/types";
import { formatCNPJ } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AlertOctagon, ArrowLeft, Search, RotateCcw, MapPin, AlertTriangle } from "lucide-react";

export default function DesqualificadosPage() {
  const [contas, setContas] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadContas();
  }, []);

  async function loadContas() {
    setLoading(true);
    try {
      const data = await fetchAllAccounts();
      setContas(data.filter((a) => a.status === "desqualificado"));
    } finally {
      setLoading(false);
    }
  }

  async function handleReativar(account: Account) {
    const motivo = prompt(
      `Reativar prospecção para "${account.razao_social}"?\nEsta empresa foi recusada por: ${account.motivo_desqualificacao}.\nDigite a justificativa da reavaliação comercial:`
    );
    if (!motivo) return;

    await updateAccount(account.id, {
      status: "lead",
      estagio: "prospeccao_inicial",
      motivo_desqualificacao: undefined,
      detalhe_desqualificacao: undefined,
    });

    loadContas();
  }

  const filtered = contas.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      c.razao_social.toLowerCase().includes(term) ||
      c.cnpj.includes(term) ||
      (c.motivo_desqualificacao && c.motivo_desqualificacao.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao Funil
        </Link>
        <div className="flex items-center gap-2.5">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]">
            Contas Recusadas & Inviáveis
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] text-xs font-semibold">
            Memória de Recusa
          </span>
        </div>
        <p className="text-sm text-[#57534E] mt-1">
          Histórico de contas desqualificadas por frete deficitário, rotas incompatíveis ou restrições financeiras.
        </p>
      </div>

      {/* Busca */}
      <div className="bg-white p-4 rounded-lg border border-[#E7E5E4] shadow-subtle flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar por empresa, motivo ou rota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#D6D3D1] text-xs focus-ring"
          />
        </div>
        <span className="text-xs text-[#57534E]">
          Total de contas com recusa: <strong>{filtered.length}</strong>
        </span>
      </div>

      {/* Lista de Contas */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-[#78716C] bg-white rounded-lg border border-[#E7E5E4]">
            Carregando memória de recusa...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-[#A8A29E] bg-white rounded-lg border border-[#E7E5E4] italic">
            Nenhuma conta desqualificada no histórico.
          </div>
        ) : (
          filtered.map((conta) => (
            <div
              key={conta.id}
              className="bg-white p-5 rounded-lg border border-[#E7E5E4] shadow-subtle hover:border-[#D6D3D1] transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-[#F5F5F4] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-base text-[#1C1917]">
                      {conta.razao_social}
                    </h3>
                    <StatusBadge status="desqualificado" size="sm" />
                  </div>
                  <div className="text-xs font-mono text-[#57534E] mt-0.5">
                    CNPJ: {formatCNPJ(conta.cnpj)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleReativar(conta)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D6D3D1] text-[#1C1917] hover:bg-[#F5F5F4] rounded-md text-xs font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#0D9488]" />
                  Reavaliar / Reativar Lead
                </button>
              </div>

              {/* Detalhe do Motivo de Recusa */}
              <div className="p-3 bg-[#FEF2F2]/60 rounded border border-[#FECACA] text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#B91C1C] uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Motivo: {conta.motivo_desqualificacao?.replace("_", " ")}</span>
                </div>
                {conta.detalhe_desqualificacao && (
                  <p className="text-slate-800 pl-6">
                    {conta.detalhe_desqualificacao}
                  </p>
                )}
                {conta.data_desqualificacao && (
                  <div className="text-[11px] text-[#78716C] pl-6 pt-0.5">
                    Registrado em: {new Date(conta.data_desqualificacao).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>

              {/* Informações Logísticas */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#57534E]">
                {conta.cidade && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#A8A29E]" />
                    {conta.cidade}/{conta.uf}
                  </span>
                )}
                {conta.rotas_principais && conta.rotas_principais.length > 0 && (
                  <span>
                    <strong>Rotas demandadas:</strong> {conta.rotas_principais.join(", ")}
                  </span>
                )}
                {conta.tipos_veiculos && conta.tipos_veiculos.length > 0 && (
                  <span>
                    <strong>Veículos:</strong> {conta.tipos_veiculos.join(", ")}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

