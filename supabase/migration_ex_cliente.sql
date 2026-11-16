-- Migração: Suporte completo à desativação de clientes ativos (ex_cliente)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS motivo_desativacao TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS detalhe_desativacao TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS data_desativacao TIMESTAMPTZ;
