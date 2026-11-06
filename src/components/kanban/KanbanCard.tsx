"use client";

import React from "react";
import { Account, LeadStage } from "@/types";
import { formatCNPJ, cleanCNPJ } from "@/lib/utils";
import {
  GripVertical,
  MapPin,
  Printer,
  Phone,
  MessageSquare,
  FileText,
  ChevronRight,
  Clock,
  XCircle,
} from "lucide-react";

interface KanbanCardProps {
  lead: Account;
  stageKey: LeadStage;
  isDragging: boolean;
  whatsAppUrl: string | null;
  onDragStart: (e: React.DragEvent, accountId: string) => void;
  onDragEnd: () => void;
  onOpenDetails: (lead: Account) => void;
  onQuickPrintPDF: (lead: Account) => void;
  onDisqualify: (lead: Account) => void;
  onAdvanceStage: (lead: Account) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function getDaysInCurrentStage(lead: Account): number {
  const stage = lead.estagio || "prospeccao_inicial";
  const stageIso = lead.stage_history?.[stage] || lead.updated_at || lead.created_at;
  const startMs = new Date(stageIso).getTime();
  if (isNaN(startMs)) return 1;
  return Math.max(1, Math.round((Date.now() - startMs) / DAY_MS));
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  lead,
  stageKey,
  isDragging,
  whatsAppUrl,
  onDragStart,
  onDragEnd,
  onOpenDetails,
  onQuickPrintPDF,
  onDisqualify,
  onAdvanceStage,
}) => {
  const daysInStage = getDaysInCurrentStage(lead);
  const primaryTitle = lead.nome_fantasia || lead.razao_social;
  const secondaryTitle = lead.nome_fantasia ? lead.razao_social : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      className={`bg-white p-3.5 rounded-lg border shadow-subtle transition-all flex flex-col justify-between gap-2.5 group cursor-grab active:cursor-grabbing hover:shadow-md ${
        isDragging
          ? "opacity-40 border-dashed border-[#0D9488]"
          : "border-[#E7E5E4] hover:border-[#A8A29E]"
      }`}
    >
      {/* CAMADA 1: IDENTIFICAÇÃO + TEMPO NA ETAPA (CYCLE TIME) */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-1.5">
          <div
            onClick={() => onOpenDetails(lead)}
            className="cursor-pointer flex-1 min-w-0"
            title={`${lead.razao_social} (${formatCNPJ(lead.cnpj)})`}
          >
            <h4 className="font-serif font-bold text-[13px] text-[#1C1917] leading-snug group-hover:text-[#0D9488] transition-colors line-clamp-1">
              {primaryTitle}
            </h4>
            {secondaryTitle && (
              <div className="text-[11px] text-[#57534E] truncate mt-0.5">
                {secondaryTitle}
              </div>
            )}
            <div className="text-[10px] font-mono text-[#78716C] mt-0.5 flex items-center gap-1.5">
              <span>{formatCNPJ(lead.cnpj)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <span
              title={`Tempo nesta etapa do workflow: ${daysInStage} dia(s)`}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                daysInStage >= 5
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-[#F5F5F4] text-[#57534E]"
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              {daysInStage}d
            </span>
            <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
          </div>
        </div>

        {/* CAMADA 2: OBSERVAÇÃO IMPORTANTE COMPACTA + DADOS LOGÍSTICOS */}
        {lead.observacoes_importantes && (
          <div
            onClick={() => onOpenDetails(lead)}
            className="px-2 py-1.5 rounded bg-amber-50/90 border border-amber-200 text-[11px] text-amber-950 line-clamp-2 cursor-pointer leading-tight"
            title={lead.observacoes_importantes}
          >
            <strong className="font-semibold">📌 Obs:</strong> {lead.observacoes_importantes}
          </div>
        )}

        <div className="space-y-1 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            {lead.tipo_carga && (
              <span className="px-1.5 py-0.5 rounded bg-[#F5F5F4] border border-[#E7E5E4] text-[#1C1917] text-[10px] font-semibold">
                {lead.tipo_carga}
              </span>
            )}
            {lead.cidade && (
              <span className="inline-flex items-center gap-0.5 text-[#57534E] text-[11px] truncate">
                <MapPin className="w-3 h-3 text-[#0D9488] flex-shrink-0" />
                {lead.cidade}/{lead.uf}
              </span>
            )}
          </div>

          {lead.rotas_principais && lead.rotas_principais.length > 0 && (
            <div
              className="text-[11px] text-[#0F766E] font-medium truncate"
              title={lead.rotas_principais.join(", ")}
            >
              Rota: {lead.rotas_principais.join(", ")}
            </div>
          )}

          {lead.tipos_veiculos && lead.tipos_veiculos.length > 0 && (
            <div
              className="text-[10px] text-[#78716C] truncate"
              title={lead.tipos_veiculos.join(", ")}
            >
              Frota: {lead.tipos_veiculos.slice(0, 2).join(", ")}
              {lead.tipos_veiculos.length > 2 ? ` +${lead.tipos_veiculos.length - 2}` : ""}
            </div>
          )}
        </div>
      </div>

      {/* CAMADA 3 (FIXA NA BASE): CONTATO + AÇÕES RÁPIDAS + AVANÇO SEM QUEBRA */}
      <div className="pt-2 border-t border-[#F5F5F4] space-y-2 mt-auto">
        <div className="flex items-center justify-between gap-1 text-xs">
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-[11px] text-[#1C1917] block truncate">
              {lead.contato_nome || "Decisor a mapear"}
            </span>
            <span className="text-[10px] text-[#78716C] block truncate">
              👤 {lead.sdr_responsavel_nome || "Ana Paula (Comercial)"}
            </span>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => onQuickPrintPDF(lead)}
              title="Gerar Dossiê em PDF deste cliente"
              className="p-1.5 text-[#0F172A] hover:text-[#0D9488] hover:bg-[#F5F5F4] rounded transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            {lead.telefone && (
              <a
                href={`tel:${cleanCNPJ(lead.telefone)}`}
                title={`Ligar: ${lead.telefone}`}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-[#F5F5F4] rounded transition-colors"
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

            <button
              type="button"
              onClick={() => onDisqualify(lead)}
              title="Desqualificar / Sem Fit Logístico"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Rodapé de Botões Alinhados em Linha Única (Zero Quebra de Texto) */}
        <div className="pt-1.5 border-t border-[#F5F5F4] flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDetails(lead)}
            className="px-2 py-1 rounded bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4] text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition-colors"
          >
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span>Ficha & Ligações</span>
          </button>

          {stageKey !== "fechado_ganho" && (
            <button
              type="button"
              onClick={() => onAdvanceStage(lead)}
              className="px-2.5 py-1 rounded bg-[#0F172A] hover:bg-[#1E293B] text-white text-[11px] font-semibold inline-flex items-center gap-0.5 whitespace-nowrap transition-colors shadow-sm"
            >
              <span>Avançar</span>
              <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#0D9488]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
