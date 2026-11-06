"use client";

import React from "react";
import { Account, LeadStage } from "@/types";
import { formatCNPJ, cleanCNPJ } from "@/lib/utils";
import {
  GripVertical,
  MapPin,
  Phone,
  MessageSquare,
  Clock,
  Pin,
  User,
} from "lucide-react";

interface KanbanCardProps {
  lead: Account;
  stageKey: LeadStage;
  isDragging: boolean;
  whatsAppUrl: string | null;
  onDragStart: (e: React.DragEvent, accountId: string) => void;
  onDragEnd: () => void;
  onOpenDetails: (lead: Account) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function getDaysInCurrentStage(lead: Account): number {
  const stage = lead.estagio || "prospeccao_inicial";
  const stageIso = lead.stage_history?.[stage] || lead.updated_at || lead.created_at;
  const startMs = new Date(stageIso).getTime();
  if (isNaN(startMs)) return 1;
  return Math.max(1, Math.round((Date.now() - startMs) / DAY_MS));
}

const KanbanCardComponent: React.FC<KanbanCardProps> = ({
  lead,
  isDragging,
  whatsAppUrl,
  onDragStart,
  onDragEnd,
  onOpenDetails,
}) => {
  const daysInStage = getDaysInCurrentStage(lead);
  const displayName = lead.nome_fantasia || lead.razao_social;
  const hasNotes = Boolean(lead.observacoes_importantes?.trim());
  const mainRoute =
    lead.rotas_principais && lead.rotas_principais.length > 0
      ? lead.rotas_principais[0] +
        (lead.rotas_principais.length > 1 ? ` +${lead.rotas_principais.length - 1}` : "")
      : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      onClick={() => onOpenDetails(lead)}
      title={`Clique para abrir a ficha completa de ${displayName} (${formatCNPJ(lead.cnpj)}) ou arraste para mudar de etapa`}
      className={`bg-white p-3 rounded-lg border shadow-subtle transition-all flex flex-col justify-between gap-2.5 group cursor-grab active:cursor-grabbing hover:shadow-md hover:border-[#0D9488]/60 ${
        isDragging
          ? "opacity-40 border-dashed border-[#0D9488]"
          : "border-[#E7E5E4]"
      }`}
    >
      {/* 1. TOPO: NOME DA EMPRESA + TEMPO NA ETAPA (CYCLE TIME) */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-1.5">
          <h4 className="font-serif font-bold text-[13px] text-[#1C1917] leading-snug group-hover:text-[#0D9488] transition-colors line-clamp-1 flex-1">
            {displayName}
          </h4>

          <div className="flex items-center gap-1 flex-shrink-0">
            <span
              title={`Tempo nesta etapa: ${daysInStage} dia(s)`}
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

        {/* Sub-linha: Cidade/UF + Selo Compacto de Observação */}
        <div className="flex items-center justify-between gap-1.5 text-[11px]">
          {lead.cidade ? (
            <span className="inline-flex items-center gap-1 text-[#57534E] truncate">
              <MapPin className="w-3 h-3 text-[#0D9488] flex-shrink-0" />
              <span className="truncate">
                {lead.cidade}/{lead.uf}
              </span>
            </span>
          ) : (
            <span className="text-[#A8A29E] text-[10px]">Local a definir</span>
          )}

          {hasNotes && (
            <span
              title={lead.observacoes_importantes}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-semibold flex-shrink-0"
            >
              <Pin className="w-2.5 h-2.5 text-amber-700" />
              Obs
            </span>
          )}
        </div>
      </div>

      {/* 2. MEIO: FIT LOGÍSTICO (CARGA + ROTA PRINCIPAL EM 1 LINHA) */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        {lead.tipo_carga && (
          <span className="px-1.5 py-0.5 rounded bg-[#F5F5F4] border border-[#E7E5E4] text-[#1C1917] text-[10px] font-semibold whitespace-nowrap">
            {lead.tipo_carga}
          </span>
        )}
        {mainRoute && (
          <span
            className="text-[11px] text-[#0F766E] font-medium truncate flex-1 min-w-0"
            title={lead.rotas_principais?.join(", ")}
          >
            {mainRoute}
          </span>
        )}
      </div>

      {/* 3. RODAPÉ ENXUTO: DECISOR + ATALHOS DE CONTATO (SEM BOTÃO AVANÇAR REDUNDANTE) */}
      <div className="pt-2 border-t border-[#F5F5F4] flex items-center justify-between gap-1.5 mt-auto">
        <div className="flex items-center gap-1 min-w-0 flex-1 text-[11px] text-[#1C1917]">
          <User className="w-3 h-3 text-[#78716C] flex-shrink-0" />
          <span className="font-medium truncate">
            {lead.contato_nome || "Decisor a mapear"}
          </span>
        </div>

        <div
          className="flex items-center gap-0.5 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {lead.telefone && (
            <a
              href={`tel:${cleanCNPJ(lead.telefone)}`}
              title={`Ligar para ${lead.contato_nome || lead.razao_social}: ${lead.telefone}`}
              className="p-1.5 text-slate-500 hover:text-[#0F172A] hover:bg-[#F5F5F4] rounded transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}

          {whatsAppUrl && (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Iniciar conversa no WhatsApp"
              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export const KanbanCard = React.memo(KanbanCardComponent);
