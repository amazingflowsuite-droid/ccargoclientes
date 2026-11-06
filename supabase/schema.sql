-- ==============================================================================
-- CCargo - Sistema de Gestão de Prospecção & Blindagem de Clientes
-- Supabase / PostgreSQL Schema Definition & RLS Policies (v2.1 - Auth & RBAC)
-- ==============================================================================

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE account_status AS ENUM (
    'lead',               -- Em processo de prospecção comercial
    'cliente_ativo',      -- Cliente da carteira CCargo (BLOQUEIO DE CONTATO)
    'desqualificado',     -- Recusado anteriormente (ALERTA CRÍTICO DE INVIABILIDADE)
    'ex_cliente'          -- Já operou no passado
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE disqualification_reason AS ENUM (
    'baixa_rentabilidade',       -- Frete oferecido não cobre custos operacionais
    'rota_incompativel',         -- Praça ou rota sem carga de retorno (backhaul)
    'inadimplencia_historica',   -- Restrição financeira / risco de crédito
    'incompatibilidade_veiculo', -- Tipo de carroceria/veículo não disponível
    'tabela_abaixo_piso',        -- Preço abaixo do piso mínimo estipulado
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_stage AS ENUM (
    'prospeccao_inicial',       -- Primeiro contato / Sondagem
    'qualificacao_logistica',    -- Mapeamento de rotas e tipos de caminhões
    'cotacao_frete',            -- Engenharia de frete analisando margem
    'proposta_enviada',         -- Proposta comercial em avaliação pelo cliente
    'negociacao',               -- Ajustes finais de tabela e SLA
    'fechado_ganho',            -- Contrato assinado (pode migrar para cliente ativo)
    'perdido'                   -- Desistência ou desqualificado
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. TABELA DE USUÁRIOS E PERFIS DE ACESSO (RBAC: GESTOR vs COMERCIAL)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  perfil VARCHAR(20) NOT NULL DEFAULT 'comercial' CHECK (perfil IN ('gestor', 'comercial')),
  senha TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_perfil ON app_users(perfil);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica app_users" ON app_users;
CREATE POLICY "Permitir leitura publica app_users" ON app_users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao publica app_users" ON app_users;
CREATE POLICY "Permitir insercao publica app_users" ON app_users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao publica app_users" ON app_users;
CREATE POLICY "Permitir atualizacao publica app_users" ON app_users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusao publica app_users" ON app_users;
CREATE POLICY "Permitir exclusao publica app_users" ON app_users FOR DELETE USING (true);

-- Seed de Usuários Iniciais (Gestor e Operadora Comercial)
INSERT INTO app_users (nome, email, perfil, senha, ativo)
VALUES
  ('Gestora Comercial', 'gestor@ccargo.com.br', 'gestor', '123456', true),
  ('Ana Paula (Comercial)', 'comercial@ccargo.com.br', 'comercial', '123456', true)
ON CONFLICT (email) DO NOTHING;

-- 3. TABELA PRINCIPAL DE EMPRESAS / CONTAS
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj VARCHAR(14) NOT NULL UNIQUE,
  cnpj_raiz VARCHAR(8) GENERATED ALWAYS AS (substring(cnpj FROM 1 FOR 8)) STORED,
  cnpj_formatado VARCHAR(18),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  status account_status NOT NULL DEFAULT 'lead',
  estagio lead_stage DEFAULT 'prospeccao_inicial',
  
  -- Informações de Contato
  contato_nome TEXT,
  contato_cargo TEXT,
  telefone VARCHAR(20),
  email TEXT,
  
  -- Localização
  cep VARCHAR(9),
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf VARCHAR(2),
  
  -- Atividade Econômica
  cnae_codigo TEXT,
  cnae_descricao TEXT,
  
  -- Qualificação de Transporte & Logística
  tipo_carga TEXT DEFAULT 'Lotação (FTL)',
  rotas_principais TEXT[] DEFAULT '{}',
  tipos_veiculos TEXT[] DEFAULT '{}',
  volume_mensal_estimado TEXT,
  
  -- Observações Estratégicas e Restrições Operacionais do Cliente (US-10)
  observacoes_importantes TEXT,
  
  -- Blindagem & Desqualificação
  motivo_desqualificacao disqualification_reason,
  detalhe_desqualificacao TEXT,
  data_desqualificacao TIMESTAMPTZ,
  
  -- Responsáveis
  gerente_conta_nome TEXT,
  sdr_responsavel_nome TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migração Segura (caso a tabela já exista sem a coluna observacoes_importantes)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS observacoes_importantes TEXT;

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_accounts_cnpj ON accounts(cnpj);
CREATE INDEX IF NOT EXISTS idx_accounts_cnpj_raiz ON accounts(cnpj_raiz);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_estagio ON accounts(estagio);
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at);

-- 4. HISTÓRICO DE INTERAÇÕES / CONTATOS
CREATE TABLE IF NOT EXISTS contact_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tipo_contato VARCHAR(20) NOT NULL,
  resultado VARCHAR(30) NOT NULL,
  resumo TEXT NOT NULL,
  proximo_contato TIMESTAMPTZ,
  usuario_nome TEXT NOT NULL DEFAULT 'Ana Paula (Comercial)',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_logs_account ON contact_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_contact_logs_created_at ON contact_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_logs_usuario ON contact_logs(usuario_nome);

-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS) PARA ACESSO WEB
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

DROP POLICY IF EXISTS "Permitir atualizacao publica contact_logs" ON contact_logs;
CREATE POLICY "Permitir atualizacao publica contact_logs" ON contact_logs FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusao publica contact_logs" ON contact_logs;
CREATE POLICY "Permitir exclusao publica contact_logs" ON contact_logs FOR DELETE USING (true);

-- 6. FUNÇÃO RPC PARA VERIFICAÇÃO HÍBRIDA DE CNPJ (US-01 e US-02)
CREATE OR REPLACE FUNCTION check_cnpj_collision(p_cnpj VARCHAR(14))
RETURNS JSON AS $$
DECLARE
  v_clean VARCHAR(14);
  v_raiz VARCHAR(8);
  v_exact_account RECORD;
  v_related_accounts JSON;
BEGIN
  -- Sanitizar para apenas números
  v_clean := regexp_replace(p_cnpj, '\D', '', 'g');
  v_raiz := substring(v_clean FROM 1 FOR 8);

  -- 1. Busca exata
  SELECT id, cnpj, razao_social, nome_fantasia, status, estagio, motivo_desqualificacao, detalhe_desqualificacao, gerente_conta_nome, sdr_responsavel_nome, observacoes_importantes
  INTO v_exact_account
  FROM accounts
  WHERE cnpj = v_clean
  LIMIT 1;

  -- 2. Busca de outras contas com a mesma raiz (matriz/filiais)
  SELECT json_agg(json_build_object(
    'id', id,
    'cnpj', cnpj,
    'cnpj_formatado', cnpj_formatado,
    'razao_social', razao_social,
    'nome_fantasia', nome_fantasia,
    'status', status,
    'motivo_desqualificacao', motivo_desqualificacao,
    'gerente_conta_nome', gerente_conta_nome
  ))
  INTO v_related_accounts
  FROM accounts
  WHERE cnpj_raiz = v_raiz AND cnpj != v_clean;

  RETURN json_build_object(
    'exact_match', CASE WHEN v_exact_account.id IS NOT NULL THEN row_to_json(v_exact_account) ELSE NULL END,
    'has_exact_collision', (v_exact_account.id IS NOT NULL),
    'related_accounts', COALESCE(v_related_accounts, '[]'::json),
    'has_related_collision', (v_related_accounts IS NOT NULL AND json_array_length(v_related_accounts) > 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGER DE ATUALIZAÇÃO AUTOMÁTICA DE TIMESTAMP
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_accounts ON accounts;
CREATE TRIGGER set_timestamp_accounts
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 8. DADOS DE EXEMPLO (SEED)
INSERT INTO accounts (cnpj, cnpj_formatado, razao_social, nome_fantasia, status, gerente_conta_nome, tipo_carga, rotas_principais, tipos_veiculos, volume_mensal_estimado, observacoes_importantes)
VALUES (
  '12345678000190',
  '12.345.678/0001-90',
  'AMBEV DISTRIBUICAO S.A.',
  'Ambev Centro de Distribuição',
  'cliente_ativo',
  'Roberto Silva (Executivo Key Accounts)',
  'Lotação (FTL)',
  ARRAY['SP-PR', 'SP-RJ', 'MG-SP'],
  ARRAY['Carreta LS', 'Bitrem'],
  '45 carretas/mês',
  'Cliente estratégico da carteira ativa. Exige rastreamento dedicado e seguro RCTR-C + RCF-DC atualizado.'
) ON CONFLICT (cnpj) DO NOTHING;

INSERT INTO accounts (cnpj, cnpj_formatado, razao_social, nome_fantasia, status, motivo_desqualificacao, detalhe_desqualificacao, data_desqualificacao, tipo_carga, rotas_principais, tipos_veiculos, observacoes_importantes)
VALUES (
  '98765432000111',
  '98.765.432/0001-11',
  'COMERCIAL DE ALIMENTOS BARATO LTDA',
  'Supermercados Barateiro',
  'desqualificado',
  'baixa_rentabilidade',
  'Cliente exigiu frete a R$ 3,10/km sem retorno garantido na rota interior de SP para GO. Operação altamente deficitária.',
  NOW() - INTERVAL '45 days',
  'Fracionada (LTL)',
  ARRAY['SP-GO'],
  ARRAY['Truck Baú'],
  'Não aceita reajuste de pedágio e exige espera de descarga sem pagamento de diária.'
) ON CONFLICT (cnpj) DO NOTHING;

INSERT INTO accounts (cnpj, cnpj_formatado, razao_social, nome_fantasia, status, estagio, contato_nome, contato_cargo, telefone, email, tipo_carga, rotas_principais, tipos_veiculos, volume_mensal_estimado, sdr_responsavel_nome, cidade, uf, observacoes_importantes)
VALUES (
  '45464748000133',
  '45.464.748/0001-33',
  'TAUSTE SUPERMERCADOS LTDA',
  'Tauste Supermercados (CD Central)',
  'lead',
  'cotacao_frete',
  'Henrique Martins',
  'Gerente de Logística e Recebimento',
  '(14) 99711-2233',
  'logistica@tauste.com.br',
  'Lotação (FTL)',
  ARRAY['SP ⇄ Interior SP (Marília/Bauru/Sorocaba)', 'PR ⇄ SP'],
  ARRAY['Carreta Sider', 'Truck Baú', 'Carreta Frigorífica / Refrigerada'],
  '25 viagens/mês',
  'Ana Paula (Comercial)',
  'Marília',
  'SP',
  'Cliente exige carga 100% paletizada (padrão PBR). Não carrega carga batida no chão. Recebimento no CD apenas com agendamento de janela entre 07h e 13h. Solicita veículos com menos de 10 anos de uso.'
) ON CONFLICT (cnpj) DO NOTHING;

INSERT INTO accounts (cnpj, cnpj_formatado, razao_social, nome_fantasia, status, estagio, contato_nome, contato_cargo, telefone, email, tipo_carga, rotas_principais, tipos_veiculos, volume_mensal_estimado, sdr_responsavel_nome, cidade, uf, observacoes_importantes)
VALUES (
  '55443322000100',
  '55.443.322/0001-00',
  'METALURGICA DO SUL INDUSTRIA E COMERCIO S.A.',
  'Metalúrgica do Sul',
  'lead',
  'proposta_enviada',
  'Mariana Santos',
  'Coordenadora de Logística',
  '(11) 98765-4321',
  'mariana.log@metalurgicasul.com.br',
  'Lotação (FTL)',
  ARRAY['RS-SP', 'PR-SP'],
  ARRAY['Carreta Grade Baixa', 'Carreta Sider'],
  '12 carretas/mês',
  'Ana Paula (Comercial)',
  'Caxias do Sul',
  'RS',
  'Transporta bobinas e chapas de aço. Necessita cintas de amarração reforçadas e berço metálico quando bobina. Não carrega em dias de chuva forte se for grade baixa aberta.'
) ON CONFLICT (cnpj) DO NOTHING;
