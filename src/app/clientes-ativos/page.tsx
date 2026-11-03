"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAllAccounts, createAccount, deleteAccount } from "@/lib/store";
import { fetchCompanyByCNPJ } from "@/lib/brasil-api";
import { Account } from "@/types";
import { formatCNPJ, cleanCNPJ } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ShieldCheck, Plus, Search, Trash2, ArrowLeft, Building2, User, Loader2, Sparkles } from "lucide-react";

export default function ClientesAtivosPage() {
  const [clientes, setClientes] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal de Novo Cliente Ativo
  const [showModal, setShowModal] = useState(false);
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [gerenteConta, setGerenteConta] = useState("");
  const [volumeMensal, setVolumeMensal] = useState("");
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadClientes();
  }, []);

  async function loadClientes() {
    setLoading(true);
    try {
      const data = await fetchAllAccounts();
      setClientes(data.filter((a) => a.status === "cliente_ativo"));
    } finally {
      setLoading(false);
    }
  }

  async function handleBuscarCnpj() {
    const clean = cleanCNPJ(cnpj);
    if (clean.length !== 14) return;
    setIsSearchingApi(true);
    try {
      const res = await fetchCompanyByCNPJ(clean);
      if (res.success && res.data) {
        setRazaoSocial(res.data.razao_social);
      }
    } finally {
      setIsSearchingApi(false);
    }
  }

  async function handleSalvarCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!razaoSocial || cleanCNPJ(cnpj).length !== 14) {
      alert("Preencha CNPJ e Razão Social.");
      return;
    }

    setIsSaving(true);
    try {
      await createAccount({
        cnpj: cleanCNPJ(cnpj),
        cnpj_formatado: formatCNPJ(cnpj),
        razao_social: razaoSocial,
        status: "cliente_ativo",
        gerente_conta_nome: gerenteConta || "Diretoria Comercial",
        volume_mensal_estimado: volumeMensal || undefined,
      });

      setShowModal(false);
      setCnpj("");
      setRazaoSocial("");
      setGerenteConta("");
      setVolumeMensal("");
      loadClientes();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemover(id: string, razao: string) {
    if (confirm(`Remover "${razao}" da base de clientes ativos? A proteção de bloqueio será desativada para este CNPJ.`)) {
      await deleteAccount(id);
      loadClientes();
    }
  }

  const filtered = clientes.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      c.razao_social.toLowerCase().includes(term) ||
      c.cnpj.includes(cleanCNPJ(term)) ||
      (c.gerente_conta_nome && c.gerente_conta_nome.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              Carteira de Clientes Ativos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] text-xs font-semibold">
              Escudo de Blindagem
            </span>
          </div>
          <p className="text-sm text-[#57534E] mt-1">
            Empresas cadastradas aqui são automaticamente <strong>bloqueadas</strong> contra novas abordagens de prospecção.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-md shadow-sm transition-all focus-ring"
        >
          <Plus className="w-4 h-4 text-[#0D9488]" />
          Blindar Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="bg-white p-4 rounded-lg border border-[#E7E5E4] shadow-subtle flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por CNPJ, Razão Social ou Gerente de Conta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#D6D3D1] text-xs focus-ring"
          />
        </div>
        <span className="text-xs text-[#57534E]">
          Total protegido: <strong>{filtered.length}</strong> empresas
        </span>
      </div>

      {/* Lista / Tabela */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F5F4] text-[#57534E] uppercase tracking-wider font-semibold border-b border-[#E7E5E4]">
              <tr>
                <th className="py-3 px-4">Empresa / Razão Social</th>
                <th className="py-3 px-4">CNPJ</th>
                <th className="py-3 px-4">Status & Proteção</th>
                <th className="py-3 px-4">Executivo / Gerente de Conta</th>
                <th className="py-3 px-4">Volume Operado</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#78716C]">
                    Carregando base de blindagem...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#A8A29E] italic">
                    Nenhum cliente ativo cadastrado no momento.
                  </td>
                </tr>
              ) : (
                filtered.map((cli) => (
                  <tr key={cli.id} className="hover:bg-[#FAFAF9] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-serif font-bold text-sm text-[#1C1917]">
                        {cli.razao_social}
                      </div>
                      {cli.nome_fantasia && (
                        <div className="text-[11px] text-[#78716C]">{cli.nome_fantasia}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#57534E]">
                      {formatCNPJ(cli.cnpj)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status="cliente_ativo" size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#1C1917]">
                      {cli.gerente_conta_nome || "Diretoria Comercial"}
                    </td>
                    <td className="py-3.5 px-4 text-[#57534E]">
                      {cli.volume_mensal_estimado || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemover(cli.id, cli.razao_social)}
                        className="p-1 text-[#A8A29E] hover:text-red-600 rounded transition-colors"
                        title="Remover da carteira"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVO CLIENTE ATIVO (US-05) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E7E5E4] max-w-lg w-full p-6 shadow-floating space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-[#E7E5E4] pb-3">
              <ShieldCheck className="w-6 h-6 text-[#059669]" />
              <div>
                <h3 className="font-serif font-bold text-base text-[#1C1917]">
                  Adicionar Cliente à Base de Blindagem
                </h3>
                <p className="text-xs text-[#57534E]">
                  Protege este CNPJ contra contatos de operadores no funil de vendas.
                </p>
              </div>
            </div>

            <form onSubmit={handleSalvarCliente} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#57534E] mb-1">
                  CNPJ <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    maxLength={18}
                    required
                    className="flex-1 px-3 py-2 rounded-md border border-[#D6D3D1] font-mono text-xs focus-ring"
                  />
                  <button
                    type="button"
                    onClick={handleBuscarCnpj}
                    disabled={isSearchingApi || cleanCNPJ(cnpj).length !== 14}
                    className="px-3 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-md text-xs font-medium flex items-center gap-1.5"
                  >
                    {isSearchingApi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />}
                    Buscar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#57534E] mb-1">
                  Razão Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nome empresarial oficial"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] text-xs focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#57534E] mb-1">
                  Executivo de Contas / Gerente Responsável
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Santos (Key Accounts)"
                  value={gerenteConta}
                  onChange={(e) => setGerenteConta(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] text-xs focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#57534E] mb-1">
                  Volume Médio Operado (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 50 carretas/mês, R$ 300.000"
                  value={volumeMensal}
                  onChange={(e) => setVolumeMensal(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] text-xs focus-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#D6D3D1] rounded-md text-xs font-medium text-[#1C1917] hover:bg-[#F5F5F4]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-md text-xs font-semibold shadow-sm"
                >
                  {isSaving ? "Salvando..." : "Blindar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

