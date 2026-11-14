import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeUser, setSessionCookie } from "@/lib/server-session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() || "";
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() || "";

  if (!token) {
    return NextResponse.json({ valid: false, error: "Token inválido ou ausente." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { valid: false, error: "Servidor Supabase Admin não configurado." },
      { status: 503 }
    );
  }

  const { data: user, error } = await supabaseAdmin
    .from("app_users")
    .select("*")
    .eq("reset_token", token)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json(
      { valid: false, error: "Link de definição de senha inválido ou já utilizado." },
      { status: 404 }
    );
  }

  if (email && String(user.email).toLowerCase() !== email) {
    return NextResponse.json(
      { valid: false, error: "O link não corresponde ao e-mail informado." },
      { status: 400 }
    );
  }

  if (user.reset_token_expires_at && new Date(user.reset_token_expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { valid: false, error: "Este link expirou (validade de 24h). Solicite um novo link ao Gestor." },
      { status: 410 }
    );
  }

  return NextResponse.json({ valid: true, user: sanitizeUser(user) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body?.token || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const novaSenha = String(body?.novaSenha || "").trim();

    if (!token || novaSenha.length < 8) {
      return NextResponse.json(
        { success: false, error: "Token inválido ou senha menor que 8 caracteres." },
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
      .eq("reset_token", token)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: "Link inválido ou expirado." },
        { status: 404 }
      );
    }

    if (email && String(user.email).toLowerCase() !== email) {
      return NextResponse.json(
        { success: false, error: "O link não corresponde ao e-mail informado." },
        { status: 400 }
      );
    }

    if (
      user.reset_token_expires_at &&
      new Date(user.reset_token_expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { success: false, error: "Este link expirou (validade de 24h). Solicite um novo ao Gestor." },
        { status: 410 }
      );
    }

    const { error: updateErr } = await supabaseAdmin
      .from("app_users")
      .update({
        senha: novaSenha,
        status_senha: "ativa",
        reset_token: null,
        reset_token_expires_at: null,
      })
      .eq("id", user.id);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: "Erro ao salvar nova senha no banco." },
        { status: 500 }
      );
    }

    const safeUser = sanitizeUser({ ...user, status_senha: "ativa" });
    const response = NextResponse.json({ success: true, user: safeUser });
    setSessionCookie(response, safeUser);
    return response;
  } catch (err) {
    console.error("Erro em /api/auth/password-reset:", err);
    return NextResponse.json(
      { success: false, error: "Erro interno ao definir senha." },
      { status: 500 }
    );
  }
}
