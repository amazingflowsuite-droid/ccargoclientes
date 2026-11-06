"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchAllAppUsers,
  createAppUser,
  deleteAppUser,
  toggleAppUserActive,
  getAuthenticatedUser,
  requestPasswordReset,
} from "@/lib/store";
import { AppUser, UserRole } from "@/types";
import {
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Trash2,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  Send,
  Clock,
  Ban,
  Power,
} from "lucide-react";

export default function UsuariosPage() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states (SEM campo de senha - US-14)
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<UserRole>("comercial");
  const [saving, setSaving] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthenticatedUser();
    setCurrentUser(auth);
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const list = await fetchAllAppUsers();
      setUsers(list);
    } finally {
      setLoading(false);
    }
  }

  async function dispatchEmailNotification(params: {
    nome: string;
    email: string;
    tipo: "convite" | "reset";
    resetUrl: string;
  }): Promise<{ sent: boolean; providerError?: string | null }> {
    try {
      const res = await fetch("/api/auth/send-password-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return {
        sent: Boolean(data.emailSentViaProvider),
        providerError: data.providerError || null,
      };
    } catch {
      return { sent: false, providerError: "Erro de comunicação ao disparar e-mail." };
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const res = await createAppUser({
        nome,
        email,
        perfil,
      });

      if (res.success && res.user && res.resetUrl) {
        const dispatchRes = await dispatchEmailNotification({
          nome: res.user.nome,
          email: res.user.email,
          tipo: "convite",
          resetUrl: res.resetUrl,
        });
        if (dispatchRes.sent) {
          setSuccessMsg(
            `Usuário "${res.user.nome}" cadastrado! O link exclusivo de criação de senha foi enviado por e-mail para ${res.user.email}.`
          );
        } else {
          setError(
            dispatchRes.providerError ||
              `Usuário cadastrado, porém não foi possível enviar o e-mail automaticamente para ${res.user.email}.`
          );
        }
        setNome("");
        setEmail("");
        setPerfil("comercial");
        await loadUsers();
      } else {
        setError(res.error || "Erro ao cadastrar usuário.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(u: AppUser) {
    const ok = confirm(
      `Deseja enviar um link de redefinição de senha para "${u.nome}" (${u.email})?\n\nA senha anterior deixará de valer e o usuário receberá um e-mail para criar sua nova senha.`
    );
    if (!ok) return;

    setError(null);
    setSuccessMsg(null);
    setResettingUserId(u.id);

    try {
      const res = await requestPasswordReset(u.id);
      if (res.success && res.resetUrl) {
        const dispatchRes = await dispatchEmailNotification({
          nome: u.nome,
          email: u.email,
          tipo: "reset",
          resetUrl: res.resetUrl,
        });
        if (dispatchRes.sent) {
          setSuccessMsg(
            `E-mail de redefinição de senha enviado com sucesso para ${u.email}!`
          );
        } else {
          setError(
            dispatchRes.providerError ||
              `Não foi possível enviar o e-mail para ${u.email}.`
          );
        }
        await loadUsers();
      } else {
        setError(res.error || "Não foi possível gerar o link de redefinição.");
      }
    } finally {
      setResettingUserId(null);
    }
  }

  async function handleToggleActive(u: AppUser) {
    if (u.id === currentUser?.id) {
      alert("Você não pode desativar o seu próprio usuário logado.");
      return;
    }
    const nextState = !u.ativo;
    await toggleAppUserActive(u.id, nextState);
    setSuccessMsg(
      nextState
        ? `Acesso de login de "${u.nome}" reativado com sucesso.`
        : `Acesso de login de "${u.nome}" bloqueado (inativado). Todo o histórico de prospecções e Lead/Cycle Time foi preservado.`
    );
    await loadUsers();
  }

  async function handleDelete(u: AppUser) {
    if (u.id === currentUser?.id) {
      alert("Você não pode excluir o seu próprio usuário logado.");
      return;
    }
    setError(null);
    setSuccessMsg(null);

    const ok = confirm(
      `Deseja excluir o usuário "${u.nome}" (${u.email})?`
    );
    if (!ok) return;

    const res = await deleteAppUser(u.id);
    if (res.blockedByHistory) {
      if (u.ativo) {
        const shouldDeactivate = confirm(
          `⚠️ EXCLUSÃO BLOQUEADA PARA PROTEÇÃO DE DADOS:\n\nO usuário "${u.nome}" possui ${res.accountsCount} prospecção(ões) e ${res.logsCount} interação(ões) registradas no sistema.\nPara não impactar os cálculos de Lead Time, Cycle Time e Performance Comercial, não é permitido apagar o registro dele.\n\nDeseja INATIVAR (bloquear) o acesso de login deste usuário mantendo todo o histórico intacto?`
        );
        if (shouldDeactivate) {
          await toggleAppUserActive(u.id, false);
          setSuccessMsg(
            `O usuário "${u.nome}" possui histórico comercial e por isso seu login foi INATIVADO (bloqueado), preservando 100% dos indicadores de Lead Time e Cycle Time.`
          );
          await loadUsers();
        } else {
          setError(res.error || null);
        }
      } else {
        setError(
          `${res.error} O acesso de login deste usuário já se encontra bloqueado (Inativo).`
        );
      }
      return;
    }

    if (res.success) {
      setSuccessMsg(`Usuário "${u.nome}" (sem histórico vinculado) foi excluído.`);
      await loadUsers();
    } else if (res.error) {
      setError(res.error);
    }
  }

  // Bloqueio caso um usuário "comercial" tente acessar /usuarios pela URL
  if (currentUser && currentUser.perfil !== "gestor") {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white rounded-lg border border-red-200 p-8 text-center shadow-subtle space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-xl font-bold text-[#1C1917]">
          Acesso Restrito ao Perfil Gestor
        </h1>
        <p className="text-sm text-[#57534E]">
          Apenas usuários com perfil de <strong>Gestor</strong> têm permissão para cadastrar usuários, gerenciar perfis e disparar links de redefinição de senha.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao Funil de Vendas
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Funil
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]">
            Gestão de Usuários & Credenciais Seguras
          </h1>
          <p className="text-sm text-[#57534E] mt-1">
            Cadastre usuários sem expor senhas: o titular recebe um link exclusivo por e-mail para definir ou redefinir sua própria senha.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORMULÁRIO DE CADASTRO SEM CAMPO DE SENHA (US-14) */}
        <div className="bg-white rounded-lg border border-[#E7E5E4] p-6 shadow-subtle space-y-5 h-fit">
          <div className="border-b border-[#E7E5E4] pb-3">
            <h2 className="font-serif text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0D9488]" />
              Cadastrar Novo Usuário
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Sem senha manual: o usuário receberá um link para criar sua própria senha pessoal.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Ana Paula (Comercial)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-[#FAFAF9] text-sm focus:bg-white focus-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                E-mail Corporativo (Login) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="nome@ccargo.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-md border border-[#D6D3D1] bg-[#FAFAF9] text-sm focus:bg-white focus-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Perfil de Acesso <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPerfil("comercial")}
                  className={`p-3 rounded-md border text-left transition-all ${
                    perfil === "comercial"
                      ? "bg-[#0F172A] text-white border-[#0F172A] shadow-sm"
                      : "bg-[#FAFAF9] text-[#1C1917] border-[#D6D3D1] hover:bg-[#F5F5F4]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <UserCheck className="w-4 h-4 text-[#0D9488]" />
                    Comercial
                  </div>
                  <p
                    className={`text-[10px] mt-1 ${
                      perfil === "comercial" ? "text-slate-300" : "text-[#78716C]"
                    }`}
                  >
                    Funil, leads, ligações e PDF individual
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPerfil("gestor")}
                  className={`p-3 rounded-md border text-left transition-all ${
                    perfil === "gestor"
                      ? "bg-[#0F172A] text-white border-[#0F172A] shadow-sm"
                      : "bg-[#FAFAF9] text-[#1C1917] border-[#D6D3D1] hover:bg-[#F5F5F4]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                    Gestor
                  </div>
                  <p
                    className={`text-[10px] mt-1 ${
                      perfil === "gestor" ? "text-slate-300" : "text-[#78716C]"
                    }`}
                  >
                    Acesso total + Relatórios + Usuários
                  </p>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-md bg-[#FAFAF9] border border-[#E7E5E4] text-[11px] text-[#57534E] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0D9488] flex-shrink-0 mt-0.5" />
              <span>
                <strong>Política Anti-Fraude:</strong> Nenhum gestor digita ou visualiza senhas. O colaborador definirá sua senha através do link enviado para o e-mail cadastrado.
              </span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-xs rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
                  Gerando Convite...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#0D9488]" />
                  Cadastrar e Enviar Link de Senha
                </>
              )}
            </button>
          </form>
        </div>

        {/* LISTA DE USUÁRIOS CADASTRADOS (SEM COLUNA DE SENHA + BOTÃO DE RESET) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E7E5E4] shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-[#E7E5E4] flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1C1917]">
                Usuários Cadastrados ({users.length})
              </h2>
              <p className="text-xs text-[#78716C]">
                Controle de perfis e envio de link para redefinição de senha (Reset)
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-[#78716C]">
              Carregando usuários...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F4] border-b border-[#E7E5E4] text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">E-mail (Login)</th>
                    <th className="py-3 px-4">Perfil</th>
                    <th className="py-3 px-4">Status da Senha</th>
                    <th className="py-3 px-4 text-right">Segurança & Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4] text-xs">
                  {users.map((u) => {
                    const isPending = u.status_senha === "pendente_definicao";
                    const isResetting = resettingUserId === u.id;

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-[#FAFAF9] ${!u.ativo ? "opacity-65 bg-slate-50/60" : ""}`}
                      >
                        <td className="py-3.5 px-4 font-bold text-[#1C1917]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{u.nome}</span>
                            {u.id === currentUser?.id && (
                              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                                Você
                              </span>
                            )}
                            {!u.ativo && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                <Ban className="w-2.5 h-2.5" />
                                Inativo (Bloqueado)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#57534E]">
                          {u.email}
                        </td>
                        <td className="py-3.5 px-4">
                          {u.perfil === "gestor" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Gestor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <UserCheck className="w-3 h-3 text-blue-600" />
                              Comercial
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {!u.ativo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-800 border border-red-200">
                              <Ban className="w-3 h-3 text-red-600" />
                              Login Bloqueado
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Aguardando Definição
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Senha Pessoal Ativa
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isResetting || !u.ativo}
                              onClick={() => handleResetPassword(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#F5F5F4] hover:bg-[#E7E5E4] disabled:opacity-40 text-[#1C1917] border border-[#D6D3D1] text-[11px] font-semibold transition-colors"
                              title="Enviar link de redefinição de senha para o e-mail do usuário"
                            >
                              {isResetting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <KeyRound className="w-3 h-3 text-[#0D9488]" />
                              )}
                              Resetar Senha
                            </button>

                            {u.id !== currentUser?.id && (
                              <button
                                type="button"
                                onClick={() => handleToggleActive(u)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors ${
                                  u.ativo
                                    ? "bg-white hover:bg-amber-50 text-amber-800 border-amber-300"
                                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                }`}
                                title={
                                  u.ativo
                                    ? "Inativar acesso de login mantendo histórico"
                                    : "Reativar acesso de login"
                                }
                              >
                                <Power className="w-3 h-3" />
                                {u.ativo ? "Inativar" : "Reativar"}
                              </button>
                            )}

                            {u.id !== currentUser?.id && (
                              <button
                                type="button"
                                onClick={() => handleDelete(u)}
                                className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 transition-colors"
                                title="Excluir usuário (permitido apenas se não possuir histórico comercial)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
