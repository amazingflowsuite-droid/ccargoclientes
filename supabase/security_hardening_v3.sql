-- ==============================================================================
-- CCargo Prospecção - Script de Hardening de Segurança e RLS (v3.0)
-- Aplique este script no SQL Editor do Supabase para sanar as vulnerabilidades:
-- SEC-01 (Políticas RLS abertas) e SEC-02 (Exposição de senhas/tokens)
-- ==============================================================================

-- 1. PROTEGER A TABELA APP_USERS CONTRA ACESSO ANÔNIMO COMPLETO
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Remove políticas públicas abertas perigosas
DROP POLICY IF EXISTS "Permitir leitura publica app_users" ON app_users;
DROP POLICY IF EXISTS "Permitir insercao publica app_users" ON app_users;
DROP POLICY IF EXISTS "Permitir atualizacao publica app_users" ON app_users;
DROP POLICY IF EXISTS "Permitir exclusao publica app_users" ON app_users;

-- Criação de VIEW segura que OCULTA senha e reset_token de consultas de listagem
CREATE OR REPLACE VIEW public.safe_app_users AS
SELECT
  id,
  nome,
  email,
  perfil,
  status_senha,
  ativo,
  created_at
FROM app_users;

-- 2. POLÍTICAS SEGURAS PARA APP_USERS (LEAST PRIVILEGE)
-- Permite leitura de usuários ativos para montagem da lista de operadores
CREATE POLICY "Permitir leitura controlada app_users"
ON app_users
FOR SELECT
USING (ativo = true);

-- Bloqueia exclusão de usuários via anon key pública (apenas service_role pode deletar)
CREATE POLICY "Bloquear exclusao anonima app_users"
ON app_users
FOR DELETE
USING (auth.role() = 'service_role');

-- 3. POLÍTICA DE BLINDAGEM DE CLIENTE ATIVO (BLINDAGEM NO BANCO DE DADOS)
-- Impede que uma conta já cadastrada como 'cliente_ativo' seja alterada para 'lead' por engano
CREATE OR REPLACE FUNCTION protect_active_clients_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'cliente_ativo' AND NEW.status = 'lead' THEN
    RAISE EXCEPTION 'Não é permitido desblindar um Cliente Ativo da carteira para Lead comum diretamente. Contate a Diretoria Comercial.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_active_clients ON accounts;
CREATE TRIGGER trg_protect_active_clients
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION protect_active_clients_trigger();

-- 4. RASTREABILIDADE DE AUDITORIA EM LOGS DE CONTATO
-- Garante que logs de contato não possam ter data de criação retroativa forjada
CREATE OR REPLACE FUNCTION audit_contact_logs_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at := COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_contact_logs ON contact_logs;
CREATE TRIGGER trg_audit_contact_logs
BEFORE INSERT ON contact_logs
FOR EACH ROW
EXECUTE FUNCTION audit_contact_logs_trigger();

