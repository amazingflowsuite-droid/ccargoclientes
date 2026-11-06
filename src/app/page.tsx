"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchAllAccounts,
  updateAccount,
  checkCNPJCollision,
  fetchContactLogs,
  addContactLog,
  getCurrentOperator,
  getOperatorsList,
  getAuthenticatedUser,
  fetchAllAppUsers,
} from "@/lib/store";
import { generateClientDossierPDF } from "@/lib/pdf-report";
import {
  Account,
  LeadStage,
  DisqualificationReason,
  CollisionCheckResult,
  ContactLog,
  OperatorUser,
  AppUser,
} from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CollisionAlert } from "@/components/CollisionAlert";
import { formatCNPJ, cleanCNPJ } from "@/lib/utils";
import {
  Truck,
  ShieldCheck,
  AlertOctagon,
  UserPlus,
  Search,
  ChevronRight,
  Phone,
  MapPin,
  FileText,
  MessageSquare,
  GripVertical,
  Plus,
  ExternalLink,
  Printer,
  Save,
  Check,
  UserCheck,
  BarChart3,
} from "lucide-react";

const STAGES: { key: LeadStage; title: string; color: string; badgeColor: string }[] = [
  {
    key: "prospeccao_inicial",
    title: "1. Primeiro Contato",
    color: "border-slate-400",
    badgeColor: "bg-slate-100 text-slate-800",
  },
  {
    key: "qualificacao_logistica",
    title: "2. Perfil & Frota",
    color: "border-blue-400",
    badgeColor: "bg-blue-100 text-blue-800",
  },
  {
    key: "cotacao_frete",
    title: "3. Cotação de Frete",
    color: "border-amber-400",
    badgeColor: "bg-amber-100 text-amber-800",
  },
  {
    key: "proposta_enviada",
    title: "4. Proposta Enviada",
    color: "border-purple-400",
    badgeColor: "bg-purple-100 text-purple-800",
  },
  {
    key: "negociacao",
    title: "5. Negociação",
    color: "border-emerald-400",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  {
    key: "fechado_ganho",
    title: "6. Fechado / Ganho",
    color: "border-teal-500",
    badgeColor: "bg-teal-100 text-teal-900",
  },
];

export default function DashboardKanbanPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Operadores & Usuário Autenticado (RBAC)
  const [authUser, setAuthUser] = useState<AppUser | null>(null);
  const [operators, setOperators] = useState<OperatorUser[]>([]);
  const [operatorFilter, setOperatorFilter] = useState<string>("TODOS");

  // Quick CNPJ Check
  const [quickCnpj, setQuickCnpj] = useState("");
  const [quickCollision, setQuickCollision] = useState<CollisionCheckResult | null>(null);
  const [isCheckingQuick, setIsCheckingQuick] = useState(false);

  // Modal de Desqualificação (US-04)
  const [desqualifyingAccount, setDesqualifyingAccount] = useState<Account | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState<DisqualificationReason>("baixa_rentabilidade");
  const [detalheRecusa, setDetalheRecusa] = useState("");

  // Modal de Detalhes, Observações & Histórico de Contatos (US-07, US-10, US-11)
  const [selectedLead, setSelectedLead] = useState<Account | null>(null);
  const [leadLogs, setLeadLogs] = useState<ContactLog[]>([]);
  const [editObservacoes, setEditObservacoes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  const [novoCanal, setNovoCanal] = useState<"telefone" | "whatsapp" | "email" | "reuniao">(
    "telefone"
  );
  const [novoResultado, setNovoResultado] = useState<
    "sucesso" | "sem_resposta" | "reagendado" | "recusado"
  >("sucesso");
  const [novoResumo, setNovoResumo] = useState("");
  const [proximoFollowUp, setProximoFollowUp] = useState("");
  const [isSavingLog, setIsSavingLog] = useState(false);

  // Filtro de texto no Kanban
  const [searchFilter, setSearchFilter] = useState("");

  // Drag and Drop State
  const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  useEffect(() => {
    setAuthUser(getAuthenticatedUser());
    fetchAllAppUsers().then(() => {
      setOperators(getOperatorsList());
    });
    loadData();

    const handleAuthOrOpChange = () => {
      setAuthUser(getAuthenticatedUser());
      setOperators(getOperatorsList());
    };
    window.addEventListener("ccargo-operator-changed", handleAuthOrOpChange);
    window.addEventListener("ccargo-auth-changed", handleAuthOrOpChange);
    return () => {
      window.removeEventListener("ccargo-operator-changed", handleAuthOrOpChange);
      window.removeEventListener("ccargo-auth-changed", handleAuthOrOpChange);
    };
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchAllAccounts();
      setAccounts(data);
    } finally {
      setLoading(false);
    }
  }

  // Carregar histórico e observações quando um lead for selecionado
  async function handleOpenLeadDetails(lead: Account) {
    setSelectedLead(lead);
    setEditObservacoes(lead.observacoes_importantes || "");
    setNotesSavedSuccess(false);
    const logs = await fetchContactLogs(lead.id);
    setLeadLogs(logs);
  }

  // Salvar Observações Importantes do Cliente (US-10)
  async function handleSaveObservacoes() {
    if (!selectedLead) return;
    setIsSavingNotes(true);
    setNotesSavedSuccess(false);
    try {
      const updated = await updateAccount(selectedLead.id, {
        cnpj: selectedLead.cnpj,
        observacoes_importantes: editObservacoes.trim(),
      });
      const newNote = editObservacoes.trim();
      setSelectedLead((prev) => (prev ? { ...prev, observacoes_importantes: newNote } : null));
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === selectedLead.id ? { ...a, observacoes_importantes: newNote } : a
        )
      );
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 3000);
      if (updated) {
        // sincronizado
      }
    } finally {
      setIsSavingNotes(false);
    }
  }

  // Gerar PDF direto do Card ou do Modal (US-11)
  async function handleQuickPrintClientPDF(lead: Account) {
    const logs = await fetchContactLogs(lead.id);
    generateClientDossierPDF(lead, logs);
  }

  // Adicionar novo registro de contato (US-07 e US-09)
  async function handleAddContactLog(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLead || !novoResumo.trim()) return;

    setIsSavingLog(true);
    try {
      const currentOp = getCurrentOperator();
      const created = await addContactLog({
        account_id: selectedLead.id,
        tipo_contato: novoCanal,
        resultado: novoResultado,
        resumo: novoResumo.trim(),
        proximo_contato: proximoFollowUp || undefined,
        usuario_nome: currentOp,
      });

      setLeadLogs((prev) => [created, ...prev]);
      setNovoResumo("");
      setProximoFollowUp("");
    } finally {
      setIsSavingLog(false);
    }
  }

  // Quick CNPJ Check
  async function handleQuickCheck(e: React.FormEvent) {
    e.preventDefault();
    const clean = cleanCNPJ(quickCnpj);
    if (clean.length !== 14) {
      alert("Digite os 14 dígitos do CNPJ para checagem rápida.");
      return;
    }
    setIsCheckingQuick(true);
    try {
      const result = await checkCNPJCollision(clean);
      setQuickCollision(result);
    } finally {
      setIsCheckingQuick(false);
    }
  }

  // DRAG AND DROP HANDLERS
  function handleDragStart(e: React.DragEvent, accountId: string) {
    setDraggedAccountId(accountId);
    e.dataTransfer.setData("text/plain", accountId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, stageKey: LeadStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey);
    }
  }

  function handleDragLeave(stageKey: LeadStage) {
    if (dragOverStage === stageKey) {
      setDragOverStage(null);
    }
  }

  async function handleDrop(e: React.DragEvent, targetStage: LeadStage) {
    e.preventDefault();
    setDragOverStage(null);
    const accountId = draggedAccountId || e.dataTransfer.getData("text/plain");
    if (!accountId) return;

    const account = accounts.find((a) => a.id === accountId);
    if (!account || account.estagio === targetStage) return;

    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, estagio: targetStage } : a))
    );

    if (targetStage === "fechado_ganho") {
      const turnIntoClient = confirm(
        `Parabéns pelo fechamento com ${account.razao_social}!\nDeseja promovê-lo a CLIENTE ATIVO da carteira (blindando contra contatos de outros operadores)?`
      );
      if (turnIntoClient) {
        await updateAccount(account.id, {
          status: "cliente_ativo",
          estagio: "fechado_ganho",
          gerente_conta_nome: account.sdr_responsavel_nome || getCurrentOperator(),
        });
        loadData();
        return;
      }
    }

    await updateAccount(account.id, { estagio: targetStage });
    loadData();
  }

  // Avançar estágio pelo botão
  async function handleAdvanceStage(account: Account) {
    const stageOrder: LeadStage[] = [
      "prospeccao_inicial",
      "qualificacao_logistica",
      "cotacao_frete",
      "proposta_enviada",
      "negociacao",
      "fechado_ganho",
    ];

    const currentIndex = stageOrder.indexOf(account.estagio || "prospeccao_inicial");
    if (currentIndex < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIndex + 1];

      if (nextStage === "fechado_ganho") {
        const turnIntoClient = confirm(
          "Parabéns! Deseja converter este lead imediatamente em CLIENTE ATIVO da carteira (blindando contra contatos de prospecção)?"
        );
        if (turnIntoClient) {
          await updateAccount(account.id, {
            status: "cliente_ativo",
            estagio: "fechado_ganho",
            gerente_conta_nome: account.sdr_responsavel_nome || getCurrentOperator(),
          });
          loadData();
          return;
        }
      }

      await updateAccount(account.id, { estagio: nextStage });
      loadData();
    }
  }

  // Executar Desqualificação (US-04)
  async function confirmDesqualification() {
    if (!desqualifyingAccount) return;
    if (detalheRecusa.trim().length < 15) {
      alert(
        "Por favor, descreva a justificativa da recusa com pelo menos 15 caracteres (ex: margem insuficiente, rota sem carga de retorno)."
      );
      return;
    }

    await updateAccount(desqualifyingAccount.id, {
      status: "desqualificado",
      estagio: "perdido",
      motivo_desqualificacao: motivoRecusa,
      detalhe_desqualificacao: detalheRecusa,
      data_desqualificacao: new Date().toISOString(),
    });

    setDesqualifyingAccount(null);
    setDetalheRecusa("");
    loadData();
  }

  // Gerador de Mensagem WhatsApp
  function getWhatsAppUrl(lead: Account): string | null {
    if (!lead.telefone) return null;
    const cleanNumber = cleanCNPJ(lead.telefone);
    const phoneWithCountry = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;

    const rotas = lead.rotas_principais?.length
      ? ` para as rotas ${lead.rotas_principais.join(", ")}`
      : "";
    const contato = lead.contato_nome ? `Olá, ${lead.contato_nome}!` : "Olá!";

    const text = `${contato} Sou da equipe comercial da CCargo Transportes Rodoviários. Identificamos a demanda logística da ${lead.razao_social}${rotas} e gostaríamos de apresentar nossa malha de frota e tarifas competitivas. Poderíamos conversar?`;

    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
  }

  const leads = accounts.filter((a) => a.status === "lead");
  const clientesAtivos = accounts.filter((a) => a.status === "cliente_ativo");
  const desqualificados = accounts.filter((a) => a.status === "desqualificado");

  const filteredLeads = leads.filter((l) => {
    if (operatorFilter !== "TODOS") {
      const resp = (l.sdr_responsavel_nome || "").toLowerCase();
      if (!resp.includes(operatorFilter.toLowerCase())) return false;
    }

    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      l.razao_social.toLowerCase().includes(term) ||
      (l.nome_fantasia && l.nome_fantasia.toLowerCase().includes(term)) ||
      l.cnpj.includes(cleanCNPJ(term)) ||
      (l.cidade && l.cidade.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8">
      {/* CABEÇALHO DO DASHBOARD & STATS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]">
            Gestão de Prospecção & Blindagem
          </h1>
          <p className="text-sm text-[#57534E] mt-1">
            Pipeline comercial, dossiê em PDF por cliente e fechamento mensal de contatos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {authUser?.perfil === "gestor" && (
            <Link
              href="/relatorios"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#F5F5F4] text-[#1C1917] border border-[#D6D3D1] text-sm font-semibold rounded-md shadow-subtle transition-all focus-ring"
            >
              <BarChart3 className="w-4 h-4 text-[#0D9488]" />
              Relatórios & PDF do Mês
            </Link>
          )}

          <Link
            href="/novo-lead"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold rounded-md shadow-sm transition-all focus-ring"
          >
            <UserPlus className="w-4 h-4 text-[#0D9488]" />
            Nova Prospecção
          </Link>
        </div>
      </div>

      {/* CARDS DE INDICADORES (MÉTRICAS DO ESCUDO) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E7E5E4] shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Leads no Funil
            </span>
            <div className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
              {leads.length}
            </div>
            <span className="text-xs text-[#0D9488] font-medium mt-0.5 block">
              Em qualificação e negociação
            </span>
          </div>
          <div className="w-11 h-11 rounded-md bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-center text-[#0D9488]">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <Link
          href="/clientes-ativos"
          className="bg-white p-5 rounded-lg border border-[#E7E5E4] shadow-subtle hover:border-[#A7F3D0] flex items-center justify-between transition-all group"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Clientes Ativos Blindados
            </span>
            <div className="text-2xl font-serif font-bold text-[#047857] mt-1">
              {clientesAtivos.length}
            </div>
            <span className="text-xs text-[#57534E] font-medium mt-0.5 block group-hover:text-[#047857]">
              Bloqueados contra prospecção ➔
            </span>
          </div>
          <div className="w-11 h-11 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </Link>

        <Link
          href="/desqualificados"
          className="bg-white p-5 rounded-lg border border-[#E7E5E4] shadow-subtle hover:border-[#FECACA] flex items-center justify-between transition-all group"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Contas Recusadas / Sem Fit
            </span>
            <div className="text-2xl font-serif font-bold text-[#B91C1C] mt-1">
              {desqualificados.length}
            </div>
            <span className="text-xs text-[#57534E] font-medium mt-0.5 block group-hover:text-[#B91C1C]">
              Histórico de inviabilidade ➔
            </span>
          </div>
          <div className="w-11 h-11 rounded-md bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626]">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </Link>
      </div>

      {/* QUICK SHIELD CHECK (CONSULTA RELÂMPAGO ANTES DE LIGAR) */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] p-5 shadow-subtle space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E5E4] pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
            <h3 className="font-serif text-sm font-bold text-[#1C1917]">
              Consulta Rápida de Blindagem (Antes de discar)
            </h3>
          </div>
          <span className="text-xs text-[#78716C]">
            Verifique instantaneamente se a empresa é cliente ou já foi recusada
          </span>
        </div>

        <form onSubmit={handleQuickCheck} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Digite o CNPJ para checar permissão de contato..."
              value={quickCnpj}
              onChange={(e) => setQuickCnpj(formatCNPJ(e.target.value))}
              maxLength={18}
              className="w-full pl-3.5 pr-10 py-2 rounded-md border border-[#D6D3D1] bg-[#FAFAF9] font-mono text-xs focus:bg-white focus-ring transition-all"
            />
            {quickCnpj && (
              <button
                type="button"
                onClick={() => {
                  setQuickCnpj("");
                  setQuickCollision(null);
                }}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isCheckingQuick || cleanCNPJ(quickCnpj).length !== 14}
            className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-[#0D9488]" />
            Checar CNPJ
          </button>
        </form>

        {quickCollision && (
          <div className="pt-1">
            <CollisionAlert collision={quickCollision} checking={isCheckingQuick} />
          </div>
        )}
      </div>

      {/* BARRA DE FILTRO POR EMPRESA E POR OPERADORA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtrar por empresa (ex: Tauste), CNPJ ou cidade..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#D6D3D1] bg-white text-xs focus-ring"
            />
          </div>

          {authUser?.perfil === "gestor" && (
            <div className="flex items-center gap-1.5 bg-white border border-[#D6D3D1] rounded-md px-2.5 py-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#0D9488]" />
              <span className="text-xs text-[#78716C]">Operadora:</span>
              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                className="text-xs font-semibold text-[#1C1917] bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Todas as Operadoras</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.nome}>
                    {op.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-[#57534E]">
          <span className="hidden lg:inline-flex items-center gap-1 text-[#0D9488] font-medium bg-[#F0FDFA] px-2.5 py-1 rounded border border-[#99F6E4]">
            <GripVertical className="w-3.5 h-3.5" />
            Arraste os cards ou clique em PDF para imprimir o dossiê
          </span>
          <span className="font-semibold text-[#1C1917]">{filteredLeads.length} oportunidades</span>
        </div>
      </div>

      {/* KANBAN BOARD COM DRAG AND DROP & LARGURA ERGONÔMICA */}
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
        {STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter(
            (l) => (l.estagio || "prospeccao_inicial") === stage.key
          );
          const isOver = dragOverStage === stage.key;

          return (
            <div
              key={stage.key}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={() => handleDragLeave(stage.key)}
              onDrop={(e) => handleDrop(e, stage.key)}
              className={`rounded-lg border transition-all flex flex-col min-w-[315px] w-[315px] flex-shrink-0 max-h-[820px] ${
                isOver
                  ? "bg-[#F0FDFA] border-[#0D9488] ring-2 ring-[#0D9488]/20"
                  : "bg-[#F5F5F4] border-[#E7E5E4]"
              }`}
            >
              {/* Stage Header */}
              <div
                className={`p-3.5 border-b-2 ${stage.color} bg-white rounded-t-lg flex items-center justify-between`}
              >
                <h3 className="font-sans text-xs font-bold text-[#1C1917] tracking-tight">
                  {stage.title}
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold ${stage.badgeColor}`}
                >
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3 scrollbar-none">
                {stageLeads.length === 0 ? (
                  <div
                    className={`p-6 text-center text-xs rounded-md border border-dashed transition-colors ${
                      isOver
                        ? "border-[#0D9488] text-[#0D9488] bg-white"
                        : "border-[#E7E5E4] text-[#A8A29E] italic"
                    }`}
                  >
                    {isOver ? "Solte o card aqui" : "Nenhum lead nesta etapa"}
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const isDragging = draggedAccountId === lead.id;
                    const whatsAppUrl = getWhatsAppUrl(lead);

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={() => setDraggedAccountId(null)}
                        className={`bg-white p-4 rounded-lg border shadow-subtle transition-all space-y-3 group cursor-grab active:cursor-grabbing hover:shadow-md ${
                          isDragging
                            ? "opacity-40 border-dashed border-[#0D9488]"
                            : "border-[#E7E5E4] hover:border-[#D6D3D1]"
                        }`}
                      >
                        {/* Header do Card com Drag Handle e Título Completo */}
                        <div className="flex items-start justify-between gap-2">
                          <div
                            onClick={() => handleOpenLeadDetails(lead)}
                            className="cursor-pointer flex-1"
                          >
                            <div className="font-serif font-bold text-sm text-[#1C1917] leading-snug hover:text-[#0D9488] transition-colors break-words">
                              {lead.razao_social}
                            </div>
                            {lead.nome_fantasia && (
                              <div className="text-xs text-[#57534E] mt-0.5 break-words">
                                {lead.nome_fantasia}
                              </div>
                            )}
                            <div className="text-[11px] font-mono text-[#78716C] mt-1">
                              {formatCNPJ(lead.cnpj)}
                            </div>
                          </div>

                          <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-0.5" />
                        </div>

                        {/* Resumo de Observações Importantes se houver (US-10) */}
                        {lead.observacoes_importantes && (
                          <div
                            onClick={() => handleOpenLeadDetails(lead)}
                            className="p-2 rounded bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 line-clamp-2 cursor-pointer"
                            title={lead.observacoes_importantes}
                          >
                            <strong>📌 Obs:</strong> {lead.observacoes_importantes}
                          </div>
                        )}

                        {/* Dados Logísticos */}
                        <div className="space-y-1.5 text-xs pt-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {lead.tipo_carga && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                                {lead.tipo_carga}
                              </span>
                            )}
                            {lead.cidade && (
                              <span className="flex items-center gap-1 text-[#78716C] text-[11px]">
                                <MapPin className="w-3 h-3 text-[#A8A29E]" />
                                {lead.cidade}/{lead.uf}
                              </span>
                            )}
                          </div>

                          {lead.rotas_principais && lead.rotas_principais.length > 0 && (
                            <div className="text-[11px] text-[#0D9488] font-medium break-words">
                              Rota: {lead.rotas_principais.join(", ")}
                            </div>
                          )}

                          {lead.tipos_veiculos && lead.tipos_veiculos.length > 0 && (
                            <div className="text-[10px] text-[#57534E] break-words">
                              Frota: {lead.tipos_veiculos.slice(0, 2).join(", ")}
                              {lead.tipos_veiculos.length > 2
                                ? ` +${lead.tipos_veiculos.length - 2}`
                                : ""}
                            </div>
                          )}
                        </div>

                        {/* Interlocutor, Operadora & Contato */}
                        <div className="pt-2 border-t border-[#F5F5F4] flex items-center justify-between text-xs text-[#57534E]">
                          <div className="truncate max-w-[165px]">
                            <span className="font-medium block truncate">
                              {lead.contato_nome || "Contato a mapear"}
                            </span>
                            <span className="text-[10px] text-[#78716C] block truncate">
                              👤 {lead.sdr_responsavel_nome || "Ana Paula (Comercial)"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuickPrintClientPDF(lead)}
                              title="Gerar Relatório em PDF deste cliente"
                              className="p-1.5 text-[#0F172A] hover:text-[#0D9488] hover:bg-slate-100 rounded transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {lead.telefone && (
                              <a
                                href={`tel:${cleanCNPJ(lead.telefone)}`}
                                title="Ligar para contato"
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {whatsAppUrl && (
                              <a
                                href={whatsAppUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Conversar no WhatsApp"
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Ações do Card */}
                        <div className="pt-2 border-t border-[#F5F5F4] flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenLeadDetails(lead)}
                            className="text-xs font-semibold text-[#0D9488] hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Ficha & Ligações</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDesqualifyingAccount(lead)}
                              className="text-[11px] font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                            >
                              Desqualificar
                            </button>

                            {stage.key !== "fechado_ganho" && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceStage(lead)}
                                className="text-[11px] font-semibold text-[#0F172A] hover:text-[#0D9488] hover:bg-slate-50 px-2.5 py-1 rounded flex items-center gap-1 transition-colors border border-slate-200"
                              >
                                <span>Avançar</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE FICHA DO CLIENTE, OBSERVAÇÕES IMPORTANTES, PDF E HISTÓRICO DE LIGAÇÕES (US-07, US-10, US-11) */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E7E5E4] max-w-3xl w-full p-6 shadow-floating space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Header com Botão de Relatório PDF em Destaque */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#E7E5E4] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-[#1C1917]">
                    {selectedLead.razao_social}
                  </h3>
                  <StatusBadge stage={selectedLead.estagio} size="sm" />
                </div>
                <div className="text-xs font-mono text-[#57534E] mt-1 flex flex-wrap items-center gap-3">
                  <span>CNPJ: {formatCNPJ(selectedLead.cnpj)}</span>
                  <span>•</span>
                  <span>
                    Operadora: <strong>{selectedLead.sdr_responsavel_nome || "Ana Paula (Comercial)"}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start">
                <button
                  type="button"
                  onClick={() => generateClientDossierPDF(selectedLead, leadLogs)}
                  className="px-3.5 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Relatório do Cliente (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="text-slate-400 hover:text-slate-600 px-2 py-1 text-lg font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Dados Cadastrais & Perfil de Carga */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#FAFAF9] rounded-md border border-[#E7E5E4] text-xs">
              <div>
                <strong className="text-slate-700">Decisor:</strong>{" "}
                {selectedLead.contato_nome || "Não informado"} (
                {selectedLead.contato_cargo || "Cargo n/d"})
              </div>
              <div>
                <strong className="text-slate-700">Telefone:</strong>{" "}
                {selectedLead.telefone || "Não informado"}
              </div>
              <div>
                <strong className="text-slate-700">Modalidade:</strong>{" "}
                {selectedLead.tipo_carga || "Lotação (FTL)"}
              </div>
              <div>
                <strong className="text-slate-700">Cidade/UF:</strong> {selectedLead.cidade || "—"}
                /{selectedLead.uf || "—"}
              </div>
              {selectedLead.rotas_principais && selectedLead.rotas_principais.length > 0 && (
                <div className="sm:col-span-2">
                  <strong className="text-slate-700">Rotas:</strong>{" "}
                  {selectedLead.rotas_principais.join(", ")}
                </div>
              )}
              {selectedLead.tipos_veiculos && selectedLead.tipos_veiculos.length > 0 && (
                <div className="sm:col-span-2">
                  <strong className="text-slate-700">Veículos:</strong>{" "}
                  {selectedLead.tipos_veiculos.join(", ")}
                </div>
              )}
            </div>

            {/* BLOCO EDITÁVEL: OBSERVAÇÕES IMPORTANTES E RESTRIÇÕES DO CLIENTE (US-10) */}
            <div className="p-4 bg-amber-50/60 border border-amber-300 rounded-md space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-serif font-bold text-xs uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                  Observações Importantes do Cliente (O que quer / O que não carrega)
                </label>
                {notesSavedSuccess && (
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Salvo com sucesso!
                  </span>
                )}
              </div>

              <textarea
                rows={3}
                placeholder="Anote aqui informações permanentes do cliente (ex: Só carrega paletizado, não carrega carga batida, exige veículo Sider, janela de descarga das 08h às 12h...). Isso sai em destaque no PDF!"
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                className="w-full px-3 py-2 rounded border border-amber-300 bg-white text-xs text-[#1C1917] focus-ring"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveObservacoes}
                  disabled={isSavingNotes}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingNotes ? "Salvando..." : "Salvar Observações do Cliente"}</span>
                </button>
              </div>
            </div>

            {/* Ação Rápida WhatsApp */}
            {getWhatsAppUrl(selectedLead) && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Iniciar conversa com proposta logística via WhatsApp</span>
                </div>
                <a
                  href={getWhatsAppUrl(selectedLead)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                >
                  <span>Abrir WhatsApp Web</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Form de Registro de Contato / Touchpoint */}
            <form
              onSubmit={handleAddContactLog}
              className="space-y-3 p-4 bg-[#F5F5F4] rounded-md border border-[#E7E5E4]"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#1C1917] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#0D9488]" />
                  Registrar Nova Tentativa de Contato / Ligação
                </h4>
                <span className="text-[11px] text-[#57534E]">
                  Assinado por: <strong>{getCurrentOperator()}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#57534E] mb-1">
                    Canal
                  </label>
                  <select
                    value={novoCanal}
                    onChange={(e) => setNovoCanal(e.target.value as ContactLog["tipo_contato"])}
                    className="w-full px-2.5 py-1.5 rounded border border-[#D6D3D1] bg-white text-xs focus-ring"
                  >
                    <option value="telefone">📞 Ligação Telefônica</option>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="email">✉️ E-mail</option>
                    <option value="reuniao">🤝 Reunião / Videoconferência</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#57534E] mb-1">
                    Resultado do Contato
                  </label>
                  <select
                    value={novoResultado}
                    onChange={(e) => setNovoResultado(e.target.value as ContactLog["resultado"])}
                    className="w-full px-2.5 py-1.5 rounded border border-[#D6D3D1] bg-white text-xs focus-ring"
                  >
                    <option value="sucesso">✅ Contato com Sucesso (Falou com decisor)</option>
                    <option value="sem_resposta">📵 Sem Resposta / Caixa Postal</option>
                    <option value="reagendado">📅 Reagendado para outra data</option>
                    <option value="recusado">⛔ Sem Interesse no Momento</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#57534E] mb-1">
                    O que foi falado com o contato / Motivo de não atender{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Liguei às 10h, caiu na caixa postal. / Ou: Falei com Henrique, pediu cotação para rota Marília-SP com carreta Sider."
                    value={novoResumo}
                    onChange={(e) => setNovoResumo(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded border border-[#D6D3D1] bg-white text-xs focus-ring"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSavingLog || !novoResumo.trim()}
                  className="px-4 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] disabled:bg-slate-300 text-white text-xs font-semibold rounded shadow-sm transition-colors"
                >
                  {isSavingLog ? "Salvando..." : "Registrar Contato no Histórico"}
                </button>
              </div>
            </form>

            {/* Linha do Tempo de Touchpoints */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#57534E]">
                  Histórico de Tentativas e Ligações ({leadLogs.length})
                </h4>
                <button
                  type="button"
                  onClick={() => generateClientDossierPDF(selectedLead, leadLogs)}
                  className="text-xs font-semibold text-[#0D9488] hover:underline flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Histórico Completo em PDF
                </button>
              </div>

              {leadLogs.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#A8A29E] italic border border-dashed rounded">
                  Nenhum registro de ligação ou mensagem anterior para este lead.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {leadLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-white rounded border border-[#E7E5E4] text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#78716C]">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          {log.tipo_contato === "telefone" && "📞 Ligação"}
                          {log.tipo_contato === "whatsapp" && "💬 WhatsApp"}
                          {log.tipo_contato === "email" && "✉️ E-mail"}
                          {log.tipo_contato === "reuniao" && "🤝 Reunião"}
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                              log.resultado === "sucesso"
                                ? "bg-emerald-100 text-emerald-800"
                                : log.resultado === "sem_resposta"
                                ? "bg-slate-100 text-slate-700"
                                : log.resultado === "reagendado"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {log.resultado === "sucesso"
                              ? "Contato com Sucesso"
                              : log.resultado === "sem_resposta"
                              ? "Sem Resposta / Caixa Postal"
                              : log.resultado === "reagendado"
                              ? "Reagendado"
                              : "Sem Interesse"}
                          </span>
                          <span className="text-[#57534E] font-normal">
                            • por <strong>{log.usuario_nome}</strong>
                          </span>
                        </span>
                        <span className="font-mono">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-slate-800 pt-0.5">{log.resumo}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DESQUALIFICAÇÃO (US-04) */}
      {desqualifyingAccount && (
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
              <strong>Empresa:</strong> {desqualifyingAccount.razao_social} (
              {formatCNPJ(desqualifyingAccount.cnpj)})
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
                onClick={() => setDesqualifyingAccount(null)}
                className="px-4 py-2 border border-[#D6D3D1] rounded-md text-xs font-medium text-[#1C1917] hover:bg-[#F5F5F4]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDesqualification}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold shadow-sm"
              >
                Confirmar Desqualificação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
