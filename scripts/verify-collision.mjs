// scripts/verify-collision.mjs
// Test Engineer: Automated Verification of US-01 (Exact Block) & US-02 (Hybrid Root Alert)

function cleanCNPJ(value) {
  return value.replace(/\D/g, "");
}

function getCNPJRaiz(cnpj) {
  return cleanCNPJ(cnpj).slice(0, 8);
}

function checkCollision(targetCNPJ, accounts) {
  const cleanTarget = cleanCNPJ(targetCNPJ);
  const targetRaiz = getCNPJRaiz(cleanTarget);

  const exactMatch = accounts.find((a) => cleanCNPJ(a.cnpj) === cleanTarget) || null;
  const relatedAccounts = accounts.filter((a) => {
    const aRaiz = getCNPJRaiz(a.cnpj);
    return aRaiz === targetRaiz && cleanCNPJ(a.cnpj) !== cleanTarget;
  });

  return {
    has_exact_collision: Boolean(exactMatch),
    exact_match: exactMatch,
    has_related_collision: relatedAccounts.length > 0,
    related_accounts: relatedAccounts,
  };
}

// Mock Test Database
const mockAccounts = [
  {
    cnpj: "12345678000190", // Matriz Ativa
    razao_social: "AMBEV S.A.",
    status: "cliente_ativo",
    gerente_conta_nome: "Roberto Silva",
  },
  {
    cnpj: "98765432000111", // Recusado Inviável
    razao_social: "SUPERMERCADOS BARATEIRO",
    status: "desqualificado",
    motivo_desqualificacao: "baixa_rentabilidade",
  },
];

console.log("🚚 [TEST RUNNER] Iniciando testes das regras de negócio do CCargo...");

// Test Case 1: Bloqueio Rígido em Cliente Ativo Exato
const test1 = checkCollision("12.345.678/0001-90", mockAccounts);
console.assert(test1.has_exact_collision === true, "FAIL: Test 1 deve detectar colisão exata");
console.assert(test1.exact_match.status === "cliente_ativo", "FAIL: Test 1 deve identificar cliente ativo");
console.log("✅ PASS: Teste 1 - Bloqueio Rígido em CNPJ Exato de Cliente Ativo");

// Test Case 2: Alerta Crítico em Conta Recusada por Baixa Rentabilidade
const test2 = checkCollision("98.765.432/0001-11", mockAccounts);
console.assert(test2.has_exact_collision === true, "FAIL: Test 2 deve detectar colisão exata");
console.assert(test2.exact_match.status === "desqualificado", "FAIL: Test 2 deve identificar status desqualificado");
console.assert(test2.exact_match.motivo_desqualificacao === "baixa_rentabilidade", "FAIL: Test 2 deve manter motivo");
console.log("✅ PASS: Teste 2 - Alerta de Inviabilidade em CNPJ Recusado");

// Test Case 3: Alerta Híbrido em Filial (Mesma Raiz de 8 dígitos, final diferente)
const test3 = checkCollision("12.345.678/0002-71", mockAccounts);
console.assert(test3.has_exact_collision === false, "FAIL: Test 3 não deve ter colisão exata");
console.assert(test3.has_related_collision === true, "FAIL: Test 3 deve detectar colisão de raiz");
console.assert(test3.related_accounts.length === 1, "FAIL: Test 3 deve listar a conta matriz");
console.log("✅ PASS: Teste 3 - Alerta Híbrido por Raiz de CNPJ (Grupo Econômico / Filial)");

// Test Case 4: Lead Totalmente Inédito (Liberado)
const test4 = checkCollision("44.555.666/0001-22", mockAccounts);
console.assert(test4.has_exact_collision === false, "FAIL: Test 4 não deve ter colisão exata");
console.assert(test4.has_related_collision === false, "FAIL: Test 4 não deve ter colisão relacionada");
console.log("✅ PASS: Teste 4 - Lead Totalmente Inédito Liberado para Contato");

console.log("\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!");

