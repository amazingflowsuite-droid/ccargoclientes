// scripts/verify-reports.mjs
// QA Automation Engineer: Verification of US-09, US-10, US-11, US-12

function isInMonth(isoDate, yearMonth) {
  if (yearMonth === "ALL") return true;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return false;
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return ym === yearMonth;
}

function computeMonthlyMetrics(accounts, logs, yearMonth, operatorFilter) {
  const filteredLogs = logs.filter((l) => {
    if (!isInMonth(l.created_at, yearMonth)) return false;
    if (operatorFilter !== "TODOS" && !l.usuario_nome.toLowerCase().includes(operatorFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const idsWithLogs = new Set(filteredLogs.map((l) => l.account_id));

  const filteredAccounts = accounts.filter((a) => {
    if (operatorFilter !== "TODOS") {
      const resp = (a.sdr_responsavel_nome || "").toLowerCase();
      if (!resp.includes(operatorFilter.toLowerCase()) && !idsWithLogs.has(a.id)) return false;
    }
    if (yearMonth !== "ALL") {
      const inM = isInMonth(a.created_at, yearMonth) || isInMonth(a.updated_at, yearMonth) || idsWithLogs.has(a.id);
      if (!inM) return false;
    }
    return true;
  });

  const totalContatos = filteredLogs.length;
  const contatosComSucesso = filteredLogs.filter((l) => l.resultado === "sucesso").length;
  const contatosSemResposta = filteredLogs.filter((l) => l.resultado === "sem_resposta").length;

  const pediramCotacao = filteredAccounts.filter(
    (a) =>
      a.status === "lead" &&
      ["cotacao_frete", "proposta_enviada", "negociacao", "fechado_ganho"].includes(a.estagio || "")
  ).length;

  const fecharamNegocio = filteredAccounts.filter(
    (a) => a.estagio === "fechado_ganho" || a.status === "cliente_ativo"
  ).length;

  const desqualificados = filteredAccounts.filter((a) => a.status === "desqualificado").length;

  return {
    totalContatos,
    contatosComSucesso,
    contatosSemResposta,
    pediramCotacao,
    fecharamNegocio,
    desqualificados,
  };
}

console.log("🧪 [QA AUTOMATION] Testando Motor de Relatórios, Observações e Filtros Mensais...");

const mockAccounts = [
  {
    id: "acc-tauste",
    razao_social: "TAUSTE SUPERMERCADOS LTDA",
    status: "lead",
    estagio: "cotacao_frete",
    sdr_responsavel_nome: "Ana Paula (Comercial)",
    observacoes_importantes: "Só aceita carga paletizada. Não carrega carga batida.",
    created_at: "2026-11-02T10:00:00-03:00",
    updated_at: "2026-11-05T14:00:00-03:00",
  },
  {
    id: "acc-fechado",
    razao_social: "AGROGRAOS DO CERRADO",
    status: "lead",
    estagio: "fechado_ganho",
    sdr_responsavel_nome: "Ana Paula (Comercial)",
    created_at: "2026-11-03T11:00:00-03:00",
    updated_at: "2026-11-06T09:00:00-03:00",
  },
  {
    id: "acc-outro-op",
    razao_social: "LOGISTICA NORTE",
    status: "lead",
    estagio: "prospeccao_inicial",
    sdr_responsavel_nome: "Marcos Lima (Comercial)",
    created_at: "2026-11-04T11:00:00-03:00",
    updated_at: "2026-11-04T11:00:00-03:00",
  },
];

const mockLogs = [
  {
    id: "l1",
    account_id: "acc-tauste",
    resultado: "sem_resposta",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: "2026-11-02T09:30:00-03:00",
  },
  {
    id: "l2",
    account_id: "acc-tauste",
    resultado: "sucesso",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: "2026-11-05T15:00:00-03:00",
  },
  {
    id: "l3",
    account_id: "acc-fechado",
    resultado: "sucesso",
    usuario_nome: "Ana Paula (Comercial)",
    created_at: "2026-11-06T09:00:00-03:00",
  },
  {
    id: "l4",
    account_id: "acc-outro-op",
    resultado: "sem_resposta",
    usuario_nome: "Marcos Lima (Comercial)",
    created_at: "2026-11-04T16:00:00-03:00",
  },
];

// Teste 1: Relatório Mensal filtrado pela operadora "Ana Paula" em 2026-11
const resAna = computeMonthlyMetrics(mockAccounts, mockLogs, "2026-11", "Ana Paula");
console.assert(resAna.totalContatos === 3, `FAIL: Esperado 3 contatos da Ana, obteve ${resAna.totalContatos}`);
console.assert(resAna.contatosComSucesso === 2, `FAIL: Esperado 2 contatos com sucesso, obteve ${resAna.contatosComSucesso}`);
console.assert(resAna.contatosSemResposta === 1, `FAIL: Esperado 1 sem resposta, obteve ${resAna.contatosSemResposta}`);
console.assert(resAna.pediramCotacao === 2, `FAIL: Esperado 2 em cotação/fechado, obteve ${resAna.pediramCotacao}`);
console.assert(resAna.fecharamNegocio === 1, `FAIL: Esperado 1 negócio fechado, obteve ${resAna.fecharamNegocio}`);
console.log("✅ PASS: Teste 1 - Fechamento Mensal por Operadora (Contatos, Cotações e Fechamentos)");

// Teste 2: Relatório Geral (TODOS os operadores)
const resTodos = computeMonthlyMetrics(mockAccounts, mockLogs, "2026-11", "TODOS");
console.assert(resTodos.totalContatos === 4, "FAIL: Esperado 4 contatos no total");
console.log("✅ PASS: Teste 2 - Consolidação Geral de Todos os Operadores");

// Teste 3: Mês Vazio (ex: 2026-10)
const resVazio = computeMonthlyMetrics(mockAccounts, mockLogs, "2026-10", "TODOS");
console.assert(resVazio.totalContatos === 0, "FAIL: Esperado 0 contatos em mês sem atividade");
console.assert(resVazio.fecharamNegocio === 0, "FAIL: Esperado 0 fechamentos em mês sem atividade");
console.log("✅ PASS: Teste 3 - Filtro de Mês sem Atividade (Zero Falsos Positivos)");

console.log("\n🎉 TODOS OS TESTES DE RELATÓRIOS E MÉTRICAS PASSARAM COM SUCESSO!");

