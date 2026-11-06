"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  validatePasswordResetToken,
  completePasswordDefinition,
} from "@/lib/store";
import { AppUser } from "@/types";
import { CCargoLogo } from "@/components/ui/CCargoLogo";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

function DefinirSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const emailHint = searchParams.get("email") || "";

  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  useEffect(() => {
    async function verify() {
      setCheckingToken(true);
      try {
        const res = await validatePasswordResetToken(token, emailHint);
        if (res.valid && res.user) {
          setTokenValid(true);
          setTargetUser(res.user);
        } else {
          setTokenValid(false);
          setTokenError(
            res.error || "Link de definição de senha inválido ou expirado."
          );
        }
      } finally {
        setCheckingToken(false);
      }
    }
    verify();
  }, [token, emailHint]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (novaSenha.trim().length < 6) {
      setFormError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (novaSenha.trim() !== confirmarSenha.trim()) {
      setFormError("A confirmação de senha não confere com a senha digitada.");
      return;
    }

    setSaving(true);
    try {
      const res = await completePasswordDefinition({
        token,
        emailHint,
        novaSenha,
      });

      if (res.success) {
        setSuccessDone(true);
        setTimeout(() => {
          window.location.href = "/";
        }, 1800);
      } else {
        setFormError(res.error || "Não foi possível salvar a nova senha.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[78vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg border border-[#E7E5E4] shadow-floating p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <CCargoLogo size="md" showSubtitle={false} />
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0FDFA] border border-[#99F6E4] text-[#0F766E] text-xs font-semibold mt-2">
            <KeyRound className="w-3.5 h-3.5" />
            Definição Pessoal de Senha
          </div>
          <h1 className="font-serif text-xl font-bold text-[#1C1917] pt-1">
            Crie sua Senha de Acesso
          </h1>
          <p className="text-xs text-[#57534E]">
            Por segurança, somente você define e conhece sua senha no sistema CCargo.
          </p>
        </div>

        {checkingToken ? (
          <div className="py-8 text-center space-y-2 text-xs text-[#57534E]">
            <Loader2 className="w-6 h-6 animate-spin text-[#0D9488] mx-auto" />
            <p>Validando chave de segurança do link...</p>
          </div>
        ) : !tokenValid ? (
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Link Inválido ou Expirado
              </div>
              <p>{tokenError}</p>
            </div>
            <Link
              href="/login"
              className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para a Tela de Login
            </Link>
          </div>
        ) : successDone ? (
          <div className="p-5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-sm">Senha Definida com Sucesso!</h3>
            <p className="text-xs text-emerald-800">
              Sua credencial foi ativada e você já está sendo redirecionado para o sistema...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {targetUser && (
              <div className="p-3 rounded-md bg-[#F5F5F4] border border-[#E7E5E4] text-xs space-y-0.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#78716C]">
                  Conta Vinculada
                </div>
                <div className="font-bold text-[#1C1917]">{targetUser.nome}</div>
                <div className="font-mono text-[#57534E]">{targetUser.email}</div>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Nova Senha Pessoal <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3" />
                <input
                  type="password"
                  placeholder="Mínimo de 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-[#D6D3D1] bg-[#FAFAF9] text-sm text-[#1C1917] focus:bg-white focus-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Confirmar Nova Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3" />
                <input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-[#D6D3D1] bg-[#FAFAF9] text-sm text-[#1C1917] focus:bg-white focus-ring"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-sm rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 focus-ring"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
                  Ativando Senha Segura...
                </>
              ) : (
                "Salvar Senha e Entrar no Sistema"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function DefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-xs text-[#78716C]">
          Carregando tela de segurança...
        </div>
      }
    >
      <DefinirSenhaContent />
    </Suspense>
  );
}

