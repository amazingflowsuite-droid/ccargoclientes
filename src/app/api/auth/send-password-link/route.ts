import { NextResponse } from "next/server";

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

    const subject =
      tipo === "convite"
        ? "CCargo Prospecção - Convite de Acesso e Definição de Senha"
        : "CCargo Prospecção - Solicitação de Redefinição de Senha";

    const textMessage = `Olá, ${nome || "Colaborador(a)"}!\n\n${
      tipo === "convite"
        ? "Seu acesso ao sistema CCargo Prospecção Comercial foi criado pelo Gestor."
        : "O Gestor do sistema CCargo liberou a redefinição da sua senha de acesso."
    }\n\nPara definir sua senha pessoal com segurança, acesse o link exclusivo abaixo (válido por 24 horas):\n${resetUrl}\n\nAtenciosamente,\nGestão Comercial — CCargo Transportes`;

    // Se houver chave RESEND_API_KEY configurada no ambiente, dispara o e-mail transacional automaticamente
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSentViaProvider = false;

    if (resendApiKey) {
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
          }),
        });
        if (res.ok) {
          emailSentViaProvider = true;
        }
      } catch (e) {
        console.warn("Falha ao disparar via Resend:", e);
      }
    }

    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(textMessage)}`;

    return NextResponse.json({
      success: true,
      emailSentViaProvider,
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

