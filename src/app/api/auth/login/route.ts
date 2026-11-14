import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeUser, setSessionCookie } from "@/lib/server-session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanEmail = String(body?.email || "").trim().toLowerCase();
    const cleanPass = String(body?.senha || "").trim();

    if (!cleanEmail || !cleanPass) {
      return NextResponse.json(
        { success: false, error: "Informe o e-mail e a senha." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Servidor Supabase Admin não configurado." },
        { status: 503 }
      );
    }

    const { data: user, error } = await supabaseAdmin
      .from("app_users")
      .select("*")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Erro ao consultar usuário." },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "E-mail ou senha inválidos." },
        { status: 401 }
      );
    }

    if (
      user.status_senha === "pendente_definicao" ||
      !user.senha ||
      String(user.senha).startsWith("__PENDING_")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Sua conta aguarda definição de senha. Acesse o link enviado para o seu e-mail ou peça um novo link ao Gestor.",
        },
        { status: 403 }
      );
    }

    if (user.senha !== cleanPass) {
      return NextResponse.json(
        { success: false, error: "E-mail ou senha inválidos." },
        { status: 401 }
      );
    }

    if (!user.ativo) {
      return NextResponse.json(
        {
          success: false,
          error: "Este usuário está desativado. Contate o gestor do sistema.",
        },
        { status: 403 }
      );
    }

    const safeUser = sanitizeUser(user);
    const response = NextResponse.json({ success: true, user: safeUser });
    setSessionCookie(response, safeUser);
    return response;
  } catch (err) {
    console.error("Erro em /api/auth/login:", err);
    return NextResponse.json(
      { success: false, error: "Erro interno ao autenticar." },
      { status: 500 }
    );
  }
}
