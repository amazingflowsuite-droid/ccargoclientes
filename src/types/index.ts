export type AccountStatus = 'lead' | 'cliente_ativo' | 'desqualificado' | 'ex_cliente';

export type DisqualificationReason = 
  | 'baixa_rentabilidade'
  | 'rota_incompativel'
  | 'inadimplencia_historica'
  | 'incompatibilidade_veiculo'
  | 'tabela_abaixo_piso'
  | 'outro';

export type LeadStage = 
  | 'prospeccao_inicial'
  | 'qualificacao_logistica'
  | 'cotacao_frete'
  | 'proposta_enviada'
  | 'negociacao'
  | 'fechado_ganho'
  | 'perdido';

export interface Account {
  id: string;
  cnpj: string; // 14 dígitos limpos
  cnpj_raiz: string; // 8 primeiros dígitos
  cnpj_formatado: string;
  razao_social: string;
  nome_fantasia?: string;
  status: AccountStatus;
  estagio?: LeadStage;
  
  // Contato
  contato_nome?: string;
  contato_cargo?: string;
  telefone?: string;
  email?: string;
  
  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  
  // CNAE
  cnae_codigo?: string;
  cnae_descricao?: string;
  
  // Transporte & Logística
  tipo_carga?: string; // 'Lotação (FTL)', 'Fracionada (LTL)', etc.
  rotas_principais?: string[];
  tipos_veiculos?: string[];
  volume_mensal_estimado?: string;
  
  // Observações Estratégicas e Restrições do Cliente (US-10)
  observacoes_importantes?: string;
  
  // Desqualificação / Proteção
  motivo_desqualificacao?: DisqualificationReason;
  detalhe_desqualificacao?: string;
  data_desqualificacao?: string;
  
  // Responsáveis
  gerente_conta_nome?: string; // Se for cliente ativo
  sdr_responsavel_nome?: string; // Operadora responsável pela prospecção
  
  created_at: string;
  updated_at: string;
}

export interface ContactLog {
  id: string;
  account_id: string;
  tipo_contato: 'telefone' | 'whatsapp' | 'email' | 'reuniao';
  resultado: 'sucesso' | 'sem_resposta' | 'reagendado' | 'recusado';
  resumo: string;
  proximo_contato?: string;
  usuario_nome: string;
  created_at: string;
}

export interface OperatorUser {
  id: string;
  nome: string;
  cargo: string;
}

export interface CollisionCheckResult {
  has_exact_collision: boolean;
  exact_match: Account | null;
  has_related_collision: boolean;
  related_accounts: Account[];
}

export interface BrasilAPICompanyResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  descricao_situacao_cadastral: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ddd_telefone_1: string;
}
