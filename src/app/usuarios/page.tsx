"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchAllAppUsers,
  createAppUser,
  deleteAppUser,
  getAuthenticatedUser,
} from "@/lib/store";
import { AppUser, UserRole } from "@/types";
import {
  UserPlus,
  ShieldCheck,
  UserCheck,
  Trash2,
  ArrowLeft,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function UsuariosPage() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Campos de Cadastro Simples (Exclusivo do Gestor)
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<UserRole>("comercial");
  const [senha, setSenha] = useState("123456");

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthenticatedUser();
    setCurrentUser(auth);
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await fetchAllAppUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCadastrarUsuario(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentUser || currentUser.perfil !== "gestor") {
      setErrorMsg("Apenas usuários com perfil Gestor podem cadastrar novos acessos.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await createAppUser({
        nome,
        email,
        perfil,
        senha,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Erro ao cadastrar usuário.");
      } else {
        setSuccessMsg(`Usuário "${res.user?.nome}" (${res.user?.email}) cadastrado com sucesso!`);
        setNome("");
        setEmail("");
        setPerfil("comercial");
        setSenha("123456");
        loadUsers();
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoverUsuario(user: AppUser) {
    if (currentUser && user.id === currentUser.id) {
      alert("Você não pode excluir o seu próprio usuário ativo.");
      return;
    }

    if (
      confirm(
        `Deseja remover o acesso do usuário "${user.nome}" (${user.email})?`
      )
    ) {
      await deleteAppUser(user.id);
      loadUsers();
    }
  }

  // Bloqueio caso perfil Comercial tente acessar via URL direta
  if (currentUser && currentUser.perfil !== "gestor") {
    return (
      <div className="max-w-lg mx-auto my-16 p-8 bg-white rounded-lg border border-red-200 text-center space-y-4 shadow-subtle">
        <Lock className="w-10 h-10 text-red-600 mx-auto" />
        <h1 className="font-serif text-xl font-bold text-[#1C1917]">
          Acesso Restrito ao Perfil Gestor
        </h1>
        <p className="text-xs text-[#57534E]">
          Seu usuário (<strong>{currentUser.nome}</strong>) possui perfil{" "}
          <strong>Comercial</strong>. O gerenciamento de usuários e relatórios gerenciais é exclusivo da gestão.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao Funil de Prospecção
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao Funil
        </Link>
        <div className="flex items-center gap-2.5">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]">
            Gestão de Usuários & Perfis de Acesso
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] text-xs font-semibold">
            Exclusivo Gestor
          </span>
        </div>
        <p className="text-sm text-[#57534E] mt-1">
          Cadastre os usuários da equipe comercial e defina quem possui permissão de <strong>Comercial</strong> ou de <strong>Gestor</strong>.
        </p>
      </div>

      {/* FORMULÁRIO SIMPLES DE CADASTRO DE NOVO USUÁRIO */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
          <h2 className="font-serif text-lg font-bold text-[#1C1917] flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#0D9488]" />
            Cadastrar Novo Usuário no Sistema
          </h2>
          <span className="text-xs text-[#78716C]">Liberação Imediata de Login</span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleCadastrarUsuario} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1">
              Nome do Usuário <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ex: Fernanda (Comercial)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full pl-8 pr-3 py-2 rounded-md border border-[#D6D3D1] text-xs focus-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1">
              E-mail para Login <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="fernanda@ccargo.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-8 pr-3 py-2 rounded-md border border-[#D6D3D1] text-xs focus-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1">
              Perfil de Acesso <span className="text-red-500">*</span>
            </label>
            <select
              value={perfil}
              onChange={(e) => setPerfil(e.target.value as UserRole)}
              className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-xs font-semibold text-[#1C1917] focus-ring"
            >
              <option value="comercial">👤 Comercial (Prospecção & Funil)</option>
              <option value="gestor">🛡️ Gestor (Acesso Total & Relatórios)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1">
              Senha de Acesso <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Senha inicial"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full pl-8 pr-3 py-2 rounded-md border border-[#D6D3D1] font-mono text-xs focus-ring"
              />
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-2 border-t border-[#F5F5F4]">
            <div className="text-[11px] text-[#78716C]">
              • <strong>Comercial:</strong> Prospecta clientes, consulta blindagem, registra ligações e imprime ficha individual.<br />
              • <strong>Gestor:</strong> Acessa relatórios gerenciais do mês por operadora, gerencia carteira ativa e cadastra usuários.
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4 text-[#0D9488]" />
              <span>{isSaving ? "Cadastrando..." : "Cadastrar Usuário"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* TABELA DE USUÁRIOS CADASTRADOS */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-[#E7E5E4] flex items-center justify-between">
          <h3 className="font-serif font-bold text-sm text-[#1C1917]">
            Usuários Cadastrados ({users.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F5F4] text-[#57534E] uppercase tracking-wider font-semibold border-b border-[#E7E5E4]">
              <tr>
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">E-mail de Login</th>
                <th className="py-3 px-4">Perfil</th>
                <th className="py-3 px-4">Senha Configurada</th>
                <th className="py-3 px-4">Permissões</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#78716C]">
                    Carregando usuários...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAFAF9]">
                    <td className="py-3.5 px-4 font-serif font-bold text-sm text-[#1C1917]">
                      {u.nome}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#57534E]">{u.email}</td>
                    <td className="py-3.5 px-4">
                      {u.perfil === "gestor" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] font-semibold text-[11px]">
                          <ShieldCheck className="w-3 h-3" />
                          Gestor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px]">
                          <UserCheck className="w-3 h-3" />
                          Comercial
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#78716C]">
                      {u.senha || "••••••"}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-[#57534E]">
                      {u.perfil === "gestor"
                        ? "Acesso Total + Relatórios Mensais + Cadastro de Usuários"
                        : "Funil Comercial + Registro de Contatos + Ficha do Cliente"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoverUsuario(u)}
                        className="p-1.5 text-[#A8A29E] hover:text-red-600 rounded transition-colors"
                        title="Remover usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

