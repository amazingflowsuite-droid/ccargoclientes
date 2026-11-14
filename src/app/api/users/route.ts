import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireGestor, requireSession, sanitizeUser } from "@/lib/server-session";

function generateSecureToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function GET() {
  const auth = requireSession();
  if (auth.errorResponse) return auth.errorResponse;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Servidor Supabase Admin não configurado." },
      { status: 503 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("app_users")
    .select("id, nome, email, perfil, status_senha, ativo, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: (data || []).map(sanitizeUser) });
}

export async function POST(req: NextRequest) {
  const auth = requireGestor();
  if (auth.errorResponse) return auth.errorResponse;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Servidor Supabase Admin não configurado." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const nome = String(body?.nome || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const perfil = body?.perfil === "gestor" ? "gestor" : "comercial";

    if (!nome || !email) {
      return NextResponse.json(
        { error: "Nome e e-mail corporativo são obrigatórios." },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("app_users")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Já existe um usuário cadastrado com este e-mail." },
        { status: 409 }
      );
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("app_users")
      .insert({
        nome,
        email,
        perfil,
        senha: `__PENDING_${token}`,
        status_senha: "pendente_definicao",
        reset_token: token,
        reset_token_expires_at: expiresAt,
        ativo: true,
      })
      .select("id, nome, email, perfil, status_senha, ativo, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Erro ao criar usuário." },
        { status: 400 }
      );
    }

    return NextResponse.json({ user: sanitizeUser(data), token }, { status: 201 });
  } catch (err) {
    console.error("Erro em POST /api/users:", err);
    return NextResponse.json({ error: "Erro interno ao criar usuário." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireGestor();
  if (auth.errorResponse) return auth.errorResponse;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Servidor Supabase Admin não configurado." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const id = String(body?.id || "").trim();
    const action = String(body?.action || "");

    if (!id) {
      return NextResponse.json({ error: "ID do usuário é obrigatório." }, { status: 400 });
    }

    if (action === "toggle_active") {
      const ativo = Boolean(body?.ativo);
      const { error } = await supabaseAdmin.from("app_users").update({ ativo }).eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "request_reset") {
      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabaseAdmin
        .from("app_users")
        .update({
          reset_token: token,
          reset_token_expires_at: expiresAt,
        })
        .eq("id", id)
        .select("id, nome, email, perfil, status_senha, ativo, created_at")
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message || "Usuário não encontrado." },
          { status: 404 }
        );
      }

      return NextResponse.json({ user: sanitizeUser(data), token });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    console.error("Erro em PATCH /api/users:", err);
    return NextResponse.json({ error: "Erro interno ao atualizar usuário." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireGestor();
  if (auth.errorResponse) return auth.errorResponse;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Servidor Supabase Admin não configurado." },
      { status: 503 }
    );
  }

  const id = req.nextUrl.searchParams.get("id")?.trim() || "";
  if (!id) {
    return NextResponse.json({ error: "ID do usuário é obrigatório." }, { status: 400 });
  }

  const { data: user, error: userErr } = await supabaseAdmin
    .from("app_users")
    .select("id, nome")
    .eq("id", id)
    .maybeSingle();

  if (userErr || !user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const { count: accountsCount } = await supabaseAdmin
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .or(`sdr_responsavel_nome.eq.${user.nome},gerente_conta_nome.eq.${user.nome}`);

  const { count: logsCount } = await supabaseAdmin
    .from("contact_logs")
    .select("id", { count: "exact", head: true })
    .eq("usuario_nome", user.nome);

  const totalHistory = (accountsCount || 0) + (logsCount || 0);
  if (totalHistory > 0) {
    return NextResponse.json(
      {
        error: `Este usuário possui ${totalHistory} registro(s) no histórico comercial e não pode ser excluído. Use "Inativar Acesso" para bloquear o login preservando a auditoria.`,
      },
      { status: 409 }
    );
  }

  const { error: delErr } = await supabaseAdmin.from("app_users").delete().eq("id", id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
