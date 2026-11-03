// scripts/test-accounts.mjs
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tjjkukygkdtjkkoirffh.supabase.co";
const supabaseAnonKey = "sb_publishable_-CBhMxQ6rduzIvlUsG7gFA__yAU1c4A";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testando RPC com outras contas...");
  
  const c1 = await supabase.rpc("check_cnpj_collision", { p_cnpj: "98765432000111" });
  console.log("Recusado (Supermercados Barateiro):", c1.data?.exact_match?.razao_social, "- Status:", c1.data?.exact_match?.status, "- Motivo:", c1.data?.exact_match?.motivo_desqualificacao);

  const c2 = await supabase.rpc("check_cnpj_collision", { p_cnpj: "55443322000100" });
  console.log("Lead (Metalurgica do Sul):", c2.data?.exact_match?.razao_social, "- Status:", c2.data?.exact_match?.status);

  // Teste de filial com mesma raiz da Ambev (12345678)
  const c3 = await supabase.rpc("check_cnpj_collision", { p_cnpj: "12345678000277" });
  console.log("Filial Ambev (mesma raiz): has_related_collision =", c3.data?.has_related_collision, "Contas correlatas:", c3.data?.related_accounts?.length);
}

test();

