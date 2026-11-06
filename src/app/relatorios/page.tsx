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
  getCanalLabel,
  getResultadoLabel,
} from "@/lib/pdf-report";
import { Account, ContactLog, LeadStage, OperatorUser, AppUser } from "@/types";
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
  BarChart3,
  Clock,
  Timer,
  ArrowRight,
  Award,
} from "lucide-react";

const MONTHS = [
  { value: "ALL", label: "Todos os Meses (Acumulado Geral)" },
  { value: "2026-11", label: "Novembro / 2026" },
  { value: "2026-12", label: "Dezembro / 2026" },
  { value: "2027-01", label: "Janeiro / 2027" },
  { value: "2027-02", label: "Fevereiro / 2027" },
  { value: "2027-03", label: "Março / 2027" },
];

const WORKFLOW_COLUMNS: {
  key: LeadStage;
  title: string;
  shortTitle: string;
  barColor: string;
  badgeBg: string;
}[] = [
  {
    key: "prospeccao_inicial",
    title: "1. Primeiro Contato",
    shortTitle: "1. 1º Contato",
    barColor: "bg-slate-600",
    badgeBg: "bg-slate-100 text-slate-800 border-slate-300",
  },
  {
    key: "qualificacao_logistica",
    title: "2. Perfil & Frota",
    shortTitle: "2. Perfil & Frota",
    barColor: "bg-blue-600",
    badgeBg: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    key: "cotacao_frete",
    title: "3. Cotação de Frete",
    shortTitle: "3. Cotação",
    barColor: "bg-amber-500",
    badgeBg: "bg-amber-50 text-amber-900 border-amber-200",
  },
  {
    key: "proposta_enviada",
    title: "4. Proposta Enviada",
    shortTitle: "4. Proposta",
    barColor: "bg-purple-600",
    badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
  },
  {
    key: "negociacao",
    title: "5. Negociação",
    shortTitle: "5. Negociação",
    barColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    key: "fechado_ganho",
    title: "6. Fechado / Ganho",
    shortTitle: "6. Fechado/Ganho",
    barColor: "bg-teal-600",
    badgeBg: "bg-teal-50 text-teal-900 border-teal-300",
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export default function RelatoriosPage() {
  const [authUser, setAuthUser] = useState<AppUser | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const [operators, setOperators] = useState<OperatorUser[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYearMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [selectedOperator, setSelectedOperator] = useState<string>("TODOS");
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

  function isInSelectedMonth(isoDate?: string): boolean {
    if (selectedMonth === "ALL") return true;
    if (!isoDate) return false;
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return false;
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return ym === selectedMonth;
  }

  const accountById = useMemo(() => {
    const map: Record<string, Account> = {};
    accounts.forEach((a) => {
      map[a.id] = a;
    });
    return map;
  }, [accounts]);

  function getAccountOperatorName(acc: Account): string {
    return acc.sdr_responsavel_nome || acc.gerente_conta_nome || "Ana Paula (Comercial)";
  }

  function matchesClientSearch(acc: Account | undefined, rawTerm: string): boolean {
    const term = rawTerm.trim().toLowerCase();
    if (!term) return true;
    if (!acc) return false;
    const cleanTerm = cleanCNPJ(term);
    return (
      acc.razao_social.toLowerCase().includes(term) ||
      Boolean(acc.nome_fantasia && acc.nome_fantasia.toLowerCase().includes(term)) ||
      (cleanTerm.length > 0 && acc.cnpj.includes(cleanTerm)) ||
      Boolean(
        acc.observacoes_importantes &&
          acc.observacoes_importantes.toLowerCase().includes(term)
      )
    );
  }

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (!isInSelectedMonth(log.created_at)) return false;
        if (selectedOperator !== "TODOS") {
          const op = (log.usuario_nome || "Ana Paula (Comercial)").toLowerCase();
          if (!op.includes(selectedOperator.toLowerCase())) return false;
        }
        if (!matchesClientSearch(accountById[log.account_id], clientSearch)) {
          return false;
        }
        return true;
      })
      .map((log) => ({
        ...log,
        account_name: accountById[log.account_id]?.razao_social || "Empresa Prospectada",
        account_cnpj: accountById[log.account_id]?.cnpj || "",
      }));
  }, [logs, selectedMonth, selectedOperator, clientSearch, accountById]);

  const filteredAccounts = useMemo(() => {
    const accountIdsWithLogsInFilter = new Set(filteredLogs.map((l) => l.account_id));

    return accounts.filter((acc) => {
      if (!matchesClientSearch(acc, clientSearch)) {
        return false;
      }

      if (selectedOperator !== "TODOS") {
        const opFilter = selectedOperator.toLowerCase();
        const sdr = (acc.sdr_responsavel_nome || "Ana Paula (Comercial)").toLowerCase();
        const mgr = (acc.gerente_conta_nome || "").toLowerCase();
        const isResponsible = sdr.includes(opFilter) || mgr.includes(opFilter);
        if (!isResponsible && !accountIdsWithLogsInFilter.has(acc.id)) {
          return false;
        }
      }

      if (selectedMonth !== "ALL") {
        const inMonth =
          isInSelectedMonth(acc.created_at) ||
          isInSelectedMonth(acc.updated_at) ||
          isInSelectedMonth(acc.fechado_em) ||
          Object.values(acc.stage_history || {}).some((dt) => isInSelectedMonth(dt)) ||
          accountIdsWithLogsInFilter.has(acc.id);
        if (!inMonth) return false;
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

    const pediramCotacao = filteredAccounts.filter(
      (a) =>
        a.status === "lead" &&
        ["cotacao_frete", "proposta_enviada", "negociacao", "fechado_ganho"].includes(
          a.estagio || ""
        )
    ).length;

    const fecharamNegocio = filteredAccounts.filter(
      (a) => a.estagio === "fechado_ganho" || a.status === "cliente_ativo"
    ).length;

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

  // ==========================================================================
  // US-17: GRÁFICO DE PERFORMANCE DO OPERADOR COMERCIAL
  // ==========================================================================
  const operatorPerformance = useMemo(() => {
    const operatorNames = Array.from(
      new Set([
        ...operators.map((o) => o.nome),
        ...accounts.map((a) => getAccountOperatorName(a)),
        ...logs.map((l) => l.usuario_nome || "Ana Paula (Comercial)"),
      ])
    ).filter(Boolean);

    const allRows = operatorNames.map((opName) => {
      const opLower = opName.toLowerCase();
      const opLogs = filteredLogs.filter(
        (l) => (l.usuario_nome || "Ana Paula (Comercial)").toLowerCase() === opLower
      );
      const opLogAccountIds = new Set(opLogs.map((l) => l.account_id));

      const opAccounts = filteredAccounts.filter((a) => {
        const sdr = (a.sdr_responsavel_nome || "Ana Paula (Comercial)").toLowerCase();
        const mgr = (a.gerente_conta_nome || "").toLowerCase();
        return sdr === opLower || mgr === opLower || opLogAccountIds.has(a.id);
      });

      const totalCalls = opLogs.length;
      const successCalls = opLogs.filter((l) => l.resultado === "sucesso").length;
      const hitRate = totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 0;

      const cotacoes = opAccounts.filter((a) =>
        ["cotacao_frete", "proposta_enviada", "negociacao", "fechado_ganho"].includes(
          a.estagio || ""
        )
      ).length;

      const fechados = opAccounts.filter(
        (a) => a.estagio === "fechado_ganho" || a.status === "cliente_ativo"
      ).length;

      const conversionRate =
        opAccounts.length > 0 ? Math.round((fechados / opAccounts.length) * 100) : 0;

      return {
        nome: opName,
        totalCalls,
        successCalls,
        hitRate,
        leadsTrabalhados: opAccounts.length,
        cotacoes,
        fechados,
        conversionRate,
      };
    });

    // Opção A: Se um operador está selecionado no filtro, exibe apenas ele.
    // Quando em "TODOS", exibe apenas operadores que possuem empresas ou contatos no filtro ativo.
    const rows = allRows.filter((r) => {
      if (selectedOperator !== "TODOS") {
        return r.nome.toLowerCase().includes(selectedOperator.toLowerCase());
      }
      return r.totalCalls > 0 || r.leadsTrabalhados > 0;
    });

    const maxCalls = Math.max(1, ...rows.map((r) => r.totalCalls));
    const maxLeads = Math.max(1, ...rows.map((r) => r.leadsTrabalhados));

    // Distribuição por Canal no período filtrado
    const channelCounts = {
      telefone: filteredLogs.filter((l) => l.tipo_contato === "telefone").length,
      whatsapp: filteredLogs.filter((l) => l.tipo_contato === "whatsapp").length,
      email: filteredLogs.filter((l) => l.tipo_contato === "email").length,
      reuniao: filteredLogs.filter((l) => l.tipo_contato === "reuniao").length,
    };
    const totalChannel = Math.max(1, filteredLogs.length);

    return {
      rows: rows.sort((a, b) => b.totalCalls - a.totalCalls || b.leadsTrabalhados - a.leadsTrabalhados),
      maxCalls,
      maxLeads,
      channelCounts,
      totalChannel,
    };
  }, [operators, accounts, logs, filteredLogs, filteredAccounts, selectedOperator]);

  // ==========================================================================
  // US-18: CÁLCULO DE LEAD TIME & CYCLE TIME ABRANGENDO AS COLUNAS DO WORKFLOW
  // ==========================================================================
  const workflowTiming = useMemo(() => {
    const orderedKeys: LeadStage[] = [
      "prospeccao_inicial",
      "qualificacao_logistica",
      "cotacao_frete",
      "proposta_enviada",
      "negociacao",
      "fechado_ganho",
    ];

    const stageDurationsDays: Record<LeadStage, number[]> = {
      prospeccao_inicial: [],
      qualificacao_logistica: [],
      cotacao_frete: [],
      proposta_enviada: [],
      negociacao: [],
      fechado_ganho: [],
      perdido: [],
    };

    const closedLeadTimesDays: number[] = [];
    const openLeadTimesDays: number[] = [];

    const accountTimings = filteredAccounts.map((acc) => {
      const hist = acc.stage_history || {};
      const startMs = new Date(hist.prospeccao_inicial || acc.created_at).getTime();
      const isClosedWon = acc.estagio === "fechado_ganho" || acc.status === "cliente_ativo";
      const endMs = isClosedWon
        ? new Date(acc.fechado_em || hist.fechado_ganho || acc.updated_at).getTime()
        : acc.status === "desqualificado" && acc.data_desqualificacao
        ? new Date(acc.data_desqualificacao).getTime()
        : Date.now();

      const totalLeadTimeDays = Math.max(0.5, Number(((Math.max(startMs, endMs) - startMs) / DAY_MS).toFixed(1)));
      if (isClosedWon) {
        closedLeadTimesDays.push(totalLeadTimeDays);
      } else if (acc.status === "lead") {
        openLeadTimesDays.push(totalLeadTimeDays);
      }

      // Calcula o Cycle Time em cada coluna pela qual o card passou
      const perStageDays: Partial<Record<LeadStage, number>> = {};
      for (let i = 0; i < orderedKeys.length - 1; i++) {
        const currKey = orderedKeys[i];
        const nextKey = orderedKeys[i + 1];
        const tStart = hist[currKey] ? new Date(hist[currKey]!).getTime() : null;
        const tNext = hist[nextKey] ? new Date(hist[nextKey]!).getTime() : null;

        if (tStart && tNext && tNext >= tStart) {
          const d = Math.max(0.3, Number(((tNext - tStart) / DAY_MS).toFixed(1)));
          perStageDays[currKey] = d;
          stageDurationsDays[currKey].push(d);
        } else if (tStart && acc.estagio === currKey) {
          const d = Math.max(0.5, Number(((Math.max(tStart, endMs) - tStart) / DAY_MS).toFixed(1)));
          perStageDays[currKey] = d;
          stageDurationsDays[currKey].push(d);
        }
      }

      return {
        account: acc,
        isClosedWon,
        totalLeadTimeDays,
        perStageDays,
      };
    });

    const columnsCycleTime = WORKFLOW_COLUMNS.map((col) => {
      const samples = stageDurationsDays[col.key] || [];
      const avgDays =
        samples.length > 0
          ? Number((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(1))
          : 0;

      const countInStage = filteredAccounts.filter(
        (a) =>
          (col.key === "fechado_ganho" &&
            (a.estagio === "fechado_ganho" || a.status === "cliente_ativo")) ||
          (a.status === "lead" && (a.estagio || "prospeccao_inicial") === col.key)
      ).length;

      return {
        ...col,
        avgDays,
        samplesCount: samples.length,
        countInStage,
      };
    });

    const cycleSum = Number(
      columnsCycleTime
        .slice(0, 5)
        .reduce((acc, c) => acc + c.avgDays, 0)
        .toFixed(1)
    );

    const avgOpenLeadTime =
      openLeadTimesDays.length > 0
        ? Number(
            (openLeadTimesDays.reduce((a, b) => a + b, 0) / openLeadTimesDays.length).toFixed(1)
          )
        : 0;

    // Opção A: Usa a média real dos negócios ganhos no filtro; se não houver fechamentos no filtro,
    // exibe a soma real do tempo acumulado das etapas percorridas pelos leads filtrados.
    const avgClosedLeadTime =
      closedLeadTimesDays.length > 0
        ? Number(
            (
              closedLeadTimesDays.reduce((a, b) => a + b, 0) / closedLeadTimesDays.length
            ).toFixed(1)
          )
        : cycleSum > 0
        ? cycleSum
        : avgOpenLeadTime;

    const totalCycleSum = cycleSum;

    // Identifica a etapa gargalo real (maior Cycle Time > 0 entre as colunas 1 a 5 no filtro)
    const activeColumns = columnsCycleTime.slice(0, 5).filter((c) => c.avgDays > 0);
    const bottleneckColumn =
      activeColumns.length > 0
        ? activeColumns.reduce((max, c) => (c.avgDays > max.avgDays ? c : max), activeColumns[0])
        : null;

    return {
      columnsCycleTime,
      avgClosedLeadTime,
      avgOpenLeadTime,
      totalCycleSum,
      bottleneckColumn,
      accountTimings,
    };
  }, [filteredAccounts]);

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
            Central de Relatórios, Performance & Lead Time
          </h1>
          <p className="text-sm text-[#57534E] mt-1">
            Gráficos de performance do operador comercial, métricas de Lead Time / Cycle Time por coluna do workflow e dossiês em PDF.
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

      {/* KPIS DE FECHAMENTO DO MÊS */}
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
              Lead Time Médio (1º Contato ➔ Ganho)
            </span>
            <Timer className="w-4 h-4 text-[#0D9488]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#0F172A] mt-1.5">
            {workflowTiming.avgClosedLeadTime} <span className="text-sm font-sans font-semibold text-[#57534E]">dias</span>
          </div>
          <div className="text-[11px] text-[#57534E] mt-1">
            Gargalo atual:{" "}
            <strong className="text-amber-800">
              {workflowTiming.bottleneckColumn?.shortTitle || "Sem gargalo no filtro"}
            </strong>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* US-17: GRÁFICO DE PERFORMANCE DO OPERADOR COMERCIAL                  */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal: Performance por Operador */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E7E5E4] p-6 shadow-subtle space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E5E4] pb-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1C1917] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#0D9488]" />
                Gráfico de Performance do Operador Comercial
              </h2>
              <p className="text-xs text-[#57534E] mt-0.5">
                Comparativo de volume de contatos, atendimentos efetivos, cotações geradas e negócios ganhos.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium">
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0F172A]" /> Tentativas
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0D9488]" /> Com Sucesso
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Cotações
              </span>
            </div>
          </div>

          <div className="space-y-5">
            {operatorPerformance.rows.length === 0 ? (
              <div className="p-6 rounded-lg bg-[#FAFAF9] border border-[#E7E5E4] text-center text-xs text-[#78716C] italic">
                Nenhum operador comercial com empresas ou interações para os filtros selecionados.
              </div>
            ) : (
              operatorPerformance.rows.map((op) => {
                const callWidthPct =
                  op.totalCalls > 0
                    ? Math.max(6, Math.round((op.totalCalls / operatorPerformance.maxCalls) * 100))
                    : 0;
                const successWidthPct =
                  op.totalCalls > 0
                    ? Math.round((op.successCalls / operatorPerformance.maxCalls) * 100)
                    : 0;

                return (
                  <div
                    key={op.nome}
                    className="p-4 rounded-lg bg-[#FAFAF9] border border-[#E7E5E4] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white text-xs font-bold flex items-center justify-center">
                          {op.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-[#1C1917]">{op.nome}</span>
                          <span className="ml-2 text-[11px] text-[#78716C]">
                            ({op.leadsTrabalhados} empresas na carteira)
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                          Efetividade: {op.hitRate}%
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          {op.cotacoes} cotações
                        </span>
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-300 font-bold flex items-center gap-1">
                          <Award className="w-3 h-3 text-[#0D9488]" />
                          {op.fechados} ganhos ({op.conversionRate}%)
                        </span>
                      </div>
                    </div>

                    {/* Barras Visuais Comparativas */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[11px] text-[#57534E] mb-1">
                          <span>Total de Ligações / Contatos Realizados</span>
                          <strong className="font-mono text-[#1C1917]">{op.totalCalls} contatos</strong>
                        </div>
                        <div className="w-full h-3 bg-[#E7E5E4] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0F172A] rounded-full transition-all duration-500"
                            style={{ width: `${callWidthPct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-[#57534E] mb-1">
                          <span>Contatos Atendidos com Sucesso (Fala com Decisor)</span>
                          <strong className="font-mono text-[#0F766E]">
                            {op.successCalls} atendidos ({op.hitRate}%)
                          </strong>
                        </div>
                        <div className="w-full h-3 bg-[#E7E5E4] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0D9488] rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(successWidthPct, op.successCalls > 0 ? 6 : 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Gráfico Complementar: Mix de Canais de Prospecção */}
        <div className="bg-white rounded-lg border border-[#E7E5E4] p-6 shadow-subtle flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="border-b border-[#E7E5E4] pb-3">
              <h3 className="font-serif text-base font-bold text-[#1C1917]">
                Desempenho por Canal de Contato
              </h3>
              <p className="text-xs text-[#78716C] mt-0.5">
                Distribuição dos canais acionados pela operação comercial
              </p>
            </div>

            <div className="space-y-3.5 pt-1">
              {[
                {
                  label: "Ligação Telefônica",
                  count: operatorPerformance.channelCounts.telefone,
                  color: "bg-[#0F172A]",
                },
                {
                  label: "WhatsApp Comercial",
                  count: operatorPerformance.channelCounts.whatsapp,
                  color: "bg-[#0D9488]",
                },
                {
                  label: "E-mail / Proposta",
                  count: operatorPerformance.channelCounts.email,
                  color: "bg-blue-600",
                },
                {
                  label: "Reunião de Fechamento",
                  count: operatorPerformance.channelCounts.reuniao,
                  color: "bg-amber-500",
                },
              ].map((ch) => {
                const pct =
                  filteredLogs.length > 0
                    ? Math.round((ch.count / operatorPerformance.totalChannel) * 100)
                    : 0;
                return (
                  <div key={ch.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1C1917]">{ch.label}</span>
                      <span className="font-mono text-[#57534E]">
                        <strong>{ch.count}</strong> ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[#F5F5F4] border border-[#E7E5E4] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${ch.color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(pct, ch.count > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-md bg-[#F0FDFA] border border-[#99F6E4] text-xs text-[#115E59] space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#0D9488]" />
              Taxa de Conversão do Funil
            </div>
            <p className="text-[11px] leading-relaxed">
              Das <strong>{metrics.totalEmpresasTrabalhadas}</strong> empresas trabalhadas no filtro,{" "}
              <strong>{metrics.pediramCotacao}</strong> avançaram para cotação e{" "}
              <strong>{metrics.fecharamNegocio}</strong> converteram em fechamento.
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* US-18: VISÃO DE LEAD TIME E CYCLE TIME PELAS 6 COLUNAS DO WORKFLOW   */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] p-6 shadow-subtle space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E7E5E4] pb-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0D9488]" />
              Visão de Lead Time & Cycle Time nas Colunas do Workflow
            </h2>
            <p className="text-xs text-[#57534E] mt-0.5">
              <strong>Cycle Time:</strong> tempo médio que o lead permanece em cada coluna do Kanban •{" "}
              <strong>Lead Time:</strong> tempo total ponta a ponta desde o <em>1. Primeiro Contato</em> até o <em>6. Fechado / Ganho</em>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-md bg-[#F0FDFA] border border-[#99F6E4] text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">
                Lead Time Médio (1º Contato ➔ Fechado/Ganho)
              </span>
              <span className="font-serif text-lg font-bold text-[#115E59]">
                {workflowTiming.avgClosedLeadTime} dias corridos
              </span>
            </div>
          </div>
        </div>

        {/* Fluxo Horizontal de Cycle Time por Coluna (Colunas 1 a 6) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {workflowTiming.columnsCycleTime.map((col, index) => {
            const isClosedCol = col.key === "fechado_ganho";
            const isBottleneck =
              !isClosedCol && col.key === workflowTiming.bottleneckColumn?.key;

            return (
              <div
                key={col.key}
                className={`relative rounded-lg border p-4 flex flex-col justify-between transition-all ${
                  isClosedCol
                    ? "bg-[#F0FDFA] border-[#99F6E4]"
                    : isBottleneck
                    ? "bg-amber-50/70 border-amber-300"
                    : "bg-[#FAFAF9] border-[#E7E5E4]"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${col.badgeBg}`}
                    >
                      Coluna {index + 1}
                    </span>
                    {isBottleneck && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                        Maior Tempo
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-xs font-bold text-[#1C1917] pt-1">
                    {col.title}
                  </h3>
                </div>

                <div className="my-3 pt-2 border-t border-[#E7E5E4]/80">
                  {isClosedCol ? (
                    <>
                      <span className="block text-[10px] uppercase font-semibold text-[#0F766E]">
                        Lead Time Total
                      </span>
                      <div className="text-xl font-serif font-bold text-[#047857] mt-0.5">
                        {workflowTiming.avgClosedLeadTime}{" "}
                        <span className="text-xs font-sans font-normal">dias</span>
                      </div>
                      <span className="text-[10px] text-[#0F766E] block mt-0.5">
                        Do 1º Contato ao Ganho
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-[10px] uppercase font-semibold text-[#78716C]">
                        Cycle Time Médio
                      </span>
                      <div className="text-xl font-serif font-bold text-[#1C1917] mt-0.5">
                        {col.avgDays}{" "}
                        <span className="text-xs font-sans font-normal text-[#57534E]">dias</span>
                      </div>
                      <span className="text-[10px] text-[#78716C] block mt-0.5">
                        {col.countInStage} card(s) nesta etapa
                      </span>
                    </>
                  )}
                </div>

                {index < workflowTiming.columnsCycleTime.length - 1 && (
                  <div className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-white border border-[#D6D3D1] items-center justify-center text-[#78716C] shadow-sm">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Barra Proporcional Empilhada do Cycle Time ao longo do Funil */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-[#57534E]">
            <span className="font-semibold">
              Proporção do Tempo Gasto em Cada Etapa até o Fechamento (Composição do Lead Time)
            </span>
            <span className="font-mono">
              Soma média das etapas: <strong>{workflowTiming.totalCycleSum.toFixed(1)} dias</strong>
            </span>
          </div>

          {workflowTiming.totalCycleSum === 0 ? (
            <div className="w-full h-8 rounded-md flex items-center justify-center bg-[#FAFAF9] border border-[#E7E5E4] text-xs text-[#78716C] italic">
              Sem dados de transição nas colunas para o filtro selecionado.
            </div>
          ) : (
            <div className="w-full h-6 rounded-md overflow-hidden flex border border-[#D6D3D1]">
              {workflowTiming.columnsCycleTime
                .slice(0, 5)
                .filter((col) => col.avgDays > 0)
                .map((col) => {
                  const pct = Math.max(
                    8,
                    Math.round((col.avgDays / workflowTiming.totalCycleSum) * 100)
                  );
                  return (
                    <div
                      key={col.key}
                      style={{ width: `${pct}%` }}
                      className={`${col.barColor} text-white text-[10px] font-bold flex items-center justify-center px-1 truncate transition-all`}
                      title={`${col.title}: ${col.avgDays} dias (${pct}%)`}
                    >
                      {col.shortTitle} ({col.avgDays}d)
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Tabela Resumo de Cycle Time & Lead Time por Oportunidade */}
        <div className="pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#57534E] mb-2.5">
            Rastreabilidade de Tempo por Empresa (Cycle Time por Coluna & Lead Time Acumulado)
          </h3>
          <div className="overflow-x-auto border border-[#E7E5E4] rounded-md">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F5F4] text-[#57534E] text-[11px] uppercase font-semibold border-b border-[#E7E5E4]">
                <tr>
                  <th className="py-2.5 px-3">Empresa</th>
                  <th className="py-2.5 px-3">Etapa Atual</th>
                  <th className="py-2.5 px-3 text-center">1. 1º Contato</th>
                  <th className="py-2.5 px-3 text-center">2. Perfil & Frota</th>
                  <th className="py-2.5 px-3 text-center">3. Cotação</th>
                  <th className="py-2.5 px-3 text-center">4. Proposta</th>
                  <th className="py-2.5 px-3 text-center">5. Negociação</th>
                  <th className="py-2.5 px-3 text-right">Lead Time Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {workflowTiming.accountTimings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#A8A29E] italic">
                      Nenhuma empresa encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  workflowTiming.accountTimings.map(
                    ({ account: acc, isClosedWon, totalLeadTimeDays, perStageDays }) => (
                      <tr key={acc.id} className="hover:bg-[#FAFAF9]">
                        <td className="py-2.5 px-3 font-semibold text-[#1C1917]">
                          {acc.razao_social}
                        </td>
                        <td className="py-2.5 px-3">
                          {acc.status === "lead" ? (
                            <StatusBadge stage={acc.estagio} size="sm" />
                          ) : (
                            <StatusBadge status={acc.status} size="sm" />
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-[#57534E]">
                          {perStageDays.prospeccao_inicial ? `${perStageDays.prospeccao_inicial}d` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-[#57534E]">
                          {perStageDays.qualificacao_logistica ? `${perStageDays.qualificacao_logistica}d` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-[#57534E]">
                          {perStageDays.cotacao_frete ? `${perStageDays.cotacao_frete}d` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-[#57534E]">
                          {perStageDays.proposta_enviada ? `${perStageDays.proposta_enviada}d` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-[#57534E]">
                          {perStageDays.negociacao ? `${perStageDays.negociacao}d` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              isClosedWon
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {totalLeadTimeDays} dias {isClosedWon ? "(Fechado)" : "(Em curso)"}
                          </span>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
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
