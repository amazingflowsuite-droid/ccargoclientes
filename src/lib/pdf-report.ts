import { Account, ContactLog, LeadStage } from "@/types";
import { formatCNPJ } from "./utils";

const CCARGO_LOGO_SVG_HTML = `
  <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
    <svg width="150" height="42" viewBox="0 0 260 76" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M27.5 4.5C31.2 2.3 35.8 2.3 39.5 4.5L60.2 16.5C63.9 18.7 66.2 22.6 66.2 26.9V50.9C66.2 55.2 63.9 59.1 60.2 61.3L39.5 73.3C35.8 75.5 31.2 75.5 27.5 73.3L6.8 61.3C3.1 59.1 0.8 55.2 0.8 50.9V26.9C0.8 22.6 3.1 18.7 6.8 16.5L27.5 4.5Z" fill="#C81E1E"/>
      <path d="M49.5 25.5H28.2C22.8 25.5 19.2 28.8 18.1 34.1L16.4 42.5C15.3 47.8 18.2 51.5 23.6 51.5H45.8L47.8 42.2H27.8C25.8 42.2 24.8 41.1 25.2 39.1L25.9 35.8C26.3 33.8 27.6 32.8 29.6 32.8H48.0L49.5 25.5Z" fill="#FFFFFF"/>
      <text x="74" y="49" fill="#111827" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="43" letter-spacing="-1.5">Cargo</text>
      <text x="78" y="67" fill="#4B5563" font-family="Inter, Arial, sans-serif" font-weight="600" font-style="italic" font-size="14.5" letter-spacing="2.5">Transportes</text>
    </svg>
  </div>
`;

function escapeHtml(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getStageLabel(stage?: LeadStage): string {
  switch (stage) {
    case "prospeccao_inicial":
      return "1. Primeiro Contato";
    case "qualificacao_logistica":
      return "2. Perfil & Frota";
    case "cotacao_frete":
      return "3. Cotação de Frete";
    case "proposta_enviada":
      return "4. Proposta Enviada";
    case "negociacao":
      return "5. Negociação";
    case "fechado_ganho":
      return "6. Fechado / Ganho";
    case "perdido":
      return "Perdido / Sem Fit";
    default:
      return "1. Primeiro Contato";
  }
}

export function getStatusLabel(account: Account): string {
  if (account.status === "cliente_ativo") return "Cliente Ativo da Carteira";
  if (account.status === "desqualificado") return "Conta Recusada / Inviável";
  if (account.status === "ex_cliente") return "Ex-Cliente";
  return `Lead em Prospecção (${getStageLabel(account.estagio)})`;
}

export function getCanalLabel(canal: ContactLog["tipo_contato"]): string {
  switch (canal) {
    case "telefone":
      return "Ligação Telefônica";
    case "whatsapp":
      return "WhatsApp";
    case "email":
      return "E-mail";
    case "reuniao":
      return "Reunião";
    default:
      return canal;
  }
}

export function getResultadoLabel(resultado: ContactLog["resultado"]): string {
  switch (resultado) {
    case "sucesso":
      return "Atendido / Com Sucesso";
    case "sem_resposta":
      return "Sem Resposta / Caixa Postal";
    case "reagendado":
      return "Reagendado";
    case "recusado":
      return "Sem Interesse";
    default:
      return resultado;
  }
}

// ============================================================================
// 1. DOSSIÊ INDIVIDUAL DO CLIENTE EM PDF (US-11 - Ex: Cliente Tauste)
// ============================================================================

export function generateClientDossierPDF(account: Account, logs: ContactLog[]): void {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank", "width=980,height=850");
  if (!printWindow) {
    alert("Por favor, permita pop-ups neste site para gerar o relatório em PDF.");
    return;
  }

  const emittedAt = new Date().toLocaleString("pt-BR");
  const totalCalls = logs.length;
  const successCalls = logs.filter((l) => l.resultado === "sucesso").length;
  const noAnswerCalls = logs.filter((l) => l.resultado === "sem_resposta").length;

  const rotasHtml =
    account.rotas_principais && account.rotas_principais.length > 0
      ? account.rotas_principais.map((r) => `<span class="tag">${escapeHtml(r)}</span>`).join(" ")
      : "<span class='muted'>Não informadas</span>";

  const veiculosHtml =
    account.tipos_veiculos && account.tipos_veiculos.length > 0
      ? account.tipos_veiculos.map((v) => `<span class="tag">${escapeHtml(v)}</span>`).join(" ")
      : "<span class='muted'>Não informados</span>";

  const logsRowsHtml =
    logs.length === 0
      ? `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #78716C; font-style: italic;">Nenhuma tentativa de contato registrada até o momento.</td></tr>`
      : logs
          .map((log, idx) => {
            const badgeClass =
              log.resultado === "sucesso"
                ? "badge-success"
                : log.resultado === "sem_resposta"
                ? "badge-neutral"
                : log.resultado === "reagendado"
                ? "badge-warning"
                : "badge-danger";

            return `
              <tr>
                <td style="white-space: nowrap; font-family: monospace; font-size: 11px;">
                  #${logs.length - idx}<br/>
                  <strong>${new Date(log.created_at).toLocaleDateString("pt-BR")}</strong><br/>
                  <span style="color:#57534E;">${new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                </td>
                <td>${escapeHtml( getCanalLabel(log.tipo_contato) )}</td>
                <td><span class="badge ${badgeClass}">${escapeHtml( getResultadoLabel(log.resultado) )}</span></td>
                <td>${escapeHtml(log.usuario_nome || account.sdr_responsavel_nome || "Operadora Comercial")}</td>
                <td style="line-height: 1.45;">${escapeHtml(log.resumo)}</td>
              </tr>
            `;
          })
          .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Relatório do Cliente - ${escapeHtml(account.razao_social)} | CCargo</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1C1917;
          background: #FAFAF9;
          padding: 32px;
          font-size: 12px;
          line-height: 1.5;
        }
        .page-container {
          max-width: 840px;
          margin: 0 auto;
          background: #FFFFFF;
          border: 1px solid #E7E5E4;
          border-radius: 8px;
          padding: 36px;
        }
        .no-print-bar {
          max-width: 840px;
          margin: 0 auto 16px auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #0F172A;
          color: #FFFFFF;
          padding: 12px 20px;
          border-radius: 8px;
        }
        .btn-print {
          background: #0D9488;
          color: #FFFFFF;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
        }
        .btn-close {
          background: transparent;
          color: #D6D3D1;
          border: 1px solid #57534E;
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          margin-left: 8px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0F172A;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .brand-title {
          font-family: 'Libre Baskerville', Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          color: #0F172A;
        }
        .brand-sub {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #0D9488;
          font-weight: 700;
          margin-top: 2px;
        }
        .meta-box {
          text-align: right;
          font-size: 11px;
          color: #57534E;
        }
        .section {
          margin-bottom: 22px;
          page-break-inside: avoid;
        }
        .section-title {
          font-family: 'Libre Baskerville', Georgia, serif;
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
          border-bottom: 1px solid #E7E5E4;
          padding-bottom: 6px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 20px;
        }
        .field-label {
          font-size: 10px;
          text-transform: uppercase;
          color: #78716C;
          font-weight: 600;
        }
        .field-value {
          font-size: 13px;
          font-weight: 600;
          color: #1C1917;
        }
        .notes-highlight {
          background: #FFFBEB;
          border: 1.5px solid #F59E0B;
          border-radius: 6px;
          padding: 14px 16px;
          color: #78350F;
          font-size: 13px;
          line-height: 1.55;
        }
        .disq-highlight {
          background: #FEF2F2;
          border: 1.5px solid #EF4444;
          border-radius: 6px;
          padding: 14px 16px;
          color: #7F1D1D;
          font-size: 12px;
        }
        .tag {
          display: inline-block;
          background: #F5F5F4;
          border: 1px solid #D6D3D1;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin: 2px 4px 2px 0;
        }
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }
        .kpi-card {
          background: #FAFAF9;
          border: 1px solid #E7E5E4;
          border-radius: 6px;
          padding: 10px 14px;
        }
        .kpi-num {
          font-size: 18px;
          font-weight: 700;
          color: #0F172A;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
        }
        th {
          background: #F5F5F4;
          color: #57534E;
          text-align: left;
          padding: 8px 10px;
          border: 1px solid #E7E5E4;
          font-size: 10px;
          text-transform: uppercase;
        }
        td {
          padding: 9px 10px;
          border: 1px solid #E7E5E4;
          vertical-align: top;
        }
        tr { page-break-inside: avoid; }
        .badge {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }
        .badge-success { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
        .badge-neutral { background: #F3F4F6; color: #374151; border: 1px solid #D1D5DB; }
        .badge-warning { background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }
        .badge-danger { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
        .muted { color: #A8A29E; font-style: italic; }
        .footer {
          margin-top: 28px;
          padding-top: 12px;
          border-top: 1px solid #E7E5E4;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #78716C;
        }
        @media print {
          body { background: #FFFFFF; padding: 0; }
          .page-container { border: none; padding: 12px; max-width: 100%; }
          .no-print-bar { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <strong>📄 Dossiê Individual do Cliente pronto para impressão ou PDF</strong>
          <div style="font-size: 11px; color: #A8A29E;">Na janela de impressão, selecione "Salvar como PDF" ou escolha sua impressora.</div>
        </div>
        <div>
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
          <button class="btn-close" onclick="window.close()">Fechar</button>
        </div>
      </div>

      <div class="page-container">
        <div class="header">
          <div>
            ${CCARGO_LOGO_SVG_HTML}
            <div class="brand-sub">Dossiê Comercial & Histórico de Prospecção do Cliente</div>
          </div>
          <div class="meta-box">
            <div><strong>Emitido em:</strong> ${emittedAt}</div>
            <div><strong>Operadora Responsável:</strong> ${escapeHtml(account.sdr_responsavel_nome || account.gerente_conta_nome || "Ana Paula (Comercial)")}</div>
            <div><strong>Status Atual:</strong> ${escapeHtml(getStatusLabel(account))}</div>
          </div>
        </div>

        <!-- SEÇÃO 1: IDENTIFICAÇÃO DO CLIENTE -->
        <div class="section">
          <div class="section-title">1. Identificação da Empresa e Decisor</div>
          <div class="grid-2">
            <div>
              <div class="field-label">Razão Social</div>
              <div class="field-value">${escapeHtml(account.razao_social)}</div>
            </div>
            <div>
              <div class="field-label">Nome Fantasia</div>
              <div class="field-value">${escapeHtml(account.nome_fantasia || "—")}</div>
            </div>
            <div>
              <div class="field-label">CNPJ</div>
              <div class="field-value" style="font-family: monospace;">${escapeHtml(formatCNPJ(account.cnpj))}</div>
            </div>
            <div>
              <div class="field-label">Cidade / UF</div>
              <div class="field-value">${escapeHtml(account.cidade || "—")} / ${escapeHtml(account.uf || "—")}</div>
            </div>
            <div>
              <div class="field-label">Contato Principal (Decisor)</div>
              <div class="field-value">${escapeHtml(account.contato_nome || "Não informado")} ${account.contato_cargo ? `(${escapeHtml(account.contato_cargo)})` : ""}</div>
            </div>
            <div>
              <div class="field-label">Telefone / E-mail</div>
              <div class="field-value">${escapeHtml(account.telefone || "—")} ${account.email ? ` | ${escapeHtml(account.email)}` : ""}</div>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 2: OBSERVAÇÕES IMPORTANTES DO CLIENTE (O QUE QUER / O QUE NÃO CARREGA) -->
        <div class="section">
          <div class="section-title">2. Observações Importantes & Restrições do Cliente</div>
          <div class="notes-highlight">
            ${
              account.observacoes_importantes
                ? `<strong>📌 Particularidades Registradas:</strong><br/>${escapeHtml(account.observacoes_importantes).replace(/\n/g, "<br/>")}`
                : `<span class="muted">Nenhuma observação específica ou restrição operacional cadastrada para este cliente até o momento.</span>`
            }
          </div>
        </div>

        ${
          account.status === "desqualificado"
            ? `
        <div class="section">
          <div class="section-title" style="color:#B91C1C;">⚠️ Alerta de Desqualificação / Recusa</div>
          <div class="disq-highlight">
            <strong>Motivo:</strong> ${escapeHtml(account.motivo_desqualificacao?.replace(/_/g, " ").toUpperCase())}<br/>
            <strong>Justificativa:</strong> ${escapeHtml(account.detalhe_desqualificacao || "—")}
          </div>
        </div>
        `
            : ""
        }

        <!-- SEÇÃO 3: PERFIL LOGÍSTICO E OPERACIONAL -->
        <div class="section">
          <div class="section-title">3. Perfil Logístico & Exigências de Frota</div>
          <div class="grid-2" style="margin-bottom: 10px;">
            <div>
              <div class="field-label">Modalidade de Carga</div>
              <div class="field-value">${escapeHtml(account.tipo_carga || "Lotação (FTL)")}</div>
            </div>
            <div>
              <div class="field-label">Volume Mensal Estimado</div>
              <div class="field-value">${escapeHtml(account.volume_mensal_estimado || "A levantar")}</div>
            </div>
          </div>
          <div style="margin-bottom: 8px;">
            <div class="field-label" style="margin-bottom: 4px;">Rotas de Interesse (Origem ⇄ Destino)</div>
            <div>${rotasHtml}</div>
          </div>
          <div>
            <div class="field-label" style="margin-bottom: 4px;">Veículos e Carrocerias Demandados</div>
            <div>${veiculosHtml}</div>
          </div>
        </div>

        <!-- SEÇÃO 4: HISTÓRICO DE LIGAÇÕES E INTERAÇÕES -->
        <div class="section">
          <div class="section-title">4. Histórico Completo de Contatos Realizados (${totalCalls})</div>
          <div class="kpi-row">
            <div class="kpi-card">
              <div class="field-label">Total de Tentativas</div>
              <div class="kpi-num">${totalCalls}</div>
            </div>
            <div class="kpi-card">
              <div class="field-label">Contatos com Sucesso</div>
              <div class="kpi-num" style="color: #047857;">${successCalls}</div>
            </div>
            <div class="kpi-card">
              <div class="field-label">Sem Resposta / Caixa Postal</div>
              <div class="kpi-num" style="color: #B45309;">${noAnswerCalls}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 110px;">Data / Hora</th>
                <th style="width: 110px;">Canal</th>
                <th style="width: 135px;">Resultado</th>
                <th style="width: 130px;">Operadora</th>
                <th>O que foi conversado / Observações do Contato</th>
              </tr>
            </thead>
            <tbody>
              ${logsRowsHtml}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <span>CCargo Transportes Rodoviários — Sistema de Gestão de Prospecção e Blindagem Comercial</span>
          <span>Documento gerado eletronicamente em ${emittedAt}</span>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 350);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

// ============================================================================
// 2. RELATÓRIO GERENCIAL MENSAL EM PDF (US-12)
// ============================================================================

export interface MonthlyReportPayload {
  periodoLabel: string;
  operadoraFiltro: string;
  accountsNoPeriodo: Account[];
  logsNoPeriodo: (ContactLog & { account_name?: string; account_cnpj?: string })[];
  metrics: {
    totalContatos: number;
    contatosComSucesso: number;
    contatosSemResposta: number;
    totalEmpresasTrabalhadas: number;
    pediramCotacao: number;
    fecharamNegocio: number;
    desqualificados: number;
  };
}

export function generateMonthlyReportPDF(payload: MonthlyReportPayload): void {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank", "width=1020,height=860");
  if (!printWindow) {
    alert("Por favor, permita pop-ups neste site para gerar o relatório mensal em PDF.");
    return;
  }

  const emittedAt = new Date().toLocaleString("pt-BR");
  const { periodoLabel, operadoraFiltro, accountsNoPeriodo, logsNoPeriodo, metrics } = payload;

  const accountsRowsHtml =
    accountsNoPeriodo.length === 0
      ? `<tr><td colspan="6" style="text-align:center; padding: 18px; color: #78716C;">Nenhuma empresa trabalhada neste filtro.</td></tr>`
      : accountsNoPeriodo
          .map(
            (acc) => `
          <tr>
            <td>
              <strong>${escapeHtml(acc.razao_social)}</strong>
              ${acc.nome_fantasia ? `<br/><span style="color:#57534E; font-size:10.5px;">${escapeHtml(acc.nome_fantasia)}</span>` : ""}
            </td>
            <td style="font-family: monospace; white-space: nowrap;">${escapeHtml(formatCNPJ(acc.cnpj))}</td>
            <td>${escapeHtml(getStatusLabel(acc))}</td>
            <td>${escapeHtml(acc.sdr_responsavel_nome || acc.gerente_conta_nome || "Ana Paula (Comercial)")}</td>
            <td>${escapeHtml(acc.volume_mensal_estimado || "—")}</td>
            <td style="font-size: 11px;">${escapeHtml(acc.observacoes_importantes || acc.detalhe_desqualificacao || "—")}</td>
          </tr>
        `
          )
          .join("");

  const logsRowsHtml =
    logsNoPeriodo.length === 0
      ? `<tr><td colspan="5" style="text-align:center; padding: 18px; color: #78716C;">Nenhuma ligação/interação registrada no período selecionado.</td></tr>`
      : logsNoPeriodo
          .map(
            (log) => `
          <tr>
            <td style="white-space: nowrap; font-family: monospace;">
              ${new Date(log.created_at).toLocaleDateString("pt-BR")}
              <span style="color:#57534E;">${new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </td>
            <td><strong>${escapeHtml(log.account_name || "Empresa")}</strong></td>
            <td>${escapeHtml(log.usuario_nome)}</td>
            <td>${escapeHtml(getCanalLabel(log.tipo_contato))} — <strong>${escapeHtml(getResultadoLabel(log.resultado))}</strong></td>
            <td>${escapeHtml(log.resumo)}</td>
          </tr>
        `
          )
          .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Relatório Mensal de Prospecção - ${escapeHtml(periodoLabel)} | CCargo</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1C1917;
          background: #FAFAF9;
          padding: 28px;
          font-size: 11.5px;
          line-height: 1.45;
        }
        .page-container {
          max-width: 920px;
          margin: 0 auto;
          background: #FFFFFF;
          border: 1px solid #E7E5E4;
          border-radius: 8px;
          padding: 32px;
        }
        .no-print-bar {
          max-width: 920px;
          margin: 0 auto 16px auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #0F172A;
          color: #FFFFFF;
          padding: 12px 20px;
          border-radius: 8px;
        }
        .btn-print {
          background: #0D9488;
          color: #FFFFFF;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
        }
        .btn-close {
          background: transparent;
          color: #D6D3D1;
          border: 1px solid #57534E;
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          margin-left: 8px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0F172A;
          padding-bottom: 14px;
          margin-bottom: 20px;
        }
        .brand-title {
          font-family: 'Libre Baskerville', Georgia, serif;
          font-size: 21px;
          font-weight: 700;
          color: #0F172A;
        }
        .brand-sub {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #0D9488;
          font-weight: 700;
          margin-top: 2px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .kpi-box {
          background: #FAFAF9;
          border: 1px solid #D6D3D1;
          border-radius: 6px;
          padding: 12px 14px;
        }
        .kpi-title {
          font-size: 10px;
          text-transform: uppercase;
          color: #57534E;
          font-weight: 700;
        }
        .kpi-val {
          font-family: 'Libre Baskerville', Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          color: #0F172A;
          margin: 4px 0 2px 0;
        }
        .kpi-sub {
          font-size: 10px;
          color: #78716C;
        }
        .section {
          margin-bottom: 24px;
        }
        .section-title {
          font-family: 'Libre Baskerville', Georgia, serif;
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
          border-bottom: 1px solid #E7E5E4;
          padding-bottom: 6px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        th {
          background: #F5F5F4;
          color: #57534E;
          text-align: left;
          padding: 7px 9px;
          border: 1px solid #E7E5E4;
          font-size: 9.5px;
          text-transform: uppercase;
        }
        td {
          padding: 8px 9px;
          border: 1px solid #E7E5E4;
          vertical-align: top;
        }
        tr { page-break-inside: avoid; }
        .footer {
          margin-top: 24px;
          padding-top: 10px;
          border-top: 1px solid #E7E5E4;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #78716C;
        }
        @media print {
          body { background: #FFFFFF; padding: 0; }
          .page-container { border: none; padding: 10px; max-width: 100%; }
          .no-print-bar { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <strong>📊 Relatório Mensal de Prospecção (${escapeHtml(periodoLabel)})</strong>
          <div style="font-size: 11px; color: #A8A29E;">Clique em "Imprimir / Salvar PDF" para gerar o documento oficial de fechamento.</div>
        </div>
        <div>
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
          <button class="btn-close" onclick="window.close()">Fechar</button>
        </div>
      </div>

      <div class="page-container">
        <div class="header">
          <div>
            ${CCARGO_LOGO_SVG_HTML}
            <div class="brand-sub">Balanço Gerencial de Prospecção Comercial</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #57534E;">
            <div><strong>Período de Referência:</strong> ${escapeHtml(periodoLabel)}</div>
            <div><strong>Operadora / Filtro:</strong> ${escapeHtml(operadoraFiltro)}</div>
            <div><strong>Emitido em:</strong> ${emittedAt}</div>
          </div>
        </div>

        <!-- KPIS DO MÊS -->
        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-title">Contatos Realizados</div>
            <div class="kpi-val">${metrics.totalContatos}</div>
            <div class="kpi-sub">${metrics.contatosComSucesso} atendidos | ${metrics.contatosSemResposta} sem resposta</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Pediram Cotação</div>
            <div class="kpi-val" style="color: #B45309;">${metrics.pediramCotacao}</div>
            <div class="kpi-sub">Em cotação, proposta ou negociação</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Negócios Fechados</div>
            <div class="kpi-val" style="color: #047857;">${metrics.fecharamNegocio}</div>
            <div class="kpi-sub">Convertidos / Ganhos no período</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Contas Recusadas</div>
            <div class="kpi-val" style="color: #B91C1C;">${metrics.desqualificados}</div>
            <div class="kpi-sub">Inviabilidade ou sem fit logístico</div>
          </div>
        </div>

        <!-- TABELA 1: EMPRESAS TRABALHADAS -->
        <div class="section">
          <div class="section-title">1. Empresas Prospectadas & Observações Importantes (${accountsNoPeriodo.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 22%;">Empresa</th>
                <th style="width: 15%;">CNPJ</th>
                <th style="width: 16%;">Status / Etapa</th>
                <th style="width: 14%;">Operadora</th>
                <th style="width: 11%;">Volume</th>
                <th>Observações Importantes / Restrições do Cliente</th>
              </tr>
            </thead>
            <tbody>
              ${accountsRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- TABELA 2: HISTÓRICO DE LIGAÇÕES DO MÊS -->
        <div class="section">
          <div class="section-title">2. Registro Detalhado de Ligações e Contatos Realizados (${logsNoPeriodo.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 14%;">Data / Hora</th>
                <th style="width: 20%;">Empresa</th>
                <th style="width: 15%;">Operadora</th>
                <th style="width: 18%;">Canal & Resultado</th>
                <th>Resumo do Contato</th>
              </tr>
            </thead>
            <tbody>
              ${logsRowsHtml}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <span>CCargo Transportes Rodoviários — Relatório Gerencial Mensal</span>
          <span>Emitido em ${emittedAt}</span>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 350);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

