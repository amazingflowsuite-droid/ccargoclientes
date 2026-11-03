import React from "react";
import Link from "next/link";
import { Truck, ShieldCheck, UserPlus, Users, AlertOctagon, BarChart3 } from "lucide-react";

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF9]/90 backdrop-blur-md border-b border-[#E7E5E4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
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
              <span className="text-[11px] font-sans font-medium text-[#57534E] tracking-wider uppercase">
                Prospecção & Blindagem
              </span>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
            <span>Escudo Anti-Duplicidade Ativo</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1C1917] hover:text-[#0D9488] hover:bg-[#F5F5F4] rounded-md transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-[#78716C]" />
            <span className="hidden sm:inline">Funil de Vendas</span>
          </Link>

          <Link
            href="/clientes-ativos"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1C1917] hover:text-[#0D9488] hover:bg-[#F5F5F4] rounded-md transition-colors"
          >
            <Users className="w-4 h-4 text-[#78716C]" />
            <span className="hidden sm:inline">Clientes Ativos</span>
          </Link>

          <Link
            href="/desqualificados"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1C1917] hover:text-[#0D9488] hover:bg-[#F5F5F4] rounded-md transition-colors"
          >
            <AlertOctagon className="w-4 h-4 text-[#78716C]" />
            <span className="hidden sm:inline">Recusados</span>
          </Link>

          <Link
            href="/novo-lead"
            className="flex items-center gap-1.5 ml-2 px-3.5 py-2 text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-md shadow-sm transition-all focus-ring"
          >
            <UserPlus className="w-4 h-4 text-[#0D9488]" />
            <span>Novo Lead</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

