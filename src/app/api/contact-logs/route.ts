import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireSession } from "@/lib/server-session";

export async function GET(req: NextRequest) {
  const auth = requireSession();
  if (auth.errorResponse) return auth.errorResponse;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Servidor Supabase Admin não configurado." },
      { status: 503 }
    );
  }

  const accountId = req.nextUrl.searchParams.get("accountId")?.trim();
  let query = supabaseAdmin
    .from("contact_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = requireSession();
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
    const { account_id, tipo_contato, resultado, resumo, proximo_contato, usuario_nome } = body || {};

    if (!account_id || !tipo_contato || !resultado || !resumo) {
      return NextResponse.json(
        { error: "Campos obrigatórios do registro de contato ausentes." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("contact_logs")
      .insert({
        account_id,
        tipo_contato,
        resultado,
        resumo,
        proximo_contato: proximo_contato || null,
        usuario_nome: usuario_nome || auth.session.nome,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("Erro em POST /api/contact-logs:", err);
    return NextResponse.json({ error: "Erro interno ao registrar contato." }, { status: 500 });
  }
}
