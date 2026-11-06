"use client";

import React from "react";
import { Account, ContactLog } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCNPJ } from "@/lib/utils";
import { generateClientDossierPDF } from "@/lib/pdf-report";
import {
  Printer,
  FileText,
  Check,
  Save,
  MessageSquare,
  ExternalLink,
  Plus,
  XCircle,
  ChevronRight,
} from "lucide-react";

interface LeadDetailsModalProps {
  selectedLead: Account;
  leadLogs: ContactLog[];
  editObservacoes: string;
  setEditObservacoes: (v: string) => void;
  isSavingNotes: boolean;
  notesSavedSuccess: boolean;
  onSaveObservacoes: () => void;
  novoCanal: ContactLog["tipo_contato"];
  setNovoCanal: (v: ContactLog["tipo_contato"]) => void;
  novoResultado: ContactLog["resultado"];
  setNovoResultado: (v: ContactLog["resultado"]) => void;
  novoResumo: string;
  setNovoResumo: (v: string) => void;
  isSavingLog: boolean;
  onAddContactLog: (e: React.FormEvent) => void;
  currentOperatorName: string;
  whatsAppUrl: string | null;
  onAdvanceStage: (lead: Account) => void;
  onDisqualify: (lead: Account) => void;
  onClose: () => void;
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  selectedLead,
  leadLogs,
  editObservacoes,
  setEditObservacoes,
  isSavingNotes,
  notesSavedSuccess,
  onSaveObservacoes,
  novoCanal,
  setNovoCanal,
  novoResultado,
  setNovoResultado,
  novoResumo,
  setNovoResumo,
  isSavingLog,
  onAddContactLog,
  currentOperatorName,
  whatsAppUrl,
  onAdvanceStage,
  onDisqualify,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#E7E5E4] max-w-3xl w-full p-6 shadow-floating space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header com Botão de Relatório PDF e Ações do Funil */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#E7E5E4] pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">
                {selectedLead.nome_fantasia || selectedLead.razao_social}
              </h3>
              <StatusBadge stage={selectedLead.estagio} size="sm" />
            </div>
            {selectedLead.nome_fantasia && (
              <div className="text-xs text-[#57534E] font-medium mt-0.5">
                Razão Social: {selectedLead.razao_social}
              </div>
            )}
            <div className="text-xs font-mono text-[#57534E] mt-1 flex flex-wrap items-center gap-3">
              <span>CNPJ: {formatCNPJ(selectedLead.cnpj)}</span>
              <span>•</span>
              <span>
                Operadora:{" "}
                <strong>{selectedLead.sdr_responsavel_nome || "Ana Paula (Comercial)"}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => generateClientDossierPDF(selectedLead, leadLogs)}
              className="px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Relatório PDF</span>
            </button>

            {selectedLead.estagio !== "fechado_ganho" && (
              <button
                type="button"
                onClick={() => {
                  onAdvanceStage(selectedLead);
                  onClose();
                }}
                className="px-3 py-1.5 bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4] text-xs font-semibold rounded-md flex items-center gap-1 transition-colors"
              >
                <span>Avançar Etapa</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onDisqualify(selectedLead);
              }}
              className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors"
              title="Desqualificar oportunidade"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Desqualificar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 px-2 py-1 text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Dados Cadastrais & Perfil Completo de Carga/Frota */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#FAFAF9] rounded-md border border-[#E7E5E4] text-xs">
          <div>
            <strong className="text-slate-700">Decisor:</strong>{" "}
            {selectedLead.contato_nome || "Não informado"} (
            {selectedLead.contato_cargo || "Cargo n/d"})
          </div>
          <div>
            <strong className="text-slate-700">Telefone / E-mail:</strong>{" "}
            {selectedLead.telefone || "Não informado"}
            {selectedLead.email ? ` • ${selectedLead.email}` : ""}
          </div>
          <div>
            <strong className="text-slate-700">Modalidade:</strong>{" "}
            {selectedLead.tipo_carga || "Lotação (FTL)"}
          </div>
          <div>
            <strong className="text-slate-700">Cidade/UF:</strong> {selectedLead.cidade || "—"}/
            {selectedLead.uf || "—"}
          </div>
          {selectedLead.rotas_principais && selectedLead.rotas_principais.length > 0 && (
            <div className="sm:col-span-2">
              <strong className="text-slate-700">Rotas de Interesse:</strong>{" "}
              {selectedLead.rotas_principais.join(", ")}
            </div>
          )}
          {selectedLead.tipos_veiculos && selectedLead.tipos_veiculos.length > 0 && (
            <div className="sm:col-span-2">
              <strong className="text-slate-700">Frota / Veículos Demandados:</strong>{" "}
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
              onClick={onSaveObservacoes}
              disabled={isSavingNotes}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingNotes ? "Salvando..." : "Salvar Observações do Cliente"}</span>
            </button>
          </div>
        </div>

        {/* Ação Rápida WhatsApp */}
        {whatsAppUrl && (
          <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-md">
            <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Iniciar conversa com proposta logística via WhatsApp</span>
            </div>
            <a
              href={whatsAppUrl}
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
          onSubmit={onAddContactLog}
          className="space-y-3 p-4 bg-[#F5F5F4] rounded-md border border-[#E7E5E4]"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#1C1917] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#0D9488]" />
              Registrar Nova Tentativa de Contato / Ligação
            </h4>
            <span className="text-[11px] text-[#57534E]">
              Assinado por: <strong>{currentOperatorName}</strong>
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
  );
};
