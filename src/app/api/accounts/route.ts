import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireGestor, requireSession } from "@/lib/server-session";
import { cleanCNPJ, formatCNPJ } from "@/lib/utils";
import { extractDeactivationInfo, isRestrictiveDeactivation } from "@/lib/deactivation";
import { buildStageHistoryMapFromTransitions } from "@/lib/stage-history";
import { Account, LeadStage, StageTransition } from "@/types";

async function enrichAccountsWithStageHistory(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  accounts: Account[]
): Promise<Account[]> {
  if (accounts.length === 0) return [];
  const ids = accounts.map((a) => a.id);

  const { data: historyRows, error } = await supabaseAdmin
    .from("account_stage_history")
    .select("*")
    .in("account_id", ids)
    .order("created_at", { ascending: true });

  if (error || !historyRows) {
    return accounts;
  }

  const byAccount = new Map<string, StageTransition[]>();
  for (const row of historyRows as StageTransition[]) {
    const list = byAccount.get(row.account_id) || [];
    list.push(row);
    byAccount.set(row.account_id, list);
  }

  return accounts.map((acc) => {
    const transitions = byAccount.get(acc.id) || [];
    const { stage_history, fechado_em } = buildStageHistoryMapFromTransitions(
      transitions,
      acc
    );
    return {
      ...acc,
      stage_transitions: transitions,
      stage_history,
      fechado_em: acc.fechado_em || fechado_em,
    };
  });
}

async function recordStageHistoryEvent(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  params: {
    account_id: string;
    from_stage?: LeadStage | string | null;
    to_stage: LeadStage | string;
    from_status?: string | null;
    to_status: string;
    usuario_nome: string;
    motivo?: string | null;
  }
): Promise<void> {
  try {
    await supabaseAdmin.from("account_stage_history").insert({
      account_id: params.account_id,
      from_stage: params.from_stage ?? null,
      to_stage: params.to_stage,
      from_status: params.from_status ?? null,
      to_status: params.to_status,
      usuario_nome: params.usuario_nome,
      motivo: params.motivo ?? null,
    });
  } catch (err) {
    console.warn("Aviso ao registrar histórico de estágio:", err);
  }
}

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
    if (!data) {
      return NextResponse.json({ data: null });
    }
    const [enriched] = await enrichAccountsWithStageHistory(supabaseAdmin, [data as Account]);
    return NextResponse.json({ data: enriched });
  }

  const { data, error } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const enriched = await enrichAccountsWithStageHistory(
    supabaseAdmin,
    (data || []) as Account[]
  );
  return NextResponse.json({ data: enriched });
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
      .select("*")
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
            error: `CNPJ já possui oportunidade em andamento com ${existing.sdr_responsavel_nome || "outro operador"
              }. Prospecção concorrente bloqueada.`,
          },
          { status: 409 }
        );
      }
      if (existing.status === "ex_cliente") {
        const deact = extractDeactivationInfo(existing as Partial<Account>);
        if (isRestrictiveDeactivation(deact.reason) && auth.session.perfil !== "gestor") {
          return NextResponse.json(
            {
              error:
                "Este ex-cliente foi encerrado por motivo restritivo (inadimplência ou quebra de contrato). Apenas um Gestor pode autorizar nova prospecção.",
            },
            { status: 403 }
          );
        }
      }
    }

    const {
      id: _id,
      cnpj_raiz: _raiz,
      created_at: _created,
      updated_at: _updated,
      stage_history: _history,
      stage_transitions: _transitions,
      fechado_em: _fechado,
      ...rest
    } = body;

    const dbPayload = {
      ...rest,
      cnpj: clean,
      cnpj_formatado: formatCNPJ(clean),
      sdr_responsavel_nome: body.sdr_responsavel_nome || auth.session.nome,
    };

    const query = existing
      ? supabaseAdmin.from("accounts").update(dbPayload).eq("id", existing.id).select().single()
      : supabaseAdmin.from("accounts").insert(dbPayload).select().single();

    const { data, error } = await query;

    if (!error && data) {
      const createdAcc = data as Account;
      await recordStageHistoryEvent(supabaseAdmin, {
        account_id: createdAcc.id,
        from_stage: existing ? existing.estagio : null,
        to_stage:
          createdAcc.estagio ||
          (createdAcc.status === "cliente_ativo" ? "fechado_ganho" : "prospeccao_inicial"),
        from_status: existing ? existing.status : null,
        to_status: createdAcc.status,
        usuario_nome: auth.session.nome,
        motivo: existing ? "Reativação / Nova prospecção" : "Card criado no funil",
      });
      const [enriched] = await enrichAccountsWithStageHistory(supabaseAdmin, [createdAcc]);
      return NextResponse.json({ data: enriched }, { status: 201 });
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

    const { data: prevAccount } = await supabaseAdmin
      .from("accounts")
      .select("estagio, status")
      .eq("id", id)
      .maybeSingle();

    // Governança: apenas Gestor pode desativar cliente ativo ou reativar ex-cliente
    if (updates.status === "ex_cliente") {
      const gestorAuth = requireGestor();
      if (gestorAuth.errorResponse) return gestorAuth.errorResponse;
    } else if (updates.status === "cliente_ativo" && prevAccount?.status === "ex_cliente") {
      const gestorAuth = requireGestor();
      if (gestorAuth.errorResponse) return gestorAuth.errorResponse;
    }

    const {
      id: _id,
      cnpj_raiz: _raiz,
      created_at: _created,
      stage_history: _history,
      stage_transitions: _transitions,
      fechado_em: _fechado,
      ...dbUpdates
    } = updates;

    const finalizePatchResponse = async (updatedRow: Account | null) => {
      if (!updatedRow) {
        return NextResponse.json({ data: null });
      }
      const prevStage = prevAccount?.estagio ?? null;
      const prevStatus = prevAccount?.status ?? null;
      const nextStage = updatedRow.estagio || prevStage || "prospeccao_inicial";
      const nextStatus = updatedRow.status;

      if (prevAccount && (prevStage !== updatedRow.estagio || prevStatus !== nextStatus)) {
        const motivo =
          updates.detalhe_desqualificacao ||
          updates.motivo_desqualificacao ||
          updates.detalhe_desativacao ||
          updates.motivo_desativacao ||
          null;
        await recordStageHistoryEvent(supabaseAdmin, {
          account_id: id,
          from_stage: prevStage,
          to_stage: nextStage,
          from_status: prevStatus,
          to_status: nextStatus,
          usuario_nome: auth.session.nome,
          motivo,
        });
      }

      const [enriched] = await enrichAccountsWithStageHistory(supabaseAdmin, [updatedRow]);
      return NextResponse.json({ data: enriched });
    };

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (!error) {
      return finalizePatchResponse(data as Account | null);
    }

    if (
      "motivo_desativacao" in dbUpdates ||
      "detalhe_desativacao" in dbUpdates ||
      "data_desativacao" in dbUpdates
    ) {
      const {
        motivo_desativacao,
        detalhe_desativacao,
        data_desativacao,
        ...restUpdates
      } = dbUpdates;
      const encodedDetail = motivo_desativacao
        ? `[${motivo_desativacao}] ${detalhe_desativacao || ""}`.trim()
        : detalhe_desativacao;
      const fallbackUpdates = {
        ...restUpdates,
        ...(encodedDetail !== undefined ? { detalhe_desqualificacao: encodedDetail } : {}),
        ...(data_desativacao !== undefined ? { data_desqualificacao: data_desativacao } : {}),
      };
      const retry = await supabaseAdmin
        .from("accounts")
        .update(fallbackUpdates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (!retry.error) {
        return finalizePatchResponse(retry.data as Account | null);
      }
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
          return finalizePatchResponse(retry.data as Account | null);
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
