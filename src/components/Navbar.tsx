"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Truck,
  ShieldCheck,
  UserPlus,
  Users,
  AlertOctagon,
  BarChart3,
  FileText,
  UserCheck,
  Plus,
} from "lucide-react";
import {
  getCurrentOperator,
  setCurrentOperator,
  getOperatorsList,
  addOperator,
} from "@/lib/store";
import { OperatorUser } from "@/types";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [operators, setOperators] = useState<OperatorUser[]>([]);
  const [activeOperator, setActiveOperator] = useState<string>("Ana Paula (Comercial)");

  useEffect(() => {
    setOperators(getOperatorsList());
    setActiveOperator(getCurrentOperator());

    const handleOpChange = () => {
      setOperators(getOperatorsList());
      setActiveOperator(getCurrentOperator());
    };

    window.addEventListener("ccargo-operator-changed", handleOpChange);
    return () => window.removeEventListener("ccargo-operator-changed", handleOpChange);
  }, []);

  function handleSelectOperator(val: string) {
    if (val === "__NEW__") {
      const novoNome = prompt(
        "Digite o nome da Operadora / Usuário Comercial (ex: Fernanda - Comercial):"
      );
      if (novoNome && novoNome.trim().length >= 2) {
        const created = addOperator(novoNome.trim());
        setOperators(getOperatorsList());
        setActiveOperator(created.nome);
      }
      return;
    }
    setCurrentOperator(val);
    setActiveOperator(val);
  }

  const navLinkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
      pathname === path
        ? "bg-[#F0FDFA] text-[#0D9488] font-semibold border border-[#99F6E4]"
        : "text-[#1C1917] hover:text-[#0D9488] hover:bg-[#F5F5F4]"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF9]/95 backdrop-blur-md border-b border-[#E7E5E4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-md bg-[#0F172A] flex items-center justify-center text-white shadow-sm group-hover:bg-[#1E293B] transition-colors">
              <Truck className="w-5 h-5 text-[#0D9488]" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold text-[#1C1917] tracking-tight block leading-tight">
                CCargo
              </span>
              <span className="text-[10px] font-sans font-medium text-[#57534E] tracking-wider uppercase">
                Prospecção & Blindagem
              </span>
            </div>
          </Link>

          <div className="hidden xl:flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
            <span>Escudo Anti-Duplicidade Ativo</span>
          </div>
        </div>

        {/* Navigation links & User Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <nav className="flex items-center gap-1">
            <Link href="/" className={navLinkClass("/")}>
              <BarChart3 className="w-4 h-4 text-[#78716C]" />
              <span className="hidden md:inline">Funil</span>
            </Link>

            <Link href="/relatorios" className={navLinkClass("/relatorios")}>
              <FileText className="w-4 h-4 text-[#0D9488]" />
              <span className="hidden sm:inline">Relatórios & PDF</span>
            </Link>

            <Link href="/clientes-ativos" className={navLinkClass("/clientes-ativos")}>
              <Users className="w-4 h-4 text-[#78716C]" />
              <span className="hidden lg:inline">Clientes Ativos</span>
            </Link>

            <Link href="/desqualificados" className={navLinkClass("/desqualificados")}>
              <AlertOctagon className="w-4 h-4 text-[#78716C]" />
              <span className="hidden lg:inline">Recusados</span>
            </Link>
          </nav>

          {/* Seletor de Operadora / Usuário Ativo (US-09) */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-[#E7E5E4]">
            <UserCheck className="w-3.5 h-3.5 text-[#0D9488] flex-shrink-0" />
            <select
              aria-label="Selecionar Operadora ou Usuário"
              value={activeOperator}
              onChange={(e) => handleSelectOperator(e.target.value)}
              className="bg-white border border-[#D6D3D1] rounded-md px-2 py-1.5 text-xs font-medium text-[#1C1917] focus-ring cursor-pointer max-w-[180px]"
              title="Usuário ativo que assina os contatos e leads"
            >
              {operators.map((op) => (
                <option key={op.id} value={op.nome}>
                  👤 {op.nome}
                </option>
              ))}
              <option value="__NEW__">➕ Cadastrar Novo Usuário...</option>
            </select>
          </div>

          <Link
            href="/novo-lead"
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-md shadow-sm transition-all focus-ring"
          >
            <UserPlus className="w-4 h-4 text-[#0D9488]" />
            <span>Novo Lead</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
