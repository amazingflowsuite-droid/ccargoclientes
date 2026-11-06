"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmailAndPassword, getAuthenticatedUser } from "@/lib/store";
import { Truck, Lock, Mail, AlertCircle, ShieldCheck, UserCheck, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getAuthenticatedUser();
    if (user) {
      router.replace("/");
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginWithEmailAndPassword(email, senha);
      if (res.success && res.user) {
        router.replace("/");
      } else {
        setError(res.error || "Não foi possível realizar o login.");
      }
    } finally {
      setLoading(false);
    }
  }

  function fillCredentials(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setSenha(demoPass);
    setError(null);
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg border border-[#E7E5E4] shadow-floating p-6 sm:p-8 space-y-6">
        {/* Cabeçalho CCargo */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-md bg-[#0F172A] flex items-center justify-center text-white mx-auto shadow-sm">
            <Truck className="w-6 h-6 text-[#0D9488]" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1C1917]">
            CCargo Comercial
          </h1>
          <p className="text-xs text-[#57534E]">
            Acesse com seu e-mail corporativo e senha para gerenciar a prospecção.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
              E-mail de Acesso
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3" />
              <input
                type="email"
                placeholder="seu.email@ccargo.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-[#D6D3D1] bg-[#FAFAF9] text-sm text-[#1C1917] focus:bg-white focus-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3" />
              <input
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-[#D6D3D1] bg-[#FAFAF9] text-sm text-[#1C1917] focus:bg-white focus-ring"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-sm rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 focus-ring"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
                Autenticando...
              </>
            ) : (
              "Entrar no Sistema"
            )}
          </button>
        </form>

        {/* Atalhos para Avaliação de Perfis */}
        <div className="pt-4 border-t border-[#E7E5E4] space-y-2.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#78716C] text-center">
            Acessos Iniciais Configurados (Clique para preencher)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("gestor@ccargo.com.br", "123456")}
              className="p-2.5 rounded border border-[#E7E5E4] hover:border-[#0D9488] bg-[#FAFAF9] hover:bg-[#F0FDFA] text-left transition-all"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
                Perfil Gestor
              </div>
              <div className="text-[10px] font-mono text-[#57534E] mt-0.5 truncate">
                gestor@ccargo.com.br
              </div>
              <div className="text-[10px] text-[#78716C]">
                Acesso total + Relatórios + Criar Usuários
              </div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("comercial@ccargo.com.br", "123456")}
              className="p-2.5 rounded border border-[#E7E5E4] hover:border-[#0D9488] bg-[#FAFAF9] hover:bg-[#F0FDFA] text-left transition-all"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917]">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                Perfil Comercial
              </div>
              <div className="text-[10px] font-mono text-[#57534E] mt-0.5 truncate">
                comercial@ccargo.com.br
              </div>
              <div className="text-[10px] text-[#78716C]">
                Operação de Funil + Ligações (Ana Paula)
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

