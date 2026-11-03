import React from "react";
import { AccountStatus, LeadStage } from "@/types";
import { ShieldCheck, AlertOctagon, UserCheck, Clock, FileText, TrendingUp, CheckCircle, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status?: AccountStatus;
  stage?: LeadStage;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, stage, size = "md" }) => {
  const paddingClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-semibold";

  // Se for status da conta geral
  if (status) {
    switch (status) {
      case "cliente_ativo":
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-sm border bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] ${paddingClass}`}>
            <ShieldCheck className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
            Cliente Ativo (Bloqueado)
          </span>
        );
      case "desqualificado":
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-sm border bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] ${paddingClass}`}>
            <AlertOctagon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
            Recusado / Inviável
          </span>
        );
      case "lead":
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-sm border bg-[#F0FDFA] text-[#0D9488] border-[#99F6E4] ${paddingClass}`}>
            <UserCheck className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
            Lead em Aberto
          </span>
        );
      case "ex_cliente":
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-sm border bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB] ${paddingClass}`}>
            Ex-Cliente
          </span>
        );
    }
  }

  // Se for estágio no funil
  if (stage) {
    switch (stage) {
      case "prospeccao_inicial":
        return (
          <span className={`inline-flex items-center gap-1 rounded-sm border bg-slate-100 text-slate-700 border-slate-200 ${paddingClass}`}>
            <Clock className="w-3 h-3" />
            1. Primeiro Contato
          </span>
        );
      case "qualificacao_logistica":
        return (
          <span className={`inline-flex items-center gap-1 rounded-sm border bg-blue-50 text-blue-700 border-blue-200 ${paddingClass}`}>
            <FileText className="w-3 h-3" />
            2. Perfil de Frota / Carga
          </span>
        );
      case "cotacao_frete":
        return (
          <span className={`inline-flex items-center gap-1 rounded-sm border bg-amber-50 text-amber-800 border-amber-200 ${paddingClass}`}>
            <TrendingUp className="w-3 h-3" />
            3. Em Cotação
          </span>
        );
      case "proposta_enviada":
        return (
          <span className={`inline-flex items-center gap-1 rounded-sm border bg-purple-50 text-purple-700 border-purple-200 ${paddingClass}`}>
            <FileText className="w-3 h-3" />
            4. Proposta Enviada
          </span>
        );
      case "negociacao":
        return (
          <span className={`inline-flex items-center gap-1 rounded-sm border bg-emerald-50 text-emerald-800 border-emerald-200 ${paddingClass}`}>
            <Clock className="w-3 h-3" />
            5. Negociação
          </span>
        );
      case "fechado_ganho":
        return (
          <span className={`inline-flex items-center gap-1 rounded-sm border bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] ${paddingClass}`}>
            <CheckCircle className="w-3 h-3" />
            Ganho (Novo Cliente)
          </span>
        );
      case "perdido":
        return (
          <span className={`inline-flex items-center gap-1 rounded-sm border bg-red-50 text-red-700 border-red-200 ${paddingClass}`}>
            <XCircle className="w-3 h-3" />
            Perdido / Sem Fit
          </span>
        );
    }
  }

  return null;
};

