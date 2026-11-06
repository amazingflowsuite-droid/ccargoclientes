import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

function loadLocalEnvFallback(): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eqIdx = line.indexOf("=");
        if (eqIdx === -1) continue;
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if (
          (val.startsWith("'") && val.endsWith("'")) ||
          (val.startsWith('"') && val.endsWith('"'))
        ) {
          val = val.slice(1, -1);
        }
        result[key] = val;
      }
    }
  } catch {
    // Ignorar caso não exista .env.local (ex: produção Vercel onde process.env já vem populado)
  }
  return result;
}

function buildCCargoHtmlEmail(params: {
  nome: string;
  email: string;
  tipo: "convite" | "reset";
  resetUrl: string;
}): string {
  const { nome, email, tipo, resetUrl } = params;
  const isInvite = tipo === "convite";

  const badgeText = isInvite ? "NOVO ACESSO LIBERADO" : "REDEFINIÇÃO DE SENHA";
  const titleText = isInvite
    ? `Bem-vindo(a) ao CRM Comercial CCargo, ${nome || "Colaborador(a)"}!`
    : `Solicitação de Redefinição de Senha`;
  const introText = isInvite
    ? `Seu usuário de acesso (<strong>${email}</strong>) foi cadastrado pelo Gestor no sistema <strong>CCargo Prospecção Comercial</strong>.`
    : `O Gestor do sistema <strong>CCargo Prospecção Comercial</strong> liberou a redefinição de senha para a sua conta (<strong>${email}</strong>).`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#F5F5F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1C1917;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border:1px solid #E7E5E4;border-radius:10px;overflow:hidden;">
          <!-- Header CCargo -->
          <tr>
            <td style="background-color:#0F172A;padding:24px 32px;border-bottom:4px solid #D91C24;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background-color:#D91C24;color:#FFFFFF;font-weight:900;font-style:italic;font-size:18px;padding:4px 10px;border-radius:4px;margin-right:8px;">C</span>
                    <span style="color:#FFFFFF;font-size:20px;font-weight:800;font-style:italic;letter-spacing:-0.5px;">Cargo</span>
                    <span style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin-left:8px;">Transportes • CRM Comercial</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <div style="display:inline-block;background-color:#F0FDFA;border:1px solid #99F6E4;color:#0F766E;font-size:10px;font-weight:700;letter-spacing:1px;padding:4px 10px;border-radius:4px;margin-bottom:16px;">
                ${badgeText}
              </div>

              <h1 style="margin:0 0 14px 0;font-size:20px;font-weight:700;color:#1C1917;line-height:1.3;">
                ${titleText}
              </h1>

              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#44403C;">
                ${introText}
              </p>

              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#44403C;">
                Por segurança, nenhuma senha padrão foi criada manualmente. Clique no botão abaixo para criar sua senha pessoal e exclusiva (link válido por <strong>24 horas</strong>):
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color:#0F172A;border-radius:6px;">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:13px 26px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;">
                      Definir Minha Senha de Acesso &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color:#FAFAF9;border:1px solid #E7E5E4;border-radius:6px;padding:12px 14px;margin-bottom:20px;">
                <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#57534E;text-transform:uppercase;">
                  Ou copie e cole este link no seu navegador:
                </p>
                <p style="margin:0;font-size:11px;font-family:monospace;color:#0F766E;word-break:break-all;">
                  <a href="${resetUrl}" style="color:#0F766E;text-decoration:underline;">${resetUrl}</a>
                </p>
              </div>

              <p style="margin:0;font-size:12px;color:#78716C;line-height:1.5;">
                Caso você não reconheça este cadastro, basta ignorar esta mensagem.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#FAFAF9;border-top:1px solid #E7E5E4;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#78716C;">
                <strong>CCargo Transportes Rodoviários</strong> — Sistema de Prospecção &amp; Gestão Comercial
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, email, tipo, resetUrl } = body as {
      nome: string;
      email: string;
      tipo: "convite" | "reset";
      resetUrl: string;
    };

    if (!email || !resetUrl) {
      return NextResponse.json(
        { success: false, error: "E-mail e URL de definição são obrigatórios." },
        { status: 400 }
      );
    }

    // Blindagem de Segurança (SEC-03): Validação anti Open-Relay e Phishing
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: "Endereço de e-mail inválido." },
        { status: 400 }
      );
    }

    try {
      const parsedUrl = new URL(resetUrl);
      if (!parsedUrl.pathname.startsWith("/definir-senha")) {
        return NextResponse.json(
          { success: false, error: "URL de definição inválida." },
          { status: 400 }
        );
      }
      const allowedHosts = [
        "localhost",
        "127.0.0.1",
        "ccargoclientes.vercel.app",
        "ccargo.com.br",
      ];
      const isAllowedHost = allowedHosts.some(
        (h) =>
          parsedUrl.hostname === h ||
          parsedUrl.hostname.endsWith(`.${h}`) ||
          parsedUrl.hostname.endsWith(".vercel.app")
      );
      if (!isAllowedHost) {
        return NextResponse.json(
          { success: false, error: "Destino da URL não autorizado por segurança." },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Formato de URL inválido." },
        { status: 400 }
      );
    }

    const subject =
      tipo === "convite"
        ? "CCargo Prospecção - Convite de Acesso e Definição de Senha"
        : "CCargo Prospecção - Solicitação de Redefinição de Senha";

    const textMessage = `Olá, ${nome || "Colaborador(a)"}!\n\n${
      tipo === "convite"
        ? "Seu acesso ao sistema CCargo Prospecção Comercial foi criado pelo Gestor."
        : "O Gestor do sistema CCargo liberou a redefinição da sua senha de acesso."
    }\n\nPara definir sua senha pessoal com segurança, acesse o link exclusivo abaixo (válido por 24 horas):\n${resetUrl}\n\nAtenciosamente,\nGestão Comercial — CCargo Transportes`;

    const htmlMessage = buildCCargoHtmlEmail({
      nome: nome || "Colaborador(a)",
      email,
      tipo,
      resetUrl,
    });

    const localEnv = loadLocalEnvFallback();
    const primaryHost = process.env.SMTP_HOST || localEnv.SMTP_HOST || "smtp.hostinger.com";
    const smtpPort = Number(process.env.SMTP_PORT || localEnv.SMTP_PORT || 465);
    const smtpUser = (process.env.SMTP_USER || localEnv.SMTP_USER || "").trim();
    const smtpPass = (process.env.SMTP_PASS || localEnv.SMTP_PASS || "").trim();
    const smtpFrom =
      (process.env.SMTP_FROM || localEnv.SMTP_FROM || "").trim() ||
      (smtpUser ? `"CCargo Comercial" <${smtpUser}>` : "");

    let emailSentViaProvider = false;
    let providerUsed: "hostinger_smtp" | "resend" | "none" = "none";
    let providerError: string | null = null;

    // 1. PRIORIDADE: Envio direto via SMTP Hostinger / Titan / Domínio CCargo
    if (smtpUser && smtpPass) {
      const candidateHosts = Array.from(
        new Set([primaryHost, "smtp.hostinger.com", "smtp.titan.email", "mail.ccargo.com.br"])
      );

      for (const host of candidateHosts) {
        try {
          const transporter = nodemailer.createTransport({
            host,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
          });

          await transporter.sendMail({
            from: smtpFrom,
            to: email,
            subject,
            text: textMessage,
            html: htmlMessage,
          });

          emailSentViaProvider = true;
          providerUsed = "hostinger_smtp";
          providerError = null;
          break;
        } catch (smtpErr: unknown) {
          const errMsg =
            smtpErr instanceof Error ? smtpErr.message : "Erro ao conectar no servidor SMTP";
          console.warn(`Tentativa SMTP via ${host}:${smtpPort} falhou:`, errMsg);
          providerError = `Falha SMTP (${host}:${smtpPort}): ${errMsg}`;
        }
      }
    }

    // 2. FALLBACK SECUNDÁRIO: Resend API (caso configurado e SMTP não tenha enviado)
    const resendApiKey = (process.env.RESEND_API_KEY || localEnv.RESEND_API_KEY || "").trim();
    if (!emailSentViaProvider && resendApiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "CCargo Comercial <onboarding@resend.dev>",
            to: [email],
            subject,
            text: textMessage,
            html: htmlMessage,
          }),
        });
        if (res.ok) {
          emailSentViaProvider = true;
          providerUsed = "resend";
          providerError = null;
        } else {
          const errJson = await res.json().catch(() => ({}));
          providerError = errJson?.message || `Erro HTTP ${res.status} na API Resend`;
        }
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : "Erro ao conectar na API Resend";
        console.warn("Falha ao disparar via Resend:", errMsg);
        providerError = errMsg;
      }
    }

    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(textMessage)}`;

    return NextResponse.json({
      success: true,
      emailSentViaProvider,
      providerUsed,
      providerConfigured: Boolean(smtpUser && smtpPass) || Boolean(resendApiKey),
      providerError,
      mailtoUrl,
      resetUrl,
      subject,
      messagePreview: textMessage,
    });
  } catch (err) {
    console.error("Erro na rota send-password-link:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao preparar envio de link de senha." },
      { status: 500 }
    );
  }
}
