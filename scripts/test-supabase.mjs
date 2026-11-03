// scripts/test-supabase.mjs
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tjjkukygkdtjkkoirffh.supabase.co";
const supabaseAnonKey = "sb_publishable_-CBhMxQ6rduzIvlUsG7gFA__yAU1c4A";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log("Conectando ao Supabase...");
  
  // Teste 1: Buscar contas inseridas pelo schema.sql
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("*");

  if (accountsError) {
    console.error("❌ Erro ao consultar tabela accounts:", accountsError);
  } else {
    console.log(`✅ Sucesso! Encontradas ${accounts.length} contas na tabela 'accounts':`);
    accounts.forEach(a => {
      console.log(`   - [${a.status}] ${a.razao_social} (${a.cnpj})`);
    });
  }

  // Teste 2: Chamar a função check_cnpj_collision
  const { data: collisionData, error: rpcError } = await supabase
    .rpc("check_cnpj_collision", { p_cnpj: "12345678000190" });

  if (rpcError) {
    console.error("❌ Erro ao executar RPC check_cnpj_collision:", rpcError);
  } else {
    console.log("✅ RPC check_cnpj_collision executado com sucesso:", collisionData);
  }
}

testConnection();

