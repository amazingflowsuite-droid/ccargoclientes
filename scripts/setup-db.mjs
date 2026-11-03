// scripts/setup-db.mjs
import pg from "pg";
const { Client } = pg;

const connectionString = "postgresql://postgres:KT6MQ-cwu3J7ZKD@db.tjjkukygkdtjkkoirffh.supabase.co:5432/postgres";

async function setup() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Conectado diretamente ao PostgreSQL do Supabase!");

    // 1. Configurar RLS e Políticas Permissivas para a API do App
    await client.query(`
      ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Permitir leitura publica accounts" ON accounts;
      CREATE POLICY "Permitir leitura publica accounts" ON accounts FOR SELECT USING (true);
      
      DROP POLICY IF EXISTS "Permitir insercao publica accounts" ON accounts;
      CREATE POLICY "Permitir insercao publica accounts" ON accounts FOR INSERT WITH CHECK (true);
      
      DROP POLICY IF EXISTS "Permitir atualizacao publica accounts" ON accounts;
      CREATE POLICY "Permitir atualizacao publica accounts" ON accounts FOR UPDATE USING (true);
      
      DROP POLICY IF EXISTS "Permitir exclusao publica accounts" ON accounts;
      CREATE POLICY "Permitir exclusao publica accounts" ON accounts FOR DELETE USING (true);

      ALTER TABLE contact_logs ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Permitir leitura publica contact_logs" ON contact_logs;
      CREATE POLICY "Permitir leitura publica contact_logs" ON contact_logs FOR SELECT USING (true);
      
      DROP POLICY IF EXISTS "Permitir insercao publica contact_logs" ON contact_logs;
      CREATE POLICY "Permitir insercao publica contact_logs" ON contact_logs FOR INSERT WITH CHECK (true);
    `);
    console.log("✅ Políticas RLS configuradas com sucesso!");

    // 2. Verificar registros existentes
    const res = await client.query("SELECT id, cnpj, razao_social, status, gerente_conta_nome FROM accounts;");
    console.log(`✅ Total de empresas no banco: ${res.rowCount}`);
    res.rows.forEach(r => {
      console.log(`   - [${r.status}] ${r.razao_social} (${r.cnpj}) - Resp: ${r.gerente_conta_nome || 'N/A'}`);
    });

  } catch (err) {
    console.error("❌ Erro ao conectar ao PostgreSQL:", err);
  } finally {
    await client.end();
  }
}

setup();

