"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchAllAccounts,
  updateAccount,
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
  ContactLog,
  OperatorUser,
  AppUser,
} from "@/types";
import { cleanCNPJ } from "@/lib/utils";
import { KanbanCard } from "@/components/kanban/KanbanCard";
import { LeadDetailsModal } from "@/components/kanban/LeadDetailsModal";
import { DisqualifyModal } from "@/components/kanban/DisqualifyModal";
import {
  Truck,
  ShieldCheck,
  AlertOctagon,
  UserPlus,
  Search,
  GripVertical,
  UserCheck,
  BarChart3,
  ArrowUpRight,
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
    color: "border-blue-500",
    badgeColor: "bg-blue-100 text-blue-800",
  },
  {
    key: "cotacao_frete",
    title: "3. Cotação de Frete",
    color: "border-amber-500",
    badgeColor: "bg-amber-100 text-amber-800",
  },
  {
    key: "proposta_enviada",
    title: "4. Proposta Enviada",
    color: "border-purple-500",
    badgeColor: "bg-purple-100 text-purple-800",
  },
  {
    key: "negociacao",
    title: "5. Negociação",
    color: "border-emerald-500",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  {
    key: "fechado_ganho",
    title: "6. Fechado / Ganho",
    color: "border-teal-600",
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

  async function handleOpenLeadDetails(lead: Account) {
    setSelectedLead(lead);
    setEditObservacoes(lead.observacoes_importantes || "");
    setNotesSavedSuccess(false);
    const logs = await fetchContactLogs(lead.id);
    setLeadLogs(logs);
  }

  async function handleSaveObservacoes() {
    if (!selectedLead) return;
    setIsSavingNotes(true);
    setNotesSavedSuccess(false);
    try {
      await updateAccount(selectedLead.id, {
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
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleQuickPrintClientPDF(lead: Account) {
    const logs = await fetchContactLogs(lead.id);
    generateClientDossierPDF(lead, logs);
  }

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
        usuario_nome: currentOp,
      });

      setLeadLogs((prev) => [created, ...prev]);
      setNovoResumo("");
    } finally {
      setIsSavingLog(false);
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
    <div className="space-y-4">
      {/* FAIXA EXECUTIVA UNIFICADA: TÍTULO + MÉTRICAS COMPACTAS + CTAs */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] p-4 shadow-subtle flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#1C1917] leading-tight">
              Prospecção
            </h1>
            <p className="text-xs text-[#57534E] mt-0.5">
              Funil operacional de 6 etapas, dossiê em PDF por cliente e histórico de ligações.
            </p>
          </div>

          {/* Pílulas Executivas de KPI (Compactas para priorizar altura do Kanban) */}
          <div className="flex flex-wrap items-center gap-2 sm:pl-4 sm:border-l border-[#E7E5E4]">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#F0FDFA] border border-[#99F6E4]">
              <Truck className="w-4 h-4 text-[#0D9488]" />
              <div className="text-xs">
                <span className="font-serif font-bold text-sm text-[#1C1917] mr-1">
                  {leads.length}
                </span>
                <span className="text-[#0F766E] font-medium">no Funil</span>
              </div>
            </div>

            <Link
              href="/clientes-ativos"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] transition-colors group"
              title="Ver carteira de clientes ativos blindados"
            >
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <div className="text-xs">
                <span className="font-serif font-bold text-sm text-[#047857] mr-1">
                  {clientesAtivos.length}
                </span>
                <span className="text-[#065F46] font-medium">Clientes Ativos</span>
              </div>
              <ArrowUpRight className="w-3 h-3 text-[#059669] opacity-70 group-hover:opacity-100" />
            </Link>

            <Link
              href="/desqualificados"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] transition-colors group"
              title="Ver histórico de contas recusadas / sem fit"
            >
              <AlertOctagon className="w-4 h-4 text-[#DC2626]" />
              <div className="text-xs">
                <span className="font-serif font-bold text-sm text-[#B91C1C] mr-1">
                  {desqualificados.length}
                </span>
                <span className="text-[#991B1B] font-medium">Recusados</span>
              </div>
              <ArrowUpRight className="w-3 h-3 text-[#DC2626] opacity-70 group-hover:opacity-100" />
            </Link>
          </div>
        </div>

        {/* Barra de Busca, Filtro de Operadora e Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar cliente (ex: Tauste), CNPJ ou cidade..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-[#D6D3D1] bg-[#FAFAF9] focus:bg-white text-xs focus-ring"
            />
          </div>

          {authUser?.perfil === "gestor" && (
            <div className="flex items-center gap-1.5 bg-[#FAFAF9] border border-[#D6D3D1] rounded-md px-2.5 py-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#0D9488]" />
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

          {authUser?.perfil === "gestor" && (
            <Link
              href="/relatorios"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F5F5F4] text-[#1C1917] border border-[#D6D3D1] text-xs font-semibold rounded-md shadow-subtle transition-all focus-ring"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Relatórios</span>
            </Link>
          )}

          <Link
            href="/novo-lead"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-md shadow-sm transition-all focus-ring"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Nova Prospecção</span>
          </Link>
        </div>
      </div>

      {/* SUB-BARRA DE DICA OPERACIONAL */}
      <div className="flex items-center justify-between text-xs text-[#57534E] px-1">
        <span className="inline-flex items-center gap-1.5 text-[#0F766E] font-medium">
          <GripVertical className="w-3.5 h-3.5 text-[#0D9488]" />
          Arraste os cards entre as 6 colunas ou clique em &ldquo;Ficha & Ligações&rdquo; para anotar contatos e emitir PDF
        </span>
        <span className="font-semibold text-[#1C1917]">
          Exibindo {filteredLeads.length} oportunidade(s)
        </span>
      </div>

      {/* KANBAN BOARD EM GRID DE 6 COLUNAS (ZERO BARRA DE ROLAGEM HORIZONTAL NO DESKTOP) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-start pb-6">
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
              className={`rounded-lg border transition-all flex flex-col min-h-[540px] max-h-[calc(100vh-210px)] ${
                isOver
                  ? "bg-[#F0FDFA] border-[#0D9488] ring-2 ring-[#0D9488]/20"
                  : "bg-[#F5F5F4]/90 border-[#E7E5E4]"
              }`}
            >
              {/* Cabeçalho da Coluna */}
              <div
                className={`px-3 py-2.5 border-b-2 ${stage.color} bg-white rounded-t-lg flex items-center justify-between gap-1`}
              >
                <h3 className="font-sans text-xs font-bold text-[#1C1917] tracking-tight truncate">
                  {stage.title}
                </h3>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${stage.badgeColor}`}
                >
                  {stageLeads.length}
                </span>
              </div>

              {/* Lista de Cards da Coluna */}
              <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5 scrollbar-none">
                {loading ? (
                  <div className="p-6 text-center text-xs text-[#A8A29E] animate-pulse">
                    Carregando...
                  </div>
                ) : stageLeads.length === 0 ? (
                  <div
                    className={`p-5 text-center text-[11px] rounded-md border border-dashed transition-colors ${
                      isOver
                        ? "border-[#0D9488] text-[#0D9488] bg-white font-semibold"
                        : "border-[#D6D3D1] text-[#A8A29E] italic"
                    }`}
                  >
                    {isOver ? "Solte o card aqui" : "Nenhum lead nesta etapa"}
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      stageKey={stage.key}
                      isDragging={draggedAccountId === lead.id}
                      whatsAppUrl={getWhatsAppUrl(lead)}
                      onDragStart={handleDragStart}
                      onDragEnd={() => setDraggedAccountId(null)}
                      onOpenDetails={handleOpenLeadDetails}
                      onQuickPrintPDF={handleQuickPrintClientPDF}
                      onDisqualify={setDesqualifyingAccount}
                      onAdvanceStage={handleAdvanceStage}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE FICHA DO CLIENTE, OBSERVAÇÕES IMPORTANTES, PDF E HISTÓRICO DE LIGAÇÕES */}
      {selectedLead && (
        <LeadDetailsModal
          selectedLead={selectedLead}
          leadLogs={leadLogs}
          editObservacoes={editObservacoes}
          setEditObservacoes={setEditObservacoes}
          isSavingNotes={isSavingNotes}
          notesSavedSuccess={notesSavedSuccess}
          onSaveObservacoes={handleSaveObservacoes}
          novoCanal={novoCanal}
          setNovoCanal={setNovoCanal}
          novoResultado={novoResultado}
          setNovoResultado={setNovoResultado}
          novoResumo={novoResumo}
          setNovoResumo={setNovoResumo}
          isSavingLog={isSavingLog}
          onAddContactLog={handleAddContactLog}
          currentOperatorName={getCurrentOperator()}
          whatsAppUrl={getWhatsAppUrl(selectedLead)}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {/* MODAL DE DESQUALIFICAÇÃO */}
      {desqualifyingAccount && (
        <DisqualifyModal
          account={desqualifyingAccount}
          motivoRecusa={motivoRecusa}
          setMotivoRecusa={setMotivoRecusa}
          detalheRecusa={detalheRecusa}
          setDetalheRecusa={setDetalheRecusa}
          onConfirm={confirmDesqualification}
          onCancel={() => setDesqualifyingAccount(null)}
        />
      )}
    </div>
  );
}
