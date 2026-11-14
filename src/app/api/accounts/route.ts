import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireSession } from "@/lib/server-session";
import { cleanCNPJ, formatCNPJ } from "@/lib/utils";
import { Account } from "@/types";

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

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const { data, error } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  }

  const { data, error } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });

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
    const body = (await req.json()) as Partial<Account>;
    const clean = cleanCNPJ(String(body?.cnpj || ""));
    if (clean.length !== 14 || !body?.razao_social?.trim()) {
      return NextResponse.json(
        { error: "CNPJ (14 dígitos) e Razão Social são obrigatórios." },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("accounts")
      .select("id, status, estagio, sdr_responsavel_nome")
      .eq("cnpj", clean)
      .maybeSingle();

    if (existing) {
      if (existing.status === "cliente_ativo") {
        return NextResponse.json(
          { error: "CNPJ já é cliente ativo da CCargo. Prospecção bloqueada." },
          { status: 409 }
        );
      }
      if (existing.status === "lead" && existing.estagio !== "perdido") {
        return NextResponse.json(
          {
            error: `CNPJ já possui oportunidade em andamento com ${
              existing.sdr_responsavel_nome || "outro operador"
            }. Prospecção concorrente bloqueada.`,
          },
          { status: 409 }
        );
      }
    }

    const {
      id: _id,
      cnpj_raiz: _raiz,
      created_at: _created,
      updated_at: _updated,
      stage_history: _history,
      fechado_em: _fechado,
      ...rest
    } = body;

    const dbPayload = {
      ...rest,
      cnpj: clean,
      cnpj_formatado: formatCNPJ(clean),
      sdr_responsavel_nome: body.sdr_responsavel_nome || auth.session.nome,
    };

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .insert(dbPayload)
      .select()
      .single();

    if (!error && data) {
      return NextResponse.json({ data }, { status: 201 });
    }

    if (error && "observacoes_importantes" in dbPayload) {
      const { observacoes_importantes: _obs, ...withoutNotes } = dbPayload;
      const retry = await supabaseAdmin
        .from("accounts")
        .insert(withoutNotes)
        .select()
        .single();

      if (!retry.error && retry.data) {
        return NextResponse.json({ data: retry.data }, { status: 201 });
      }
      return NextResponse.json(
        { error: retry.error?.message || "Erro ao salvar conta no banco." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Erro ao salvar conta no banco." },
      { status: 400 }
    );
  } catch (err) {
    console.error("Erro em POST /api/accounts:", err);
    return NextResponse.json(
      { error: "Erro interno ao criar conta." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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
    const id = String(body?.id || "").trim();
    const updates = (body?.updates || {}) as Partial<Account>;

    if (!id) {
      return NextResponse.json({ error: "ID da conta é obrigatório." }, { status: 400 });
    }

    const {
      id: _id,
      cnpj_raiz: _raiz,
      created_at: _created,
      stage_history: _history,
      fechado_em: _fechado,
      ...dbUpdates
    } = updates;

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (!error) {
      return NextResponse.json({ data });
    }

    if ("observacoes_importantes" in dbUpdates || "kanban_order" in dbUpdates) {
      const { observacoes_importantes: _obs, kanban_order: _ko, ...fallbackUpdates } = dbUpdates;
      if (Object.keys(fallbackUpdates).length > 0) {
        const retry = await supabaseAdmin
          .from("accounts")
          .update(fallbackUpdates)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (!retry.error) {
          return NextResponse.json({ data: retry.data });
        }
      }
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  } catch (err) {
    console.error("Erro em PATCH /api/accounts:", err);
    return NextResponse.json({ error: "Erro interno ao atualizar conta." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireSession();
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
    return NextResponse.json({ error: "ID da conta é obrigatório." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("accounts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
