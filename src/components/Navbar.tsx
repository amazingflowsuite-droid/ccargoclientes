"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Truck,
  ShieldCheck,
  UserPlus,
  Users,
  AlertOctagon,
  BarChart3,
  FileText,
  UserCheck,
  LogOut,
  Settings,
} from "lucide-react";
import { getAuthenticatedUser, logoutUser } from "@/lib/store";
import { AppUser } from "@/types";
import { CCargoLogo } from "@/components/ui/CCargoLogo";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AppUser | null>(() => {
    if (typeof window !== "undefined") return getAuthenticatedUser();
    return null;
  });

  useEffect(() => {
    const syncAuth = () => {
      setAuthUser(getAuthenticatedUser());
    };
    syncAuth();
    window.addEventListener("ccargo-auth-changed", syncAuth);
    return () => window.removeEventListener("ccargo-auth-changed", syncAuth);
  }, [pathname]);

  function handleLogout() {
    logoutUser();
    setAuthUser(null);
    router.replace("/login");
  }

  const navLinkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
      pathname === path
        ? "bg-[#F0FDFA] text-[#0D9488] font-semibold border border-[#99F6E4]"
        : "text-[#1C1917] hover:text-[#0D9488] hover:bg-[#F5F5F4]"
    }`;

  const isGestor = authUser?.perfil === "gestor";

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF9]/95 backdrop-blur-md border-b border-[#E7E5E4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand com Logotipo Oficial CCargo (US-15 & US-16) */}
        <div className="flex items-center gap-3">
          <Link href={authUser ? "/" : "/login"} className="flex items-center group">
            <CCargoLogo size="sm" showSubtitle={true} subtitleText="Prospecção" />
          </Link>
        </div>

        {/* Navigation links & Logged-in User Profile */}
        {authUser && pathname !== "/login" && !pathname?.startsWith("/definir-senha") ? (
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <nav className="flex items-center gap-1">
              <Link href="/" className={navLinkClass("/")}>
                <BarChart3 className="w-4 h-4 text-[#78716C]" />
                <span className="hidden md:inline">Funil</span>
              </Link>

              {/* Relatórios Gerenciais exclusivos do perfil Gestor */}
              {isGestor && (
                <Link href="/relatorios" className={navLinkClass("/relatorios")}>
                  <FileText className="w-4 h-4 text-[#0D9488]" />
                  <span className="hidden sm:inline">Relatórios</span>
                </Link>
              )}

              <Link href="/clientes-ativos" className={navLinkClass("/clientes-ativos")}>
                <Users className="w-4 h-4 text-[#78716C]" />
                <span className="hidden lg:inline">Clientes Ativos</span>
              </Link>

              <Link href="/desqualificados" className={navLinkClass("/desqualificados")}>
                <AlertOctagon className="w-4 h-4 text-[#78716C]" />
                <span className="hidden lg:inline">Recusados</span>
              </Link>

              {/* Gestão de Usuários exclusiva do perfil Gestor */}
              {isGestor && (
                <Link href="/usuarios" className={navLinkClass("/usuarios")}>
                  <Settings className="w-4 h-4 text-[#78716C]" />
                  <span className="hidden md:inline">Usuários</span>
                </Link>
              )}
            </nav>

            {/* Identificação Fixa do Usuário Logado + Botão Sair */}
            <div className="hidden sm:flex items-center gap-2 pl-2.5 border-l border-[#E7E5E4]">
              <div className="text-right">
                <div className="text-xs font-bold text-[#1C1917] leading-tight">
                  {authUser.nome}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider flex items-center justify-end gap-1">
                  {isGestor ? (
                    <span className="text-[#047857] flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Gestor
                    </span>
                  ) : (
                    <span className="text-blue-700 flex items-center gap-0.5">
                      <UserCheck className="w-3 h-3" /> Comercial
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sair do sistema"
                className="p-2 text-[#57534E] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <Link
              href="/novo-lead"
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-md shadow-sm transition-all focus-ring"
            >
              <UserPlus className="w-4 h-4 text-[#0D9488]" />
              <span>Novo Lead</span>
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
};
