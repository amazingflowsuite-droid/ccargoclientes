"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  checkCNPJCollision,
  createAccount,
  getCurrentOperator,
  getOperatorsList,
  getAuthenticatedUser,
  fetchAllAppUsers,
} from "@/lib/store";
import { fetchCompanyByCNPJ } from "@/lib/brasil-api";
import { cleanCNPJ, formatCNPJ } from "@/lib/utils";
import { CollisionCheckResult, OperatorUser, AppUser } from "@/types";
import { CollisionAlert } from "@/components/CollisionAlert";
import {
  Loader2,
  Sparkles,
  Check,
  ArrowLeft,
  AlertCircle,
  FileText,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

const VEICULOS_DISPONIVEIS = [
  "VUC / 3/4",
  "Toco",
  "Truck",
  "Bitruck (4 Eixos)",
  "Carreta LS (3 Eixos)",
  "Carreta Rodotrem / Bitrem",
  "Carreta Sider",
  "Carreta Grade Baixa",
  "Carreta Frigorífica / Refrigerada",
];

const ROTAS_COMUNS = [
  "SP ⇄ RJ",
  "SP ⇄ PR",
  "SP ⇄ MG",
  "SP ⇄ GO / DF",
  "SP ⇄ Interior SP (Marília/Bauru/Sorocaba)",
  "Sul ⇄ Sudeste",
  "Centro-Oeste ⇄ Porto de Santos",
  "Nordeste ⇄ Sudeste",
];

export default function NovoLeadPage() {
  const router = useRouter();

  // Inputs
  const [cnpjInput, setCnpjInput] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cnaeDescricao, setCnaeDescricao] = useState("");

  // Contato
  const [contatoNome, setContatoNome] = useState("");
  const [contatoCargo, setContatoCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  // Transporte & Logística
  const [tipoCarga, setTipoCarga] = useState("Lotação (FTL)");
  const [rotasSelecionadas, setRotasSelecionadas] = useState<string[]>([]);
  const [veiculosSelecionados, setVeiculosSelecionados] = useState<string[]>([]);
  const [volumeMensal, setVolumeMensal] = useState("");

  // Observações Importantes e Operadora (US-09 e US-10)
  const [authUser, setAuthUser] = useState<AppUser | null>(null);
  const [observacoesImportantes, setObservacoesImportantes] = useState("");
  const [sdrResponsavel, setSdrResponsavel] = useState("Ana Paula (Comercial)");
  const [operatorsList, setOperatorsList] = useState<OperatorUser[]>([]);

  // Estados de Verificação
  const [isSearchingBrasilApi, setIsSearchingBrasilApi] = useState(false);
  const [isCheckingCollision, setIsCheckingCollision] = useState(false);
  const [collisionResult, setCollisionResult] = useState<CollisionCheckResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const user = getAuthenticatedUser();
    setAuthUser(user);
    setSdrResponsavel(user ? user.nome : getCurrentOperator());
    fetchAllAppUsers().then(() => {
      setOperatorsList(getOperatorsList());
    });
  }, []);

  // Efeito com debounce para verificar colisão no banco assim que atinge 14 dígitos
  useEffect(() => {
    const clean = cleanCNPJ(cnpjInput);
    if (clean.length === 14) {
      const timer = setTimeout(() => {
        handleCheckCollision(clean);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setCollisionResult(null);
    }
  }, [cnpjInput]);

  async function handleCheckCollision(clean: string) {
    setIsCheckingCollision(true);
    try {
      const res = await checkCNPJCollision(clean);
      setCollisionResult(res);
    } finally {
      setIsCheckingCollision(false);
    }
  }

  // Preenchimento Automático via BrasilAPI (US-03)
  async function handleConsultarBrasilAPI() {
    const clean = cleanCNPJ(cnpjInput);
    if (clean.length !== 14) {
      setApiError("Digite os 14 dígitos do CNPJ para consultar.");
      return;
    }

    setApiError(null);
    setIsSearchingBrasilApi(true);

    try {
      const res = await fetchCompanyByCNPJ(clean);
      if (res.success && res.data) {
        setRazaoSocial(res.data.razao_social || "");
        setNomeFantasia(res.data.nome_fantasia || "");
        setCidade(res.data.municipio || "");
        setUf(res.data.uf || "");
        setCnaeDescricao(res.data.cnae_fiscal_descricao || "");
        if (res.data.ddd_telefone_1 && !telefone) {
          setTelefone(res.data.ddd_telefone_1);
        }
      } else {
        setApiError(res.error || "Não foi possível carregar os dados cadastrais automaticamente.");
      }
    } finally {
      setIsSearchingBrasilApi(false);
    }
  }

  function toggleRota(rota: string) {
    setRotasSelecionadas((prev) =>
      prev.includes(rota) ? prev.filter((r) => r !== rota) : [...prev, rota]
    );
  }

  function toggleVeiculo(veiculo: string) {
    setVeiculosSelecionados((prev) =>
      prev.includes(veiculo) ? prev.filter((v) => v !== veiculo) : [...prev, veiculo]
    );
  }

  // Bloqueio Rígido se for cliente ativo (US-01)
  const isStrictBlocked = Boolean(
    collisionResult?.has_exact_collision &&
      collisionResult.exact_match?.status === "cliente_ativo"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isStrictBlocked) return;

    if (!razaoSocial.trim()) {
      alert("Por favor, preencha a Razão Social da empresa.");
      return;
    }

    setIsSaving(true);
    try {
      await createAccount({
        cnpj: cleanCNPJ(cnpjInput),
        cnpj_formatado: formatCNPJ(cnpjInput),
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia || undefined,
        status: "lead",
        estagio: "prospeccao_inicial",
        cidade: cidade || undefined,
        uf: uf || undefined,
        cnae_descricao: cnaeDescricao || undefined,
        contato_nome: contatoNome || undefined,
        contato_cargo: contatoCargo || undefined,
        telefone: telefone || undefined,
        email: email || undefined,
        tipo_carga: tipoCarga,
        rotas_principais: rotasSelecionadas,
        tipos_veiculos: veiculosSelecionados,
        volume_mensal_estimado: volumeMensal || undefined,
        observacoes_importantes: observacoesImportantes.trim() || undefined,
        sdr_responsavel_nome: sdrResponsavel || getCurrentOperator(),
      });

      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar lead. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Funil
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]">
            Nova Oportunidade de Prospecção
          </h1>
          <p className="text-sm text-[#57534E]">
            Cadastro assistido com verificação anti-colisão de clientes da carteira e dados oficiais da Receita.
          </p>
        </div>

        {/* Operadora Responsável (Fixa para Comercial, Selecionável apenas para Gestor) */}
        <div className="bg-white border border-[#E7E5E4] rounded-md px-3.5 py-2 shadow-subtle flex items-center gap-2 self-start sm:self-center">
          <UserCheck className="w-4 h-4 text-[#0D9488]" />
          <div className="text-xs">
            <span className="text-[#78716C] block text-[10px] uppercase font-semibold">
              Operadora Responsável
            </span>
            {authUser?.perfil === "gestor" ? (
              <select
                value={sdrResponsavel}
                onChange={(e) => setSdrResponsavel(e.target.value)}
                className="font-semibold text-[#1C1917] bg-transparent focus:outline-none cursor-pointer"
              >
                {operatorsList.map((op) => (
                  <option key={op.id} value={op.nome}>
                    {op.nome}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-[#1C1917] block mt-0.5">
                {authUser?.nome || sdrResponsavel}
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BLOCO 1: CHECAGEM DE CNPJ & BRASILAPI */}
        <div className="bg-white rounded-lg border border-[#E7E5E4] p-5 sm:p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
            <h2 className="font-serif text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0F172A] text-white text-xs flex items-center justify-center font-sans">
                1
              </span>
              Validação & Identificação da Empresa
            </h2>
            <span className="text-xs text-[#78716C]">Proteção Anti-Duplicidade</span>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E]">
              CNPJ da Empresa <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={cnpjInput}
                  onChange={(e) => setCnpjInput(formatCNPJ(e.target.value))}
                  maxLength={18}
                  required
                  className="w-full px-3.5 py-2.5 rounded-md border border-[#D6D3D1] bg-[#FAFAF9] text-[#1C1917] placeholder:text-[#A8A29E] font-mono text-sm focus:bg-white focus-ring transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleConsultarBrasilAPI}
                disabled={isSearchingBrasilApi || cleanCNPJ(cnpjInput).length !== 14}
                className="px-4 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-xs rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {isSearchingBrasilApi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
                    Buscando na Receita...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#0D9488]" />
                    Autopreencher via BrasilAPI
                  </>
                )}
              </button>
            </div>

            {apiError && (
              <p className="text-xs text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {apiError}
              </p>
            )}

            {/* Painel de Alerta de Colisão / Bloqueio (US-01 e US-02) */}
            <div className="pt-2">
              <CollisionAlert collision={collisionResult} checking={isCheckingCollision} />
            </div>
          </div>

          {/* Dados Cadastrais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Razão Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Tauste Supermercados Ltda"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-sm focus-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                placeholder="Nome comercial da marca"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-sm focus-ring"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-[#57534E] mb-1">Cidade</label>
                <input
                  type="text"
                  placeholder="Ex: Marília"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-sm focus-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#57534E] mb-1">UF</label>
                <input
                  type="text"
                  placeholder="SP"
                  maxLength={2}
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-sm text-center uppercase focus-ring"
                />
              </div>
            </div>

            {cnaeDescricao && (
              <div className="sm:col-span-2 text-xs text-[#57534E] bg-[#F5F5F4] p-2.5 rounded border border-[#E7E5E4]">
                <strong>Ramo de Atividade (CNAE):</strong> {cnaeDescricao}
              </div>
            )}
          </div>
        </div>

        {/* BLOCO 2: QUALIFICAÇÃO LOGÍSTICA & OBSERVAÇÕES IMPORTANTES (US-08 e US-10) */}
        <div className="bg-white rounded-lg border border-[#E7E5E4] p-5 sm:p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
            <h2 className="font-serif text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0F172A] text-white text-xs flex items-center justify-center font-sans">
                2
              </span>
              Qualificação Operacional & Observações do Cliente
            </h2>
            <span className="text-xs text-[#78716C]">Perfil de Frete e Restrições</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                Modalidade de Carga
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {["Lotação (FTL)", "Fracionada (LTL)", "Mista / Dedicada"].map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoCarga(tipo)}
                    className={`px-3 py-2 rounded-md text-xs font-medium border text-center transition-all ${
                      tipoCarga === tipo
                        ? "bg-[#0F172A] text-white border-[#0F172A] shadow-sm"
                        : "bg-white text-[#1C1917] border-[#D6D3D1] hover:bg-[#F5F5F4]"
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>

            {/* Rotas */}
            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                Principais Rotas de Interesse (Origem ➔ Destino)
              </label>
              <div className="flex flex-wrap gap-2">
                {ROTAS_COMUNS.map((rota) => {
                  const selected = rotasSelecionadas.includes(rota);
                  return (
                    <button
                      key={rota}
                      type="button"
                      onClick={() => toggleRota(rota)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all ${
                        selected
                          ? "bg-[#0D9488] text-white border-[#0D9488]"
                          : "bg-[#FAFAF9] text-[#57534E] border-[#E7E5E4] hover:border-[#78716C]"
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {rota}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tipos de Veículos */}
            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                Veículos e Carrocerias Necessárias
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VEICULOS_DISPONIVEIS.map((v) => {
                  const selected = veiculosSelecionados.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggleVeiculo(v)}
                      className={`p-2.5 rounded-md text-left text-xs font-medium border flex items-center justify-between transition-all ${
                        selected
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-[#1C1917] border-[#E7E5E4] hover:bg-[#FAFAF9]"
                      }`}
                    >
                      <span>{v}</span>
                      {selected && <Check className="w-3 h-3 text-[#0D9488]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Volume */}
            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Volume Mensal Estimado
              </label>
              <input
                type="text"
                placeholder="Ex: 30 carretas/mês, R$ 200.000 em frete, 500 toneladas"
                value={volumeMensal}
                onChange={(e) => setVolumeMensal(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-sm focus-ring"
              />
            </div>

            {/* NOVO CAMPO: OBSERVAÇÕES IMPORTANTES DO CLIENTE (US-10) */}
            <div className="pt-2 border-t border-[#F5F5F4]">
              <label className="block text-xs font-semibold text-[#1C1917] mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                Observações Importantes & Restrições do Cliente (Sai no Relatório PDF)
              </label>
              <p className="text-[11px] text-[#78716C] mb-2">
                Anote o que o cliente precisa, o que ele não carrega (ex: só carga paletizada, não aceita carga batida), janelas de agendamento ou exigências de frota.
              </p>
              <textarea
                rows={3}
                placeholder="Ex: Cliente exige carga 100% paletizada. Não carrega carga batida. Recebimento apenas mediante agendamento das 07h às 13h."
                value={observacoesImportantes}
                onChange={(e) => setObservacoesImportantes(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-amber-300 bg-amber-50/40 text-sm focus:bg-white focus-ring"
              />
            </div>
          </div>
        </div>

        {/* BLOCO 3: CONTATO COMERCIAL */}
        <div className="bg-white rounded-lg border border-[#E7E5E4] p-5 sm:p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
            <h2 className="font-serif text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0F172A] text-white text-xs flex items-center justify-center font-sans">
                3
              </span>
              Interlocutor / Contato na Empresa
            </h2>
            <span className="text-xs text-[#78716C]">Decisor de Frete</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Nome do Contato
              </label>
              <input
                type="text"
                placeholder="Ex: Henrique Martins"
                value={contatoNome}
                onChange={(e) => setContatoNome(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-sm focus-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Cargo / Função
              </label>
              <input
                type="text"
                placeholder="Ex: Gerente de Logística / Comprador"
                value={contatoCargo}
                onChange={(e) => setContatoCargo(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-sm focus-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                placeholder="(14) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-sm focus-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] mb-1">
                E-mail Corporativo
              </label>
              <input
                type="email"
                placeholder="logistica@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#D6D3D1] bg-white text-sm focus-ring"
              />
            </div>
          </div>
        </div>

        {/* BOTAO SUBMIT COM TRAVA DE SEGURANCA */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/"
            className="px-5 py-2.5 border border-[#D6D3D1] text-[#1C1917] hover:bg-[#F5F5F4] rounded-md text-sm font-medium transition-colors"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={isSaving || isStrictBlocked}
            className={`px-6 py-2.5 rounded-md text-sm font-semibold text-white shadow-sm transition-all focus-ring ${
              isStrictBlocked
                ? "bg-red-400 cursor-not-allowed opacity-75"
                : "bg-[#0D9488] hover:bg-[#0F766E]"
            }`}
          >
            {isStrictBlocked ? (
              "⛔ Contato Bloqueado (Cliente da Carteira)"
            ) : isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando Lead...
              </span>
            ) : (
              "Criar Oportunidade no Funil"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
