# CCargo — Plataforma de Prospecção & Blindagem Comercial

Sistema web desenvolvido sob medida para a **CCargo Transportes Rodoviários**, com foco em gestão de leads de transporte e eliminação de contatos indevidos a clientes ativos ou contas recusadas por baixa rentabilidade.

---

## 🚀 Tecnologias
- **Frontend:** Next.js 14+ (App Router), React 18, TypeScript
- **Estilização:** Tailwind CSS v3 com os tokens do Postum Design System
- **Ícones:** Lucide React
- **Backend / DB:** Supabase (PostgreSQL 15+, Triggers e RLS)
- **Hospedagem:** Vercel

---

## 🛡️ Funcionalidades Principais

### 1. Escudo Anti-Duplicidade Rígido (US-01)
- Bloqueia automaticamente tentativas de prospecção para CNPJs que já pertencem à carteira de **Clientes Ativos**.
- Sinaliza o executivo de contas responsável pela conta ativa.
- Dispara alerta crítico caso o CNPJ já tenha sido **recusado no passado por baixa rentabilidade ou inviabilidade operacional**, exibindo o histórico do frete.

### 2. Alerta Híbrido por Raiz de CNPJ (US-02)
- Ao cadastrar uma filial nova, o sistema detecta os **8 primeiros dígitos** do CNPJ (matriz/grupo econômico).
- Se a matriz já for cliente ou tiver histórico de inadimplência/recusa, o operador recebe um alerta contextual âmbar para alinhar previamente com a diretoria.

### 3. Autocompletar via BrasilAPI (US-03)
- Ao digitar o CNPJ, busca instantaneamente Razão Social, Nome Fantasia, Cidade, UF e CNAE diretamente da Receita Federal.

### 4. Pipeline Logístico (Kanban)
- Fases adaptadas para o transporte rodoviário:
  1. *Primeiro Contato*
  2. *Perfil & Frota (Lotação/Fracionada, Rotas, Carretas/Trucks)*
  3. *Cotação de Frete*
  4. *Proposta Enviada*
  5. *Negociação*
  6. *Fechado / Ganho* (com opção de promoção imediata para Cliente Ativo Blindado)

---

## 📦 Como Rodar Localmente

```bash
# 1. Instalar dependências
pnpm install

# 2. Iniciar servidor de desenvolvimento
pnpm run dev
```

Acesse em `http://localhost:3000`.

---

## 🗄️ Configuração do Supabase

1. Crie um projeto no [Supabase](https://supabase.com).
2. Vá no **SQL Editor** do Supabase e execute o script contido em `supabase/schema.sql`.
3. Copie as variáveis para o `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

*Nota: O sistema possui fallback transparente para armazenamento local (LocalStorage), funcionando imediatamente para demonstração mesmo antes da conexão do banco remoto.*

