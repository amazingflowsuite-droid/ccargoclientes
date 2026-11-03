import { Account, CollisionCheckResult, ContactLog, AccountStatus, LeadStage } from "@/types";
import { cleanCNPJ, formatCNPJ, getCNPJRaiz } from "./utils";
import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_ACCOUNTS = "ccargo_accounts_v1";
const STORAGE_KEY_LOGS = "ccargo_contact_logs_v1";

const INITIAL_ACCOUNTS: Account[] = [
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
    detalhe_desqualificacao: "Cliente exigiu frete a R$ 3,10/km sem retorno garantido na rota interior de SP para GO. Operação altamente deficitária.",
    data_desqualificacao: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    tipo_carga: "Fracionada (LTL)",
    rotas_principais: ["SP-GO"],
    tipos_veiculos: ["Truck Baú"],
    cidade: "Campinas",
    uf: "SP",
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
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
    estagio: "cotacao_frete",
    contato_nome: "Mariana Santos",
    contato_cargo: "Coordenadora de Logística",
    telefone: "(11) 98765-4321",
    email: "mariana.log@metalurgicasul.com.br",
    tipo_carga: "Lotação (FTL)",
    rotas_principais: ["RS-SP", "PR-SP"],
    tipos_veiculos: ["Carreta Grade Baixa", "Carreta Sider"],
    volume_mensal_estimado: "12 carretas/mês",
    sdr_responsavel_nome: "Ana Paula (SDR)",
    cidade: "Caxias do Sul",
    uf: "RS",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }
];

function getLocalAccounts(): Account[] {
  if (typeof window === "undefined") return INITIAL_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    return JSON.parse(raw);
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

export async function fetchAllAccounts(): Promise<Account[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (!error && data && data.length > 0) {
        return data as Account[];
      }
    } catch (err) {
      console.warn("Falha ao consultar Supabase, usando armazenamento local:", err);
    }
  }
  return getLocalAccounts();
}

export async function fetchAccountById(id: string): Promise<Account | null> {
  const accounts = await fetchAllAccounts();
  return accounts.find(a => a.id === id) || null;
}

// Implementação das Regras US-01 (Bloqueio Exato) e US-02 (Alerta Híbrido por Raiz)
export async function checkCNPJCollision(rawCnpj: string): Promise<CollisionCheckResult> {
  const clean = cleanCNPJ(rawCnpj);
  const raiz = getCNPJRaiz(clean);

  // 1. Tentar direto via RPC no Supabase (se configurado)
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc("check_cnpj_collision", { p_cnpj: clean });
      if (!error && data) {
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
  const exactMatch = accounts.find(a => cleanCNPJ(a.cnpj) === clean) || null;
  const relatedAccounts = accounts.filter(a => {
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

export async function createAccount(accountData: Omit<Account, "id" | "cnpj_raiz" | "created_at" | "updated_at">): Promise<Account> {
  const clean = cleanCNPJ(accountData.cnpj);
  const raiz = getCNPJRaiz(clean);
  const formatted = formatCNPJ(clean);

  const payload = {
    ...accountData,
    cnpj: clean,
    cnpj_formatado: formatted,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .insert(payload)
        .select()
        .single();
        
      if (!error && data) {
        return data as Account;
      } else if (error) {
        console.error("Erro inserindo no Supabase:", error);
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
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
        
      if (!error && data) {
        return data as Account;
      }
    } catch (err) {
      console.warn("Erro ao atualizar no Supabase:", err);
    }
  }

  const accounts = getLocalAccounts();
  const index = accounts.findIndex(a => a.id === id);
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
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("accounts").delete().eq("id", id);
    } catch (err) {
      console.warn("Erro ao deletar no Supabase:", err);
    }
  }
  const accounts = getLocalAccounts().filter(a => a.id !== id);
  saveLocalAccounts(accounts);
  return true;
}

export async function fetchContactLogs(accountId: string): Promise<ContactLog[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("contact_logs")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });
      if (!error && data) return data as ContactLog[];
    } catch (err) {
      console.warn("Erro ao buscar logs no Supabase:", err);
    }
  }

  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) return [];
    const logs: ContactLog[] = JSON.parse(raw);
    return logs.filter(l => l.account_id === accountId);
  } catch {
    return [];
  }
}

export async function addContactLog(logData: Omit<ContactLog, "id" | "created_at">): Promise<ContactLog> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("contact_logs")
        .insert(logData)
        .select()
        .single();
      if (!error && data) return data as ContactLog;
    } catch (err) {
      console.warn("Erro ao adicionar log no Supabase:", err);
    }
  }

  const newLog: ContactLog = {
    ...logData,
    id: `log-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LOGS);
      const logs: ContactLog[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify([newLog, ...logs]));
    } catch (err) {
      console.error(err);
    }
  }

  return newLog;
}
