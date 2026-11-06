"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  fetchAllAccounts,
  fetchAllContactLogs,
  getOperatorsList,
  getAuthenticatedUser,
  fetchAllAppUsers,
} from "@/lib/store";
import {
  generateClientDossierPDF,
  generateMonthlyReportPDF,
  getStatusLabel,
  getCanalLabel,
  getResultadoLabel,
} from "@/lib/pdf-report";
import { Account, ContactLog, OperatorUser, AppUser } from "@/types";
import { formatCNPJ, cleanCNPJ } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ArrowLeft,
  Printer,
  Calendar,
  UserCheck,
  Search,
  PhoneCall,
  FileSpreadsheet,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  FileText,
} from "lucide-react";

const MONTHS = [
  { value: "ALL", label: "Todos os Meses (Acumulado Geral)" },
  { value: "2026-11", label: "Novembro / 2026" },
  { value: "2026-12", label: "Dezembro / 2026" },
  { value: "2027-01", label: "Janeiro / 2027" },
  { value: "2027-02", label: "Fevereiro / 2027" },
  { value: "2027-03", label: "Março / 2027" },
];

export default function RelatoriosPage() {
  const [authUser, setAuthUser] = useState<AppUser | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const [operators, setOperators] = useState<OperatorUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros do Relatório Mensal (US-12)
  const currentYearMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [selectedOperator, setSelectedOperator] = useState<string>("TODOS");

  // Busca rápida de Cliente Individual (US-11 - Ex: Tauste)
  const [clientSearch, setClientSearch] = useState<string>("");

  useEffect(() => {
    setAuthUser(getAuthenticatedUser());
    fetchAllAppUsers().then(() => {
      setOperators(getOperatorsList());
    });
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [accData, logData] = await Promise.all([
        fetchAllAccounts(),
        fetchAllContactLogs(),
      ]);
      setAccounts(accData);
      setLogs(logData);
    } finally {
      setLoading(false);
    }
  }

  // Helper para checar se uma data ISO pertence ao mês selecionado (no fuso local)
  function isInSelectedMonth(isoDate?: string): boolean {
    if (selectedMonth === "ALL") return true;
    if (!isoDate) return false;
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return false;
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return ym === selectedMonth;
  }

  // Mapa de contas por ID para enriquecer os logs
  const accountById = useMemo(() => {
    const map: Record<string, Account> = {};
    accounts.forEach((a) => {
      map[a.id] = a;
    });
    return map;
  }, [accounts]);

  // Logs filtrados por Mês e por Operadora
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (!isInSelectedMonth(log.created_at)) return false;
        if (selectedOperator !== "TODOS") {
          const op = (log.usuario_nome || "").toLowerCase();
          if (!op.includes(selectedOperator.toLowerCase())) return false;
        }
        return true;
      })
      .map((log) => ({
        ...log,
        account_name: accountById[log.account_id]?.razao_social || "Empresa Prospectada",
        account_cnpj: accountById[log.account_id]?.cnpj || "",
      }));
  }, [logs, selectedMonth, selectedOperator, accountById]);

  // Contas filtradas por Mês (criadas, atualizadas ou que tiveram ligação no mês) e por Operadora
  const filteredAccounts = useMemo(() => {
    const accountIdsWithLogsInMonth = new Set(filteredLogs.map((l) => l.account_id));

    return accounts.filter((acc) => {
      if (selectedOperator !== "TODOS") {
        const resp = (acc.sdr_responsavel_nome || acc.gerente_conta_nome || "").toLowerCase();
        if (!resp.includes(selectedOperator.toLowerCase()) && !accountIdsWithLogsInMonth.has(acc.id)) {
          return false;
        }
      }

      if (selectedMonth !== "ALL") {
        const inMonth =
          isInSelectedMonth(acc.created_at) ||
          isInSelectedMonth(acc.updated_at) ||
          accountIdsWithLogsInMonth.has(acc.id);
        if (!inMonth) return false;
      }

      if (clientSearch.trim()) {
        const term = clientSearch.toLowerCase();
        const matchName =
          acc.razao_social.toLowerCase().includes(term) ||
          (acc.nome_fantasia && acc.nome_fantasia.toLowerCase().includes(term)) ||
          acc.cnpj.includes(cleanCNPJ(term)) ||
          (acc.observacoes_importantes && acc.observacoes_importantes.toLowerCase().includes(term));
        if (!matchName) return false;
      }

      return true;
    });
  }, [accounts, filteredLogs, selectedMonth, selectedOperator, clientSearch]);

  // Métricas Consolidadas do Mês (US-12)
  const metrics = useMemo(() => {
    const totalContatos = filteredLogs.length;
    const contatosComSucesso = filteredLogs.filter((l) => l.resultado === "sucesso").length;
    const contatosSemResposta = filteredLogs.filter((l) => l.resultado === "sem_resposta").length;

    const totalEmpresasTrabalhadas = filteredAccounts.length;

    // Quantos pediram cotação (estão em cotacao_frete, proposta_enviada, negociacao ou fechado_ganho)
    const pediramCotacao = filteredAccounts.filter(
      (a) =>
        a.status === "lead" &&
        ["cotacao_frete", "proposta_enviada", "negociacao", "fechado_ganho"].includes(
          a.estagio || ""
        )
    ).length;

    // Quantos fecharam negócio
    const fecharamNegocio = filteredAccounts.filter(
      (a) => a.estagio === "fechado_ganho" || a.status === "cliente_ativo"
    ).length;

    // Quantos foram recusados / desqualificados
    const desqualificados = filteredAccounts.filter((a) => a.status === "desqualificado").length;

    return {
      totalContatos,
      contatosComSucesso,
      contatosSemResposta,
      totalEmpresasTrabalhadas,
      pediramCotacao,
      fecharamNegocio,
      desqualificados,
    };
  }, [filteredLogs, filteredAccounts]);

  function handlePrintMonthlyReport() {
    const monthObj = MONTHS.find((m) => m.value === selectedMonth);
    const periodoLabel = monthObj ? monthObj.label : selectedMonth;
    const operadoraFiltro =
      selectedOperator === "TODOS" ? "Todas as Operadoras" : selectedOperator;

    generateMonthlyReportPDF({
      periodoLabel,
      operadoraFiltro,
      accountsNoPeriodo: filteredAccounts,
      logsNoPeriodo: filteredLogs,
      metrics,
    });
  }

  function handlePrintClientPDF(account: Account) {
    const clientLogs = logs.filter((l) => l.account_id === account.id);
    generateClientDossierPDF(account, clientLogs);
  }

  // Bloqueio de segurança para perfil diferente de Gestor
  if (authUser && authUser.perfil !== "gestor") {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white rounded-lg border border-red-200 p-8 text-center shadow-subtle space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-xl font-bold text-[#1C1917]">
          Acesso Restrito ao Perfil Gestor
        </h1>
        <p className="text-sm text-[#57534E]">
          Olá, <strong>{authUser.nome}</strong>. A Central de Relatórios Gerenciais e Fechamento Mensal é exclusiva para o perfil de{" "}
          <strong>Gestor Comercial</strong>. Você ainda pode gerar o dossiê em PDF individual de cada cliente diretamente nos cards do Funil de Vendas.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-md hover:bg-[#1E293B] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Funil de Vendas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Funil de Vendas
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]">
            Central de Relatórios & Fechamento Mensal
          </h1>
          <p className="text-sm text-[#57534E] mt-1">
            Puxe o dossiê completo em PDF de qualquer cliente (ex: Tauste) ou o balanço mensal da operadora comercial.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintMonthlyReport}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold rounded-md shadow-sm transition-all focus-ring self-start md:self-center"
        >
          <Printer className="w-4 h-4 text-[#0D9488]" />
          <span>Imprimir / Baixar Relatório do Mês (PDF)</span>
        </button>
      </div>

      {/* BARRA DE FILTROS DE PERÍODO E OPERADORA (US-09 & US-12) */}
      <div className="bg-white p-5 rounded-lg border border-[#E7E5E4] shadow-subtle grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#0D9488]" />
            Mês de Referência
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-[#FAFAF9] text-xs font-semibold text-[#1C1917] focus-ring"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#0D9488]" />
            Usuário / Operadora Comercial
          </label>
          <select
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-[#FAFAF9] text-xs font-semibold text-[#1C1917] focus-ring"
          >
            <option value="TODOS">Todas as Operadoras (Visão Geral)</option>
            {operators.map((op) => (
              <option key={op.id} value={op.nome}>
                👤 {op.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-[#0D9488]" />
            Buscar Cliente Específico (Ex: Tauste)
          </label>
          <input
            type="text"
            placeholder="Digite o nome do cliente, CNPJ ou observação..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-xs focus-ring"
          />
        </div>
      </div>

      {/* KPIS DE FECHAMENTO DO MÊS (EXATAMENTE O PEDIDO DO ÁUDIO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E7E5E4] shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Contatos Realizados
            </span>
            <PhoneCall className="w-4 h-4 text-[#0D9488]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#1C1917] mt-1.5">
            {metrics.totalContatos}
          </div>
          <div className="text-[11px] text-[#57534E] mt-1">
            <strong className="text-emerald-700">{metrics.contatosComSucesso} com sucesso</strong> •{" "}
            <span>{metrics.contatosSemResposta} sem resposta</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E7E5E4] shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Pediram Cotação
            </span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-amber-700 mt-1.5">
            {metrics.pediramCotacao}
          </div>
          <div className="text-[11px] text-[#57534E] mt-1">
            Leads em Cotação, Proposta ou Negociação
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E7E5E4] shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Quantos Fecharam
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#047857] mt-1.5">
            {metrics.fecharamNegocio}
          </div>
          <div className="text-[11px] text-[#57534E] mt-1">
            Negócios ganhos / Clientes conquistados
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E7E5E4] shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Contas Recusadas
            </span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#B91C1C] mt-1.5">
            {metrics.desqualificados}
          </div>
          <div className="text-[11px] text-[#57534E] mt-1">
            Desqualificados por margem ou rota
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: DOSSIÊ POR CLIENTE COM BOTÃO DE IMPRIMIR PDF INDIVIDUAL (US-11) */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-[#E7E5E4] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0D9488]" />
              Fichas de Clientes & Geração de Dossiê Individual em PDF ({filteredAccounts.length})
            </h2>
            <p className="text-xs text-[#57534E] mt-0.5">
              Clique em <strong>&ldquo;Gerar PDF do Cliente&rdquo;</strong> para imprimir todas as observações (o que carrega/não carrega) e todas as datas de contato.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F5F4] text-[#57534E] uppercase tracking-wider font-semibold border-b border-[#E7E5E4]">
              <tr>
                <th className="py-3 px-4">Cliente / Empresa</th>
                <th className="py-3 px-4">Etapa / Status</th>
                <th className="py-3 px-4">Operadora</th>
                <th className="py-3 px-4">Observações Importantes do Cliente</th>
                <th className="py-3 px-4 text-center">Tentativas</th>
                <th className="py-3 px-4 text-right">Relatório Individual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#78716C]">
                    Carregando relatórios...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#A8A29E] italic">
                    Nenhuma empresa encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const accLogs = logs.filter((l) => l.account_id === acc.id);
                  const lastLog = accLogs[0];

                  return (
                    <tr key={acc.id} className="hover:bg-[#FAFAF9] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-serif font-bold text-sm text-[#1C1917]">
                          {acc.razao_social}
                        </div>
                        {acc.nome_fantasia && (
                          <div className="text-[11px] text-[#57534E]">{acc.nome_fantasia}</div>
                        )}
                        <div className="text-[11px] font-mono text-[#78716C] mt-0.5">
                          {formatCNPJ(acc.cnpj)} {acc.cidade ? `• ${acc.cidade}/${acc.uf}` : ""}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {acc.status === "lead" ? (
                          <StatusBadge stage={acc.estagio} size="sm" />
                        ) : (
                          <StatusBadge status={acc.status} size="sm" />
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-[#1C1917]">
                        👤 {acc.sdr_responsavel_nome || acc.gerente_conta_nome || "Ana Paula (Comercial)"}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        {acc.observacoes_importantes ? (
                          <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-950 line-clamp-2">
                            {acc.observacoes_importantes}
                          </div>
                        ) : acc.detalhe_desqualificacao ? (
                          <div className="text-[11px] text-red-700 line-clamp-2">
                            <strong>Recusa:</strong> {acc.detalhe_desqualificacao}
                          </div>
                        ) : (
                          <span className="text-[#A8A29E] italic">Sem observações cadastradas</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono font-bold text-xs">
                          {accLogs.length}
                        </span>
                        {lastLog && (
                          <div className="text-[10px] text-[#78716C] mt-0.5">
                            Últ.: {new Date(lastLog.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintClientPDF(acc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#0D9488]" />
                          <span>Gerar PDF do Cliente</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO 2: DIÁRIO CRONOLÓGICO DE LIGAÇÕES E INTERAÇÕES DO PERÍODO */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-[#E7E5E4] flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#0D9488]" />
              Histórico de Ligações e Contatos Realizados no Período ({filteredLogs.length})
            </h2>
            <p className="text-xs text-[#57534E] mt-0.5">
              Registro detalhado de tudo o que foi falado em cada tentativa de contato pela operadora.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F5F4] text-[#57534E] uppercase tracking-wider font-semibold border-b border-[#E7E5E4]">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Operadora</th>
                <th className="py-3 px-4">Canal & Resultado</th>
                <th className="py-3 px-4">O que foi conversado / Resumo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#A8A29E] italic">
                    Nenhum contato registrado neste filtro de período/operadora.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAFAF9]">
                    <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap text-[#57534E]">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1C1917]">
                      {log.account_name}
                    </td>
                    <td className="py-3 px-4 text-[#57534E]">👤 {log.usuario_nome}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800 mr-1.5">
                        {getCanalLabel(log.tipo_contato)}:
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.resultado === "sucesso"
                            ? "bg-emerald-100 text-emerald-800"
                            : log.resultado === "sem_resposta"
                            ? "bg-slate-100 text-slate-700"
                            : log.resultado === "reagendado"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {getResultadoLabel(log.resultado)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 max-w-md">{log.resumo}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

