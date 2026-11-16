import {
  Account,
  AppUser,
  CollisionCheckResult,
  ContactLog,
  LeadStage,
  OperatorUser,
  PasswordStatus,
  StageTransition,
  UserRole,
} from "@/types";
import { cleanCNPJ, formatCNPJ, getCNPJRaiz } from "./utils";
import { ORDERED_STAGE_KEYS, normalizeLeadStage } from "./kanban-stages";
import { supabase, isSupabaseConfigured } from "./supabase";

function shouldUseServerApi(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof fetch === "function" &&
    isSupabaseConfigured &&
    !(typeof process !== "undefined" && process.env?.VITEST)
  );
}

async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (res.status === 401 && !url.startsWith("/api/auth/")) {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
      window.dispatchEvent(new Event("ccargo-auth-changed"));
    }
  }

  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

const STORAGE_KEY_ACCOUNTS = "ccargo_accounts_v2";
const STORAGE_KEY_LOGS = "ccargo_contact_logs_v2";
const STORAGE_KEY_NOTES_OVERLAY = "ccargo_notes_overlay_v1";
const STORAGE_KEY_STAGE_OVERLAY = "ccargo_stage_history_overlay_v1";
const STORAGE_KEY_KANBAN_ORDER_OVERLAY = "ccargo_kanban_order_overlay_v1";
const STORAGE_KEY_USERS = "ccargo_app_users_v1";
const STORAGE_KEY_USER_SECURITY_OVERLAY = "ccargo_user_security_overlay_v1";
const STORAGE_KEY_AUTH_SESSION = "ccargo_auth_session_v1";

const DAY_MS = 24 * 60 * 60 * 1000;

const INITIAL_USERS: AppUser[] = [
  {
    id: "usr-gestor-1",
    nome: "Will / Diretoria (Gestor)",
    email: "gestor@ccargo.com.br",
    perfil: "gestor",
    senha: "123456",
    status_senha: "ativa",
    ativo: true,
    created_at: new Date(Date.now() - 30 * DAY_MS).toISOString(),
  },
  {
    id: "usr-comercial-1",
    nome: "Ana Paula (Comercial)",
    email: "comercial@ccargo.com.br",
    perfil: "comercial",
    senha: "123456",
    status_senha: "ativa",
    ativo: true,
    created_at: new Date(Date.now() - 25 * DAY_MS).toISOString(),
  },
];

// ============================================================================
// OVERLAY DE SEGURANÇA DE USUÁRIOS (SENHAS E TOKENS DE DEFINIÇÃO / RESET)
// ============================================================================

interface UserSecurityOverlayItem {
  status_senha: PasswordStatus;
  reset_token?: string;
  reset_token_expires_at?: string;
  senha?: string;
}

function getSecurityOverlay(): Record<string, UserSecurityOverlayItem> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_SECURITY_OVERLAY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSecurityOverlay(email: string, data: UserSecurityOverlayItem): void {
  if (typeof window === "undefined") return;
  try {
    const map = getSecurityOverlay();
    map[email.toLowerCase().trim()] = data;
    localStorage.setItem(STORAGE_KEY_USER_SECURITY_OVERLAY, JSON.stringify(map));
  } catch (err) {
    console.error(err);
  }
}

function generateSecureToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `ccargo_${Date.now().toString(36)}_${hex}`;
  }
  const randA = Math.random().toString(36).substring(2, 12);
  const randB = Math.random().toString(36).substring(2, 12);
  return `ccargo_${Date.now().toString(36)}_${randA}${randB}`;
}

export function buildPasswordResetUrl(token: string, email: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://ccargoclientes.vercel.app";
  return `${origin}/definir-senha?token=${encodeURIComponent(token)}&email=${encodeURIComponent(
    email
  )}`;
}

// ============================================================================
// AUTENTICAÇÃO E GESTÃO DE USUÁRIOS POR PERFIL (RBAC: GESTOR vs COMERCIAL)
// ============================================================================

function getLocalUsers(): AppUser[] {
  if (typeof window === "undefined") return INITIAL_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_USERS;
  }
}

function saveLocalUsers(users: AppUser[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (err) {
    console.error(err);
  }
}

function applyUserSecurityOverlay(users: AppUser[]): AppUser[] {
  const secMap = getSecurityOverlay();
  return users.map((u) => {
    const key = u.email.toLowerCase().trim();
    const over = secMap[key];
    const isPending =
      over?.status_senha === "pendente_definicao" ||
      u.status_senha === "pendente_definicao" ||
      !u.senha ||
      u.senha.startsWith("__PENDING_");

    return {
      ...u,
      senha: over?.senha !== undefined ? over.senha : u.senha,
      status_senha: over?.status_senha || (isPending ? "pendente_definicao" : "ativa"),
      reset_token: over?.reset_token !== undefined ? over.reset_token : u.reset_token,
      reset_token_expires_at:
        over?.reset_token_expires_at !== undefined
          ? over.reset_token_expires_at
          : u.reset_token_expires_at,
    };
  });
}

export async function fetchAllAppUsers(): Promise<AppUser[]> {
  if (shouldUseServerApi()) {
    const res = await apiRequest<{ data?: AppUser[]; error?: string }>("/api/users");
    if (res.ok && res.data.data) {
      const merged = applyUserSecurityOverlay(res.data.data);
      saveLocalUsers(merged);
      return merged;
    }
    return [];
  }

  const localUsers = getLocalUsers();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        const remote = data as AppUser[];
        const remoteEmails = new Set(remote.map((u) => u.email.toLowerCase()));
        const merged = applyUserSecurityOverlay([
          ...remote,
          ...localUsers.filter((u) => !remoteEmails.has(u.email.toLowerCase())),
        ]);
        saveLocalUsers(merged);
        return merged;
      }
    } catch (err) {
      console.warn("Usando lista local de usuários:", err);
    }
  }

  return applyUserSecurityOverlay(localUsers);
}

export function getAuthenticatedUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export async function loginWithEmailAndPassword(
  email: string,
  senha: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = senha.trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: "Informe o e-mail e a senha." };
  }

  if (shouldUseServerApi()) {
    const res = await apiRequest<{ success?: boolean; user?: AppUser; error?: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail, senha: cleanPass }),
      }
    );
    if (!res.ok || !res.data.success || !res.data.user) {
      return { success: false, error: res.data.error || "E-mail ou senha inválidos." };
    }
    localStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(res.data.user));
    window.dispatchEvent(new Event("ccargo-auth-changed"));
    return { success: true, user: res.data.user };
  }

  const users = await fetchAllAppUsers();
  const userByEmail = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!userByEmail) {
    return { success: false, error: "E-mail ou senha inválidos." };
  }

  if (
    userByEmail.status_senha === "pendente_definicao" ||
    !userByEmail.senha ||
    userByEmail.senha.startsWith("__PENDING_")
  ) {
    return {
      success: false,
      error:
        "Sua conta aguarda definição de senha. Acesse o link enviado para o seu e-mail ou peça um novo link ao Gestor.",
    };
  }

  if (userByEmail.senha !== cleanPass) {
    return { success: false, error: "E-mail ou senha inválidos." };
  }

  if (!userByEmail.ativo) {
    return {
      success: false,
      error: "Este usuário está desativado. Contate o gestor do sistema.",
    };
  }

  const sessionUser: AppUser = {
    id: userByEmail.id,
    nome: userByEmail.nome,
    email: userByEmail.email,
    perfil: userByEmail.perfil,
    status_senha: "ativa",
    ativo: userByEmail.ativo,
    created_at: userByEmail.created_at,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(sessionUser));
    window.dispatchEvent(new Event("ccargo-auth-changed"));
  }

  return { success: true, user: sessionUser };
}

export function logoutUser(): void {
  if (typeof window === "undefined") return;
  if (shouldUseServerApi()) {
    void fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
  }
  localStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
  window.dispatchEvent(new Event("ccargo-auth-changed"));
}

/**
 * Cadastro de usuário pelo Gestor SEM campo de senha (US-14).
 * Gera um token único de convite para o próprio usuário definir sua senha por link de e-mail.
 */
export async function createAppUser(params: {
  nome: string;
  email: string;
  perfil: UserRole;
}): Promise<{
  success: boolean;
  user?: AppUser;
  resetToken?: string;
  resetUrl?: string;
  error?: string;
}> {
  const cleanNome = params.nome.trim();
  const cleanEmail = params.email.trim().toLowerCase();

  if (!cleanNome || !cleanEmail) {
    return { success: false, error: "Preencha o nome completo e o e-mail corporativo." };
  }

  if (shouldUseServerApi()) {
    const res = await apiRequest<{ user?: AppUser; token?: string; error?: string }>("/api/users", {
      method: "POST",
      body: JSON.stringify({ nome: cleanNome, email: cleanEmail, perfil: params.perfil }),
    });
    if (!res.ok || !res.data.user || !res.data.token) {
      return { success: false, error: res.data.error || "Erro ao criar usuário." };
    }
    const resetUrl = buildPasswordResetUrl(res.data.token, cleanEmail);
    window.dispatchEvent(new Event("ccargo-auth-changed"));
    return { success: true, user: res.data.user, resetToken: res.data.token, resetUrl };
  }

  const existingUsers = await fetchAllAppUsers();
  if (existingUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: "Já existe um usuário cadastrado com este e-mail." };
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const pendingPassMarker = `__PENDING_${token}`;

  saveSecurityOverlay(cleanEmail, {
    status_senha: "pendente_definicao",
    reset_token: token,
    reset_token_expires_at: expiresAt,
    senha: pendingPassMarker,
  });

  const resetUrl = buildPasswordResetUrl(token, cleanEmail);

  if (isSupabaseConfigured && supabase) {
    try {
      const fullPayload = {
        nome: cleanNome,
        email: cleanEmail,
        perfil: params.perfil,
        senha: pendingPassMarker,
        status_senha: "pendente_definicao",
        reset_token: token,
        reset_token_expires_at: expiresAt,
        ativo: true,
      };

      const { data, error } = await supabase
        .from("app_users")
        .insert(fullPayload)
        .select()
        .single();

      if (!error && data) {
        const created: AppUser = {
          ...(data as AppUser),
          status_senha: "pendente_definicao",
          reset_token: token,
          reset_token_expires_at: expiresAt,
        };
        saveLocalUsers([...existingUsers, created]);
        window.dispatchEvent(new Event("ccargo-auth-changed"));
        return { success: true, user: created, resetToken: token, resetUrl };
      } else if (error) {
        // Fallback caso o banco ainda não tenha as colunas status_senha/reset_token
        const minimalPayload = {
          nome: cleanNome,
          email: cleanEmail,
          perfil: params.perfil,
          senha: pendingPassMarker,
          ativo: true,
        };
        const retry = await supabase
          .from("app_users")
          .insert(minimalPayload)
          .select()
          .single();
        if (!retry.error && retry.data) {
          const created: AppUser = {
            ...(retry.data as AppUser),
            status_senha: "pendente_definicao",
            reset_token: token,
            reset_token_expires_at: expiresAt,
          };
          saveLocalUsers([...existingUsers, created]);
          window.dispatchEvent(new Event("ccargo-auth-changed"));
          return { success: true, user: created, resetToken: token, resetUrl };
        }
      }
    } catch (err) {
      console.warn("Fallback local ao criar usuário:", err);
    }
  }

  const newUser: AppUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    nome: cleanNome,
    email: cleanEmail,
    perfil: params.perfil,
    senha: pendingPassMarker,
    status_senha: "pendente_definicao",
    reset_token: token,
    reset_token_expires_at: expiresAt,
    ativo: true,
    created_at: new Date().toISOString(),
  };

  saveLocalUsers([...existingUsers, newUser]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ccargo-auth-changed"));
  }
  return { success: true, user: newUser, resetToken: token, resetUrl };
}

/**
 * Solicitação de Reset de Senha acionada pelo Gestor (US-14).
 * Gera um novo link tokenizado e invalida a senha anterior até que o titular redefina.
 */
export async function requestPasswordReset(userId: string): Promise<{
  success: boolean;
  user?: AppUser;
  resetToken?: string;
  resetUrl?: string;
  error?: string;
}> {
  if (shouldUseServerApi()) {
    const res = await apiRequest<{ user?: AppUser; token?: string; error?: string }>("/api/users", {
      method: "PATCH",
      body: JSON.stringify({ id: userId, action: "request_reset" }),
    });
    if (!res.ok || !res.data.user || !res.data.token) {
      return { success: false, error: res.data.error || "Erro ao solicitar redefinição." };
    }
    const resetUrl = buildPasswordResetUrl(res.data.token, res.data.user.email);
    return {
      success: true,
      user: res.data.user,
      resetToken: res.data.token,
      resetUrl,
    };
  }

  const users = await fetchAllAppUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) {
    return { success: false, error: "Usuário não encontrado." };
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const pendingPassMarker = `__PENDING_${token}`;

  saveSecurityOverlay(target.email, {
    status_senha: "pendente_definicao",
    reset_token: token,
    reset_token_expires_at: expiresAt,
    senha: pendingPassMarker,
  });

  if (isSupabaseConfigured && supabase && !target.id.startsWith("usr-")) {
    try {
      const { error } = await supabase
        .from("app_users")
        .update({
          senha: pendingPassMarker,
          status_senha: "pendente_definicao",
          reset_token: token,
          reset_token_expires_at: expiresAt,
        })
        .eq("id", target.id);

      if (error) {
        await supabase
          .from("app_users")
          .update({ senha: pendingPassMarker })
          .eq("id", target.id);
      }
    } catch (err) {
      console.warn("Erro ao salvar token de reset no Supabase:", err);
    }
  }

  const updatedUsers = users.map((u) =>
    u.id === target.id
      ? {
          ...u,
          senha: pendingPassMarker,
          status_senha: "pendente_definicao" as PasswordStatus,
          reset_token: token,
          reset_token_expires_at: expiresAt,
        }
      : u
  );
  saveLocalUsers(updatedUsers);

  const resetUrl = buildPasswordResetUrl(token, target.email);
  return {
    success: true,
    user: updatedUsers.find((u) => u.id === target.id),
    resetToken: token,
    resetUrl,
  };
}

/**
 * Valida o token recebido na URL /definir-senha?token=...&email=...
 */
export async function validatePasswordResetToken(
  token: string,
  emailHint?: string
): Promise<{ valid: boolean; user?: AppUser; error?: string }> {
  const cleanToken = (token || "").trim();
  if (!cleanToken) {
    return { valid: false, error: "Link de definição de senha inválido ou incompleto." };
  }

  if (shouldUseServerApi()) {
    const params = new URLSearchParams({ token: cleanToken });
    if (emailHint) params.set("email", emailHint.trim().toLowerCase());
    const res = await apiRequest<{ valid?: boolean; user?: AppUser; error?: string }>(
      `/api/auth/password-reset?${params.toString()}`
    );
    return {
      valid: Boolean(res.ok && res.data.valid),
      user: res.data.user,
      error: res.data.error,
    };
  }

  const users = await fetchAllAppUsers();
  // Blindagem de Segurança (SEC-05): O token real é OBRIGATÓRIO para validação
  const matched = users.find(
    (u) =>
      Boolean(u.reset_token && u.reset_token === cleanToken) ||
      u.senha === `__PENDING_${cleanToken}`
  );

  if (!matched) {
    return {
      valid: false,
      error: "Este link de definição de senha já foi utilizado ou expirou.",
    };
  }

  // Se houver emailHint na URL, deve corresponder estritamente ao e-mail do titular do token
  if (
    emailHint &&
    matched.email.toLowerCase().trim() !== emailHint.toLowerCase().trim()
  ) {
    return {
      valid: false,
      error: "O e-mail informado não corresponde ao titular deste link de segurança.",
    };
  }

  if (matched.reset_token_expires_at) {
    const exp = new Date(matched.reset_token_expires_at).getTime();
    if (!isNaN(exp) && Date.now() > exp) {
      return {
        valid: false,
        error: "Este link expirou (validade de 24h). Solicite um novo envio ao Gestor.",
      };
    }
  }

  return { valid: true, user: matched };
}

/**
 * Efetiva a criação ou redefinição de senha pelo próprio usuário na tela /definir-senha
 */
export async function completePasswordDefinition(params: {
  token: string;
  emailHint?: string;
  novaSenha: string;
}): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const cleanPass = params.novaSenha.trim();
  if (cleanPass.length < 8) {
    return {
      success: false,
      error: "A senha deve conter no mínimo 8 caracteres para sua segurança.",
    };
  }

  if (shouldUseServerApi()) {
    const res = await apiRequest<{ success?: boolean; user?: AppUser; error?: string }>(
      "/api/auth/password-reset",
      {
        method: "POST",
        body: JSON.stringify({
          token: params.token,
          email: params.emailHint,
          novaSenha: cleanPass,
        }),
      }
    );
    if (!res.ok || !res.data.success || !res.data.user) {
      return { success: false, error: res.data.error || "Erro ao definir senha." };
    }
    localStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(res.data.user));
    window.dispatchEvent(new Event("ccargo-auth-changed"));
    return { success: true, user: res.data.user };
  }

  const validation = await validatePasswordResetToken(params.token, params.emailHint);
  if (!validation.valid || !validation.user) {
    return {
      success: false,
      error: validation.error || "Token inválido ou expirado.",
    };
  }

  const target = validation.user;

  saveSecurityOverlay(target.email, {
    status_senha: "ativa",
    reset_token: undefined,
    reset_token_expires_at: undefined,
    senha: cleanPass,
  });

  if (isSupabaseConfigured && supabase && !target.id.startsWith("usr-")) {
    try {
      const { error } = await supabase
        .from("app_users")
        .update({
          senha: cleanPass,
          status_senha: "ativa",
          reset_token: null,
          reset_token_expires_at: null,
        })
        .eq("id", target.id);

      if (error) {
        await supabase.from("app_users").update({ senha: cleanPass }).eq("id", target.id);
      }
    } catch (err) {
      console.warn("Erro ao atualizar senha no Supabase:", err);
    }
  }

  const users = await fetchAllAppUsers();
  const updatedUsers = users.map((u) =>
    u.id === target.id
      ? {
          ...u,
          senha: cleanPass,
          status_senha: "ativa" as PasswordStatus,
          reset_token: undefined,
          reset_token_expires_at: undefined,
        }
      : u
  );
  saveLocalUsers(updatedUsers);

  const sessionUser: AppUser = {
    id: target.id,
    nome: target.nome,
    email: target.email,
    perfil: target.perfil,
    status_senha: "ativa",
    ativo: target.ativo,
    created_at: target.created_at,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(sessionUser));
    window.dispatchEvent(new Event("ccargo-auth-changed"));
  }

  return { success: true, user: sessionUser };
}

export async function toggleAppUserActive(id: string, ativo: boolean): Promise<boolean> {
  if (shouldUseServerApi()) {
    const res = await apiRequest<{ success?: boolean }>("/api/users", {
      method: "PATCH",
      body: JSON.stringify({ id, action: "toggle_active", ativo }),
    });
    if (res.ok) {
      window.dispatchEvent(new Event("ccargo-auth-changed"));
      return true;
    }
    return false;
  }

  if (isSupabaseConfigured && supabase && !id.startsWith("usr-")) {
    try {
      await supabase.from("app_users").update({ ativo }).eq("id", id);
    } catch (err) {
      console.warn("Erro ao alterar status ativo no Supabase:", err);
    }
  }

  const users = await fetchAllAppUsers();
  const updated = users.map((u) => (u.id === id ? { ...u, ativo } : u));
  saveLocalUsers(updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ccargo-auth-changed"));
  }
  return true;
}

export async function deleteAppUser(id: string): Promise<{
  success: boolean;
  blockedByHistory?: boolean;
  accountsCount?: number;
  logsCount?: number;
  error?: string;
}> {
  if (shouldUseServerApi()) {
    const res = await apiRequest<{ success?: boolean; error?: string }>(
      `/api/users?id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      window.dispatchEvent(new Event("ccargo-auth-changed"));
      return { success: true };
    }
    return {
      success: false,
      blockedByHistory: res.status === 409,
      error: res.data.error || "Erro ao excluir usuário.",
    };
  }

  const users = await fetchAllAppUsers();
  const target = users.find((u) => u.id === id);
  if (!target) {
    return { success: false, error: "Usuário não encontrado." };
  }

  const targetName = target.nome.trim().toLowerCase();
  const [allAccounts, allLogs] = await Promise.all([
    fetchAllAccounts(),
    fetchAllContactLogs(),
  ]);

  const accountsCount = allAccounts.filter((acc) => {
    const sdr = (acc.sdr_responsavel_nome || "").trim().toLowerCase();
    const mgr = (acc.gerente_conta_nome || "").trim().toLowerCase();
    return sdr === targetName || mgr === targetName;
  }).length;

  const logsCount = allLogs.filter((log) => {
    const op = (log.usuario_nome || "").trim().toLowerCase();
    return op === targetName;
  }).length;

  if (accountsCount > 0 || logsCount > 0) {
    return {
      success: false,
      blockedByHistory: true,
      accountsCount,
      logsCount,
      error: `Não é permitido excluir "${target.nome}" pois há ${accountsCount} prospecção(ões) e ${logsCount} interação(ões) vinculadas ao histórico de Lead Time, Cycle Time e Performance.`,
    };
  }

  if (isSupabaseConfigured && supabase && !id.startsWith("usr-")) {
    try {
      await supabase.from("app_users").delete().eq("id", id);
    } catch (err) {
      console.warn(err);
    }
  }

  const updated = users.filter((u) => u.id !== id);
  saveLocalUsers(updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ccargo-auth-changed"));
  }
  return { success: true };
}

// Helpers de compatibilidade para relatórios e filtros
export function getCurrentOperator(): string {
  const auth = getAuthenticatedUser();
  if (auth) return auth.nome;
  return "Ana Paula (Comercial)";
}

export function getOperatorsList(): OperatorUser[] {
  const users = getLocalUsers();
  return users.map((u) => ({
    id: u.id,
    nome: u.nome,
    cargo: u.perfil === "gestor" ? "Gestor Comercial" : "Comercial / Prospecção",
    email: u.email,
    perfil: u.perfil,
  }));
}

// ============================================================================
// OVERLAYS LOCAIS PARA OBSERVAÇÕES E HISTÓRICO DE ETAPAS (LEAD TIME / CYCLE TIME)
// ============================================================================

function getNotesOverlay(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTES_OVERLAY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveNoteOverlay(accountId: string, cnpj: string, note: string): void {
  if (typeof window === "undefined") return;
  try {
    const map = getNotesOverlay();
    map[accountId] = note;
    if (cnpj) map[cleanCNPJ(cnpj)] = note;
    localStorage.setItem(STORAGE_KEY_NOTES_OVERLAY, JSON.stringify(map));
  } catch (err) {
    console.error(err);
  }
}

function getOrderOverlay(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_KANBAN_ORDER_OVERLAY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOrderOverlay(accountId: string, cnpj: string, order: number): void {
  if (typeof window === "undefined") return;
  try {
    const map = getOrderOverlay();
    map[accountId] = order;
    if (cnpj) map[cleanCNPJ(cnpj)] = order;
    localStorage.setItem(STORAGE_KEY_KANBAN_ORDER_OVERLAY, JSON.stringify(map));
  } catch (err) {
    console.error(err);
  }
}

function getStageHistoryOverlay(): Record<string, Partial<Record<LeadStage, string>>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STAGE_OVERLAY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function recordStageTransition(accountId: string, cnpj: string, stage: LeadStage): void {
  if (typeof window === "undefined") return;
  try {
    const map = getStageHistoryOverlay();
    const nowIso = new Date().toISOString();
    const currentById = map[accountId] || {};
    currentById[stage] = nowIso;
    map[accountId] = currentById;

    if (cnpj) {
      const clean = cleanCNPJ(cnpj);
      const currentByCnpj = map[clean] || {};
      currentByCnpj[stage] = nowIso;
      map[clean] = currentByCnpj;
    }
    localStorage.setItem(STORAGE_KEY_STAGE_OVERLAY, JSON.stringify(map));
  } catch (err) {
    console.error(err);
  }
}

function buildSynthesizedStageHistory(acc: Account): Partial<Record<LeadStage, string>> {
  const createdMs = new Date(acc.created_at).getTime() || Date.now() - 5 * DAY_MS;
  const updatedMs = new Date(acc.updated_at || acc.created_at).getTime() || Date.now();
  const currentStage =
    acc.status === "cliente_ativo"
      ? "fechado_ganho"
      : normalizeLeadStage(acc.estagio);

  const idx = Math.max(0, ORDERED_STAGE_KEYS.indexOf(currentStage));
  const totalSpan = Math.max(DAY_MS, updatedMs - createdMs);
  const stepMs = idx > 0 ? totalSpan / idx : 0;

  const history: Partial<Record<LeadStage, string>> = {};
  for (let i = 0; i <= idx; i++) {
    const st = ORDERED_STAGE_KEYS[i];
    history[st] = new Date(createdMs + i * stepMs).toISOString();
  }
  return history;
}

// ============================================================================
// ARMAZENAMENTO DE CONTAS
// ============================================================================

function getLocalAccounts(): Account[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) return [];
    return JSON.parse(raw) as Account[];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: Account[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error("Erro salvando contas no localStorage:", err);
  }
}

function mergeWithOverlay(accounts: Account[]): Account[] {
  const overlay = getNotesOverlay();
  const stageOverlay = getStageHistoryOverlay();
  const orderOverlay = getOrderOverlay();

  return accounts.map((acc) => {
    const clean = cleanCNPJ(acc.cnpj);
    const overlayNote = overlay[acc.id] ?? overlay[clean];
    const overlayOrder = orderOverlay[acc.id] ?? orderOverlay[clean];
    const hasServerStageData =
      acc.stage_transitions !== undefined || acc.stage_history !== undefined;
    const customStages = hasServerStageData
      ? {}
      : stageOverlay[acc.id] || stageOverlay[clean] || {};
    const baseStages = acc.stage_history || buildSynthesizedStageHistory(acc);

    const mergedHistory = {
      ...baseStages,
      ...customStages,
    };
    if (mergedHistory.cotacao_frete && !mergedHistory.negociacao) {
      mergedHistory.negociacao = mergedHistory.cotacao_frete;
    }

    return {
      ...acc,
      estagio: acc.estagio ? normalizeLeadStage(acc.estagio) : acc.estagio,
      kanban_order:
        typeof acc.kanban_order === "number" && Number.isFinite(acc.kanban_order)
          ? acc.kanban_order
          : overlayOrder,
      observacoes_importantes:
        overlayNote !== undefined ? overlayNote : acc.observacoes_importantes || undefined,
      sdr_responsavel_nome: acc.sdr_responsavel_nome || "Ana Paula (Comercial)",
      stage_history: mergedHistory,
      fechado_em: acc.fechado_em || customStages.fechado_ganho || baseStages.fechado_ganho,
    };
  });
}

export async function fetchAllAccounts(): Promise<Account[]> {
  if (shouldUseServerApi()) {
    const res = await apiRequest<{ data?: Account[]; error?: string }>("/api/accounts");
    if (!res.ok) {
      throw new Error(res.data.error || "Erro ao carregar contas do servidor.");
    }
    return mergeWithOverlay(res.data.data || []);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return mergeWithOverlay(data as Account[]);
      }
    } catch (err) {
      console.warn("Falha ao consultar Supabase, usando armazenamento local:", err);
    }
  }
  return mergeWithOverlay(getLocalAccounts());
}

export async function fetchAccountById(id: string): Promise<Account | null> {
  const accounts = await fetchAllAccounts();
  return accounts.find((a) => a.id === id) || null;
}

export async function checkCNPJCollision(rawCnpj: string): Promise<CollisionCheckResult> {
  const clean = cleanCNPJ(rawCnpj);
  const raiz = getCNPJRaiz(clean);

  if (shouldUseServerApi()) {
    const res = await apiRequest<CollisionCheckResult & { error?: string }>(
      `/api/accounts/check-cnpj?cnpj=${encodeURIComponent(clean)}`
    );
    if (!res.ok) {
      throw new Error(res.data.error || "Erro ao verificar CNPJ no servidor.");
    }
    return {
      has_exact_collision: Boolean(res.data.has_exact_collision),
      exact_match: res.data.exact_match || null,
      has_related_collision: Boolean(res.data.has_related_collision),
      related_accounts: res.data.related_accounts || [],
    };
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc("check_cnpj_collision", { p_cnpj: clean });
      if (!error && data && (data.has_exact_collision || data.has_related_collision)) {
        return {
          has_exact_collision: Boolean(data.has_exact_collision),
          exact_match: data.exact_match as Account | null,
          has_related_collision: Boolean(data.has_related_collision),
          related_accounts: (data.related_accounts || []) as Account[],
        };
      }
    } catch (rpcErr) {
      console.warn("Erro no RPC do Supabase, recorrendo à verificação em memória:", rpcErr);
    }
  }

  const accounts = await fetchAllAccounts();
  const exactMatch = accounts.find((a) => cleanCNPJ(a.cnpj) === clean) || null;
  const relatedAccounts = accounts.filter((a) => {
    const accountRaiz = a.cnpj_raiz || getCNPJRaiz(a.cnpj);
    return accountRaiz === raiz && cleanCNPJ(a.cnpj) !== clean;
  });

  return {
    has_exact_collision: Boolean(exactMatch),
    exact_match: exactMatch,
    has_related_collision: relatedAccounts.length > 0,
    related_accounts: relatedAccounts,
  };
}

export async function createAccount(
  accountData: Omit<Account, "id" | "cnpj_raiz" | "created_at" | "updated_at">
): Promise<Account> {
  const clean = cleanCNPJ(accountData.cnpj);
  const raiz = getCNPJRaiz(clean);
  const formatted = formatCNPJ(clean);
  const initialStage = accountData.estagio || "prospeccao_inicial";

  // US-01 & US-11: Trava de integridade anti-duplicidade na persistência
  const collision = await checkCNPJCollision(clean);
  if (collision.has_exact_collision && collision.exact_match) {
    if (collision.exact_match.status === "cliente_ativo") {
      throw new Error("CNPJ já é cliente ativo da CCargo. Prospecção bloqueada.");
    }
    if (
      collision.exact_match.status === "lead" &&
      collision.exact_match.estagio !== "perdido"
    ) {
      throw new Error(
        `CNPJ já possui oportunidade em andamento com ${
          collision.exact_match.sdr_responsavel_nome || "outro operador"
        }. Prospecção concorrente bloqueada.`
      );
    }
  }

  const payload = {
    ...accountData,
    cnpj: clean,
    cnpj_formatado: formatted,
    sdr_responsavel_nome: accountData.sdr_responsavel_nome || getCurrentOperator(),
  };

  if (accountData.observacoes_importantes) {
    saveNoteOverlay(clean, clean, accountData.observacoes_importantes);
  }
  recordStageTransition(clean, clean, initialStage);

  if (shouldUseServerApi()) {
    const res = await apiRequest<{ data?: Account; error?: string }>("/api/accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.data.data) {
      throw new Error(res.data.error || "Erro ao salvar oportunidade no servidor.");
    }
    const created = res.data.data;
    if (accountData.observacoes_importantes) {
      saveNoteOverlay(created.id, clean, accountData.observacoes_importantes);
    }
    recordStageTransition(created.id, clean, initialStage);
    return mergeWithOverlay([created])[0];
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { stage_history, fechado_em, ...dbPayload } = payload;
      const { data, error } = await supabase
        .from("accounts")
        .insert(dbPayload)
        .select()
        .single();

      if (!error && data) {
        const created = data as Account;
        if (accountData.observacoes_importantes) {
          saveNoteOverlay(created.id, clean, accountData.observacoes_importantes);
        }
        recordStageTransition(created.id, clean, initialStage);
        return mergeWithOverlay([created])[0];
      } else if (error) {
        const { observacoes_importantes, ...payloadWithoutNotes } = dbPayload;
        const retry = await supabase
          .from("accounts")
          .insert(payloadWithoutNotes)
          .select()
          .single();
        if (!retry.error && retry.data) {
          const created = retry.data as Account;
          if (observacoes_importantes) {
            saveNoteOverlay(created.id, clean, observacoes_importantes);
          }
          recordStageTransition(created.id, clean, initialStage);
          return mergeWithOverlay([created])[0];
        }
      }
    } catch (err) {
      console.warn("Erro ao salvar no Supabase, salvando localmente:", err);
    }
  }

  const nowIso = new Date().toISOString();
  const newAccount: Account = {
    ...payload,
    id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    cnpj_raiz: raiz,
    stage_history: { [initialStage]: nowIso },
    created_at: nowIso,
    updated_at: nowIso,
  };

  const accounts = getLocalAccounts();
  const updated = [newAccount, ...accounts];
  saveLocalAccounts(updated);
  return newAccount;
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<Account | null> {
  if (updates.observacoes_importantes !== undefined) {
    saveNoteOverlay(id, updates.cnpj || "", updates.observacoes_importantes);
  }
  if (updates.kanban_order !== undefined) {
    saveOrderOverlay(id, updates.cnpj || "", updates.kanban_order);
  }
  if (updates.estagio) {
    recordStageTransition(id, updates.cnpj || "", updates.estagio);
  }

  if (shouldUseServerApi() && !id.startsWith("acc-")) {
    const {
      stage_history: _sh,
      stage_transitions: _st,
      fechado_em: _fe,
      ...dbUpdates
    } = updates;
    const res = await apiRequest<{ data?: Account | null; error?: string }>("/api/accounts", {
      method: "PATCH",
      body: JSON.stringify({ id, updates: dbUpdates }),
    });
    if (!res.ok) {
      throw new Error(res.data.error || "Erro ao atualizar conta no servidor.");
    }
    return res.data.data ? mergeWithOverlay([res.data.data])[0] : null;
  }

  if (isSupabaseConfigured && supabase && !id.startsWith("acc-")) {
    try {
      const { stage_history, stage_transitions, fechado_em, ...dbUpdates } = updates;
      const { data, error } = await supabase
        .from("accounts")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        return mergeWithOverlay([data as Account])[0];
      } else if (error) {
        const {
          observacoes_importantes: _obs,
          kanban_order: _order,
          ...rest
        } = dbUpdates;
        if (Object.keys(rest).length > 0) {
          const retry = await supabase
            .from("accounts")
            .update(rest)
            .eq("id", id)
            .select()
            .single();
          if (!retry.error && retry.data) {
            return mergeWithOverlay([retry.data as Account])[0];
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao atualizar no Supabase:", err);
    }
  }

  const accounts = getLocalAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const updatedAccount: Account = {
    ...accounts[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  accounts[index] = updatedAccount;
  saveLocalAccounts(accounts);
  return mergeWithOverlay([updatedAccount])[0];
}

export async function deleteAccount(id: string): Promise<boolean> {
  if (shouldUseServerApi() && !id.startsWith("acc-")) {
    const res = await apiRequest<{ success?: boolean; error?: string }>(
      `/api/accounts?id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      throw new Error(res.data.error || "Erro ao remover conta no servidor.");
    }
    return true;
  }

  if (isSupabaseConfigured && supabase && !id.startsWith("acc-")) {
    try {
      await supabase.from("accounts").delete().eq("id", id);
    } catch (err) {
      console.warn("Erro ao deletar no Supabase:", err);
    }
  }
  const accounts = getLocalAccounts().filter((a) => a.id !== id);
  saveLocalAccounts(accounts);
  return true;
}

// ============================================================================
// HISTÓRICO DE CONTATOS / LIGAÇÕES
// ============================================================================

function getLocalLogs(): ContactLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) return [];
    return JSON.parse(raw) as ContactLog[];
  } catch {
    return [];
  }
}

export async function fetchAllContactLogs(): Promise<ContactLog[]> {
  if (shouldUseServerApi()) {
    const res = await apiRequest<{ data?: ContactLog[]; error?: string }>("/api/contact-logs");
    if (!res.ok) {
      throw new Error(res.data.error || "Erro ao carregar histórico de contatos.");
    }
    return (res.data.data || []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("contact_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return (data as ContactLog[]).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    } catch (err) {
      console.warn("Erro ao buscar todos os logs no Supabase:", err);
    }
  }

  return getLocalLogs().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function fetchContactLogs(accountId: string): Promise<ContactLog[]> {
  const all = await fetchAllContactLogs();
  return all.filter((l) => l.account_id === accountId);
}

export async function fetchStageHistory(accountId: string): Promise<StageTransition[]> {
  if (shouldUseServerApi() && !accountId.startsWith("acc-")) {
    const res = await apiRequest<{ data?: StageTransition[]; error?: string }>(
      `/api/stage-history?accountId=${encodeURIComponent(accountId)}`
    );
    if (!res.ok) {
      throw new Error(res.data.error || "Erro ao carregar histórico de movimentações.");
    }
    return res.data.data || [];
  }

  return [];
}

export async function addContactLog(
  logData: Omit<ContactLog, "id" | "created_at">
): Promise<ContactLog> {
  const payload = {
    ...logData,
    usuario_nome: logData.usuario_nome || getCurrentOperator(),
  };

  if (shouldUseServerApi() && !logData.account_id.startsWith("acc-")) {
    const res = await apiRequest<{ data?: ContactLog; error?: string }>("/api/contact-logs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.data.data) {
      throw new Error(res.data.error || "Erro ao registrar contato no servidor.");
    }
    return res.data.data;
  }

  if (isSupabaseConfigured && supabase && !logData.account_id.startsWith("acc-")) {
    try {
      const { data, error } = await supabase
        .from("contact_logs")
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        return data as ContactLog;
      }
    } catch (err) {
      console.warn("Erro ao adicionar log no Supabase:", err);
    }
  }

  const newLog: ContactLog = {
    ...payload,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const logs = getLocalLogs();
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify([newLog, ...logs]));
    } catch (err) {
      console.error(err);
    }
  }

  return newLog;
}
