import { Account, CollisionCheckResult, ContactLog, OperatorUser } from "@/types";
import { cleanCNPJ, formatCNPJ, getCNPJRaiz } from "./utils";
import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_ACCOUNTS = "ccargo_accounts_v2";
const STORAGE_KEY_LOGS = "ccargo_contact_logs_v2";
const STORAGE_KEY_NOTES_OVERLAY = "ccargo_notes_overlay_v1";
const STORAGE_KEY_CURRENT_OPERATOR = "ccargo_current_operator_v1";
const STORAGE_KEY_OPERATORS_LIST = "ccargo_operators_list_v1";

const DEFAULT_OPERATORS: OperatorUser[] = [
  { id: "op-1", nome: "Ana Paula (Comercial)", cargo: "Operadora de Prospecção (SDR)" },
  { id: "op-2", nome: "Gestora Comercial", cargo: "Diretoria / Gestão Comercial" },
  { id: "op-3", nome: "Marcos Lima (Comercial)", cargo: "Operador de Prospecção (SDR)" },
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
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "acc-1",
    cnpj: "12345678000190",
    cnpj_raiz: "12345678",
    cnpj_formatado: "12.345.678/0001-90",
    razao_social: "AMBEV DISTRIBUICAO S.A.",
    nome_fantasia: "Ambev Centro de Distribuição",
    status: "cliente_ativo",
    gerente_conta_nome: "Roberto Silva (Executivo Key Accounts)",
    tipo_carga: "Lotação (FTL)",
    rotas_principais: ["SP-PR", "SP-RJ", "MG-SP"],
    tipos_veiculos: ["Carreta LS", "Bitrem"],
    volume_mensal_estimado: "45 carretas/mês",
    cidade: "São Paulo",
    uf: "SP",
    observacoes_importantes:
      "Cliente estratégico da carteira ativa. Exige rastreamento dedicado e checklist de segurança antes do embarque.",
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "acc-2",
    cnpj: "98765432000111",
    cnpj_raiz: "98765432",
    cnpj_formatado: "98.765.432/0001-11",
    razao_social: "COMERCIAL DE ALIMENTOS BARATO LTDA",
    nome_fantasia: "Supermercados Barateiro",
    status: "desqualificado",
    motivo_desqualificacao: "baixa_rentabilidade",
    detalhe_desqualificacao:
      "Cliente exigiu frete a R$ 3,10/km sem retorno garantido na rota interior de SP para GO. Operação altamente deficitária.",
    data_desqualificacao: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    tipo_carga: "Fracionada (LTL)",
    rotas_principais: ["SP-GO"],
    tipos_veiculos: ["Truck Baú"],
    sdr_responsavel_nome: "Ana Paula (Comercial)",
    cidade: "Campinas",
    uf: "SP",
    observacoes_importantes:
      "Não aceita repasse de pedágio na tabela e costuma reter caminhão por mais de 8h na descarga sem pagamento de estadia.",
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
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
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
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
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
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
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "log-t2",
    account_id: "acc-tauste",
    tipo_contato: "telefone",
    resultado: "reagendado",
    resumo:
      "Novo contato às 14h30. Falei brevemente com a assistente Camila, que pediu para ligar na quinta-feira pela manhã diretamente para o Henrique Martins.",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "log-t3",
    account_id: "acc-tauste",
    tipo_contato: "whatsapp",
    resultado: "sucesso",
    resumo:
      "Consegui falar com Henrique Martins! Explicou que precisam de Carreta Sider e Frigorífica para abastecimento entre CD Marília, Bauru e Sorocaba. Avisou que NÃO carregam carga batida (somente paletizada PBR) e pediu cotação formal por faixa de km.",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "log-m1",
    account_id: "acc-3",
    tipo_contato: "telefone",
    resultado: "sucesso",
    resumo:
      "Falei com Mariana Santos (Coordenadora). Enviou planilha com volumes da rota Caxias do Sul (RS) -> Guarulhos (SP). Proposta comercial enviada por e-mail.",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "log-a1",
    account_id: "acc-4",
    tipo_contato: "reuniao",
    resultado: "sucesso",
    resumo:
      "Reunião de fechamento de tabela GO -> Santos. Fernando aprovou os valores de frete para início imediato da operação.",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================================================
// GESTÃO DE OPERADORES / USUÁRIOS (US-09)
// ============================================================================

export function getOperatorsList(): OperatorUser[] {
  if (typeof window === "undefined") return DEFAULT_OPERATORS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPERATORS_LIST);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_OPERATORS_LIST, JSON.stringify(DEFAULT_OPERATORS));
      return DEFAULT_OPERATORS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_OPERATORS;
  }
}

export function getCurrentOperator(): string {
  if (typeof window === "undefined") return DEFAULT_OPERATORS[0].nome;
  try {
    return localStorage.getItem(STORAGE_KEY_CURRENT_OPERATOR) || DEFAULT_OPERATORS[0].nome;
  } catch {
    return DEFAULT_OPERATORS[0].nome;
  }
}

export function setCurrentOperator(operatorName: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT_OPERATOR, operatorName);
    window.dispatchEvent(new Event("ccargo-operator-changed"));
  } catch (err) {
    console.error(err);
  }
}

export function addOperator(nome: string, cargo = "Operadora Comercial"): OperatorUser {
  const cleanName = nome.trim();
  const list = getOperatorsList();
  const existing = list.find((o) => o.nome.toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    setCurrentOperator(existing.nome);
    return existing;
  }
  const newOp: OperatorUser = {
    id: `op-${Date.now()}`,
    nome: cleanName,
    cargo,
  };
  const updated = [...list, newOp];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_OPERATORS_LIST, JSON.stringify(updated));
  }
  setCurrentOperator(newOp.nome);
  return newOp;
}

// ============================================================================
// OVERLAY LOCAL PARA OBSERVAÇÕES (GARANTE PERSISTÊNCIA MESMO SEM ALTER TABLE)
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
    // Garantir que o exemplo Tauste esteja presente para avaliação da cliente
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
  return accounts.map((acc) => {
    const clean = cleanCNPJ(acc.cnpj);
    const seedMatch = INITIAL_ACCOUNTS.find((s) => cleanCNPJ(s.cnpj) === clean);
    const overlayNote = overlay[acc.id] ?? overlay[clean];
    return {
      ...acc,
      observacoes_importantes:
        overlayNote !== undefined
          ? overlayNote
          : acc.observacoes_importantes || seedMatch?.observacoes_importantes || undefined,
      sdr_responsavel_nome:
        acc.sdr_responsavel_nome || seedMatch?.sdr_responsavel_nome || "Ana Paula (Comercial)",
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
        // Se Tauste ainda não estiver no banco remoto mas estiver no seed, incluir para demonstração
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

// Implementação das Regras US-01 (Bloqueio Exato) e US-02 (Alerta Híbrido por Raiz)
export async function checkCNPJCollision(rawCnpj: string): Promise<CollisionCheckResult> {
  const clean = cleanCNPJ(rawCnpj);
  const raiz = getCNPJRaiz(clean);

  // 1. Tentar direto via RPC no Supabase (se configurado)
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

  // 2. Fallback local / memória
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

  const payload = {
    ...accountData,
    cnpj: clean,
    cnpj_formatado: formatted,
    sdr_responsavel_nome: accountData.sdr_responsavel_nome || getCurrentOperator(),
  };

  if (accountData.observacoes_importantes) {
    saveNoteOverlay(clean, clean, accountData.observacoes_importantes);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        const created = data as Account;
        if (accountData.observacoes_importantes) {
          saveNoteOverlay(created.id, clean, accountData.observacoes_importantes);
        }
        return {
          ...created,
          observacoes_importantes: accountData.observacoes_importantes,
        };
      } else if (error) {
        // Caso o banco remoto ainda não tenha a coluna observacoes_importantes, tentar sem ela
        const { observacoes_importantes, ...payloadWithoutNotes } = payload;
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
          return {
            ...created,
            observacoes_importantes,
          };
        }
      }
    } catch (err) {
      console.warn("Erro ao salvar no Supabase, salvando localmente:", err);
    }
  }

  const newAccount: Account = {
    ...payload,
    id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    cnpj_raiz: raiz,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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

  if (isSupabaseConfigured && supabase && !id.startsWith("acc-")) {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        return mergeWithOverlay([data as Account])[0];
      } else if (error && updates.observacoes_importantes !== undefined) {
        const { observacoes_importantes, ...rest } = updates;
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
  return updatedAccount;
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
// HISTÓRICO DE CONTATOS / LIGAÇÕES (US-07, US-11, US-12)
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
