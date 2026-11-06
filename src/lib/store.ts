import {
  Account,
  AppUser,
  CollisionCheckResult,
  ContactLog,
  LeadStage,
  OperatorUser,
  PasswordStatus,
  UserRole,
} from "@/types";
import { cleanCNPJ, formatCNPJ, getCNPJRaiz } from "./utils";
import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_ACCOUNTS = "ccargo_accounts_v2";
const STORAGE_KEY_LOGS = "ccargo_contact_logs_v2";
const STORAGE_KEY_NOTES_OVERLAY = "ccargo_notes_overlay_v1";
const STORAGE_KEY_STAGE_OVERLAY = "ccargo_stage_history_overlay_v1";
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

const INITIAL_ACCOUNTS: Account[] = [
  {
    id: "acc-tauste",
    cnpj: "45464748000133",
    cnpj_raiz: "45464748",
    cnpj_formatado: "45.464.748/0001-33",
    razao_social: "TAUSTE SUPERMERCADOS LTDA",
    nome_fantasia: "Tauste Supermercados (CD Central)",
    status: "lead",
    estagio: "cotacao_frete",
    contato_nome: "Henrique Martins",
    contato_cargo: "Gerente de Logística e Recebimento",
    telefone: "(14) 99711-2233",
    email: "logistica@tauste.com.br",
    tipo_carga: "Lotação (FTL)",
    rotas_principais: ["SP ⇄ Interior SP (Marília/Bauru/Sorocaba)", "PR ⇄ SP"],
    tipos_veiculos: ["Carreta Sider", "Truck Baú", "Carreta Frigorífica / Refrigerada"],
    volume_mensal_estimado: "25 viagens/mês",
    sdr_responsavel_nome: "Ana Paula (Comercial)",
    cidade: "Marília",
    uf: "SP",
    observacoes_importantes:
      "Cliente exige carga 100% paletizada (padrão PBR). Não carrega carga batida no chão. Recebimento no CD apenas com agendamento de janela entre 07h e 13h. Solicita veículos com menos de 10 anos de uso e seguro atualizado.",
    stage_history: {
      prospeccao_inicial: new Date(Date.now() - 8 * DAY_MS).toISOString(),
      qualificacao_logistica: new Date(Date.now() - 5 * DAY_MS).toISOString(),
      cotacao_frete: new Date(Date.now() - 2 * DAY_MS).toISOString(),
    },
    created_at: new Date(Date.now() - 8 * DAY_MS).toISOString(),
    updated_at: new Date(Date.now() - 1 * DAY_MS).toISOString(),
  },
  {
    id: "acc-1",
    cnpj: "12345678000190",
    cnpj_raiz: "12345678",
    cnpj_formatado: "12.345.678/0001-90",
    razao_social: "AMBEV DISTRIBUICAO S.A.",
    nome_fantasia: "Ambev Centro de Distribuição",
    status: "cliente_ativo",
    estagio: "fechado_ganho",
    gerente_conta_nome: "Roberto Silva (Executivo Key Accounts)",
    sdr_responsavel_nome: "Ana Paula (Comercial)",
    tipo_carga: "Lotação (FTL)",
    rotas_principais: ["SP-PR", "SP-RJ", "MG-SP"],
    tipos_veiculos: ["Carreta LS", "Bitrem"],
    volume_mensal_estimado: "45 carretas/mês",
    cidade: "São Paulo",
    uf: "SP",
    observacoes_importantes:
      "Cliente estratégico da carteira ativa. Exige rastreamento dedicado e checklist de segurança antes do embarque.",
    stage_history: {
      prospeccao_inicial: new Date(Date.now() - 60 * DAY_MS).toISOString(),
      qualificacao_logistica: new Date(Date.now() - 56 * DAY_MS).toISOString(),
      cotacao_frete: new Date(Date.now() - 52 * DAY_MS).toISOString(),
      proposta_enviada: new Date(Date.now() - 48 * DAY_MS).toISOString(),
      negociacao: new Date(Date.now() - 44 * DAY_MS).toISOString(),
      fechado_ganho: new Date(Date.now() - 41 * DAY_MS).toISOString(),
    },
    fechado_em: new Date(Date.now() - 41 * DAY_MS).toISOString(),
    created_at: new Date(Date.now() - 60 * DAY_MS).toISOString(),
    updated_at: new Date(Date.now() - 41 * DAY_MS).toISOString(),
  },
  {
    id: "acc-2",
    cnpj: "98765432000111",
    cnpj_raiz: "98765432",
    cnpj_formatado: "98.765.432/0001-11",
    razao_social: "COMERCIAL DE ALIMENTOS BARATO LTDA",
    nome_fantasia: "Supermercados Barateiro",
    status: "desqualificado",
    estagio: "perdido",
    motivo_desqualificacao: "baixa_rentabilidade",
    detalhe_desqualificacao:
      "Cliente exigiu frete a R$ 3,10/km sem retorno garantido na rota interior de SP para GO. Operação altamente deficitária.",
    data_desqualificacao: new Date(Date.now() - 15 * DAY_MS).toISOString(),
    tipo_carga: "Fracionada (LTL)",
    rotas_principais: ["SP-GO"],
    tipos_veiculos: ["Truck Baú"],
    sdr_responsavel_nome: "Ana Paula (Comercial)",
    cidade: "Campinas",
    uf: "SP",
    observacoes_importantes:
      "Não aceita repasse de pedágio na tabela e costuma reter caminhão por mais de 8h na descarga sem pagamento de estadia.",
    stage_history: {
      prospeccao_inicial: new Date(Date.now() - 20 * DAY_MS).toISOString(),
      qualificacao_logistica: new Date(Date.now() - 18 * DAY_MS).toISOString(),
      cotacao_frete: new Date(Date.now() - 16 * DAY_MS).toISOString(),
      perdido: new Date(Date.now() - 15 * DAY_MS).toISOString(),
    },
    created_at: new Date(Date.now() - 20 * DAY_MS).toISOString(),
    updated_at: new Date(Date.now() - 15 * DAY_MS).toISOString(),
  },
  {
    id: "acc-3",
    cnpj: "55443322000100",
    cnpj_raiz: "55443322",
    cnpj_formatado: "55.443.322/0001-00",
    razao_social: "METALURGICA DO SUL INDUSTRIA E COMERCIO S.A.",
    nome_fantasia: "Metalúrgica do Sul",
    status: "lead",
    estagio: "proposta_enviada",
    contato_nome: "Mariana Santos",
    contato_cargo: "Coordenadora de Logística",
    telefone: "(11) 98765-4321",
    email: "mariana.log@metalurgicasul.com.br",
    tipo_carga: "Lotação (FTL)",
    rotas_principais: ["RS-SP", "PR-SP"],
    tipos_veiculos: ["Carreta Grade Baixa", "Carreta Sider"],
    volume_mensal_estimado: "12 carretas/mês",
    sdr_responsavel_nome: "Ana Paula (Comercial)",
    cidade: "Caxias do Sul",
    uf: "RS",
    observacoes_importantes:
      "Carrega chapas e perfis metálicos. Exige no mínimo 12 cintas catracadas e cantoneiras de proteção. Não carrega veículo com assoalho de madeira danificado.",
    stage_history: {
      prospeccao_inicial: new Date(Date.now() - 9 * DAY_MS).toISOString(),
      qualificacao_logistica: new Date(Date.now() - 7 * DAY_MS).toISOString(),
      cotacao_frete: new Date(Date.now() - 4 * DAY_MS).toISOString(),
      proposta_enviada: new Date(Date.now() - 2 * DAY_MS).toISOString(),
    },
    created_at: new Date(Date.now() - 9 * DAY_MS).toISOString(),
    updated_at: new Date(Date.now() - 2 * DAY_MS).toISOString(),
  },
  {
    id: "acc-4",
    cnpj: "33221100000188",
    cnpj_raiz: "33221100",
    cnpj_formatado: "33.221.100/0001-88",
    razao_social: "AGROGRAOS DO CERRADO EXPORTACAO LTDA",
    nome_fantasia: "AgroGrãos Cerrado",
    status: "lead",
    estagio: "fechado_ganho",
    contato_nome: "Fernando Costa",
    contato_cargo: "Gerente de Suprimentos",
    telefone: "(62) 99876-1234",
    email: "fernando@agrograos.com.br",
    tipo_carga: "Lotação (FTL)",
    rotas_principais: ["GO-SP (Porto de Santos)"],
    tipos_veiculos: ["Carreta Rodotrem / Bitrem", "Carreta LS (3 Eixos)"],
    volume_mensal_estimado: "60 viagens/safra",
    sdr_responsavel_nome: "Ana Paula (Comercial)",
    cidade: "Rio Verde",
    uf: "GO",
    observacoes_importantes:
      "Fechou pacote inicial de 15 viagens mensais para dezembro. Exige lona impermeável nova e motorista com cadastro ativo em gerenciadora de risco.",
    stage_history: {
      prospeccao_inicial: new Date(Date.now() - 14 * DAY_MS).toISOString(),
      qualificacao_logistica: new Date(Date.now() - 11 * DAY_MS).toISOString(),
      cotacao_frete: new Date(Date.now() - 8 * DAY_MS).toISOString(),
      proposta_enviada: new Date(Date.now() - 6 * DAY_MS).toISOString(),
      negociacao: new Date(Date.now() - 3 * DAY_MS).toISOString(),
      fechado_ganho: new Date(Date.now() - 1 * DAY_MS).toISOString(),
    },
    fechado_em: new Date(Date.now() - 1 * DAY_MS).toISOString(),
    created_at: new Date(Date.now() - 14 * DAY_MS).toISOString(),
    updated_at: new Date(Date.now() - 1 * DAY_MS).toISOString(),
  },
];

const INITIAL_LOGS: ContactLog[] = [
  {
    id: "log-t1",
    account_id: "acc-tauste",
    tipo_contato: "telefone",
    resultado: "sem_resposta",
    resumo:
      "Liguei no ramal da logística às 09h40. Tocou até cair na caixa postal. Recepcionista informou que o Henrique estava em reunião de pátio.",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: new Date(Date.now() - 6 * DAY_MS).toISOString(),
  },
  {
    id: "log-t2",
    account_id: "acc-tauste",
    tipo_contato: "telefone",
    resultado: "reagendado",
    resumo:
      "Novo contato às 14h30. Falei brevemente com a assistente Camila, que pediu para ligar na quinta-feira pela manhã diretamente para o Henrique Martins.",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: new Date(Date.now() - 4 * DAY_MS).toISOString(),
  },
  {
    id: "log-t3",
    account_id: "acc-tauste",
    tipo_contato: "whatsapp",
    resultado: "sucesso",
    resumo:
      "Consegui falar com Henrique Martins! Explicou que precisam de Carreta Sider e Frigorífica para abastecimento entre CD Marília, Bauru e Sorocaba. Avisou que NÃO carregam carga batida (somente paletizada PBR) e pediu cotação formal por faixa de km.",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: new Date(Date.now() - 1 * DAY_MS).toISOString(),
  },
  {
    id: "log-m1",
    account_id: "acc-3",
    tipo_contato: "telefone",
    resultado: "sucesso",
    resumo:
      "Falei com Mariana Santos (Coordenadora). Enviou planilha com volumes da rota Caxias do Sul (RS) -> Guarulhos (SP). Proposta comercial enviada por e-mail.",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: new Date(Date.now() - 2 * DAY_MS).toISOString(),
  },
  {
    id: "log-a1",
    account_id: "acc-4",
    tipo_contato: "reuniao",
    resultado: "sucesso",
    resumo:
      "Reunião de fechamento de tabela GO -> Santos. Fernando aprovou os valores de frete para início imediato da operação.",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: new Date(Date.now() - 1 * DAY_MS).toISOString(),
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
  const randA = Math.random().toString(36).substring(2, 10);
  const randB = Math.random().toString(36).substring(2, 10);
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
  if (!token) {
    return { valid: false, error: "Link de definição de senha inválido ou incompleto." };
  }

  const users = await fetchAllAppUsers();
  const matched = users.find(
    (u) =>
      u.reset_token === token ||
      u.senha === `__PENDING_${token}` ||
      (emailHint &&
        u.email.toLowerCase() === emailHint.toLowerCase().trim() &&
        u.status_senha === "pendente_definicao")
  );

  if (!matched) {
    return {
      valid: false,
      error: "Este link de definição de senha já foi utilizado ou expirou.",
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
  if (cleanPass.length < 6) {
    return {
      success: false,
      error: "A senha deve ter pelo menos 6 caracteres para sua segurança.",
    };
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

export async function deleteAppUser(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase && !id.startsWith("usr-")) {
    try {
      await supabase.from("app_users").delete().eq("id", id);
    } catch (err) {
      console.warn(err);
    }
  }

  const updated = getLocalUsers().filter((u) => u.id !== id);
  saveLocalUsers(updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ccargo-auth-changed"));
  }
  return true;
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
  const orderedStages: LeadStage[] = [
    "prospeccao_inicial",
    "qualificacao_logistica",
    "cotacao_frete",
    "proposta_enviada",
    "negociacao",
    "fechado_ganho",
  ];
  const createdMs = new Date(acc.created_at).getTime() || Date.now() - 5 * DAY_MS;
  const updatedMs = new Date(acc.updated_at || acc.created_at).getTime() || Date.now();
  const currentStage =
    acc.status === "cliente_ativo"
      ? "fechado_ganho"
      : acc.estagio || "prospeccao_inicial";

  const idx = Math.max(0, orderedStages.indexOf(currentStage));
  const totalSpan = Math.max(DAY_MS, updatedMs - createdMs);
  const stepMs = idx > 0 ? totalSpan / idx : 0;

  const history: Partial<Record<LeadStage, string>> = {};
  for (let i = 0; i <= idx; i++) {
    const st = orderedStages[i];
    history[st] = new Date(createdMs + i * stepMs).toISOString();
  }
  return history;
}

// ============================================================================
// ARMAZENAMENTO DE CONTAS
// ============================================================================

function getLocalAccounts(): Account[] {
  if (typeof window === "undefined") return INITIAL_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    const parsed: Account[] = JSON.parse(raw);
    if (!parsed.some((a) => cleanCNPJ(a.cnpj) === "45464748000133")) {
      const withTauste = [INITIAL_ACCOUNTS[0], ...parsed];
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(withTauste));
      return withTauste;
    }
    return parsed;
  } catch {
    return INITIAL_ACCOUNTS;
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

  return accounts.map((acc) => {
    const clean = cleanCNPJ(acc.cnpj);
    const seedMatch = INITIAL_ACCOUNTS.find((s) => cleanCNPJ(s.cnpj) === clean);
    const overlayNote = overlay[acc.id] ?? overlay[clean];
    const customStages = stageOverlay[acc.id] || stageOverlay[clean] || {};
    const baseStages =
      acc.stage_history || seedMatch?.stage_history || buildSynthesizedStageHistory(acc);

    return {
      ...acc,
      observacoes_importantes:
        overlayNote !== undefined
          ? overlayNote
          : acc.observacoes_importantes || seedMatch?.observacoes_importantes || undefined,
      sdr_responsavel_nome:
        acc.sdr_responsavel_nome || seedMatch?.sdr_responsavel_nome || "Ana Paula (Comercial)",
      stage_history: {
        ...baseStages,
        ...customStages,
      },
      fechado_em:
        acc.fechado_em ||
        seedMatch?.fechado_em ||
        customStages.fechado_ganho ||
        baseStages.fechado_ganho,
    };
  });
}

export async function fetchAllAccounts(): Promise<Account[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const remoteAccounts = data as Account[];
        const hasTauste = remoteAccounts.some((a) => cleanCNPJ(a.cnpj) === "45464748000133");
        const combined = hasTauste ? remoteAccounts : [INITIAL_ACCOUNTS[0], ...remoteAccounts];
        return mergeWithOverlay(combined);
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
  if (updates.estagio) {
    recordStageTransition(id, updates.cnpj || "", updates.estagio);
  }

  if (isSupabaseConfigured && supabase && !id.startsWith("acc-")) {
    try {
      const { stage_history, fechado_em, ...dbUpdates } = updates;
      const { data, error } = await supabase
        .from("accounts")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        return mergeWithOverlay([data as Account])[0];
      } else if (error && dbUpdates.observacoes_importantes !== undefined) {
        const { observacoes_importantes, ...rest } = dbUpdates;
        if (Object.keys(rest).length > 0) {
          await supabase.from("accounts").update(rest).eq("id", id);
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
  if (typeof window === "undefined") return INITIAL_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_LOGS;
  }
}

export async function fetchAllContactLogs(): Promise<ContactLog[]> {
  const localLogs = getLocalLogs();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("contact_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const remoteLogs = data as ContactLog[];
        const remoteIds = new Set(remoteLogs.map((l) => l.id));
        const merged = [
          ...remoteLogs,
          ...localLogs.filter((l) => !remoteIds.has(l.id)),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return merged;
      }
    } catch (err) {
      console.warn("Erro ao buscar todos os logs no Supabase:", err);
    }
  }

  return localLogs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function fetchContactLogs(accountId: string): Promise<ContactLog[]> {
  const all = await fetchAllContactLogs();
  return all.filter((l) => l.account_id === accountId);
}

export async function addContactLog(
  logData: Omit<ContactLog, "id" | "created_at">
): Promise<ContactLog> {
  const payload = {
    ...logData,
    usuario_nome: logData.usuario_nome || getCurrentOperator(),
  };

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
