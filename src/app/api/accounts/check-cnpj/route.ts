import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireSession } from "@/lib/server-session";
import { cleanCNPJ, getCNPJRaiz } from "@/lib/utils";
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

  const rawCnpj = req.nextUrl.searchParams.get("cnpj") || "";
  const clean = cleanCNPJ(rawCnpj);
  const raiz = getCNPJRaiz(clean);

  if (clean.length !== 14) {
    return NextResponse.json({
      has_exact_collision: false,
      exact_match: null,
      has_related_collision: false,
      related_accounts: [],
    });
  }

  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("check_cnpj_collision", {
    p_cnpj: clean,
  });

  if (!rpcError && rpcData) {
    return NextResponse.json({
      has_exact_collision: Boolean(rpcData.has_exact_collision),
      exact_match: (rpcData.exact_match as Account | null) || null,
      has_related_collision: Boolean(rpcData.has_related_collision),
      related_accounts: (rpcData.related_accounts || []) as Account[],
    });
  }

  const { data: accounts, error } = await supabaseAdmin.from("accounts").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = (accounts || []) as Account[];
  const exactMatch = list.find((a) => cleanCNPJ(a.cnpj) === clean) || null;
  const relatedAccounts = list.filter((a) => {
    const accountRaiz = a.cnpj_raiz || getCNPJRaiz(a.cnpj);
    return accountRaiz === raiz && cleanCNPJ(a.cnpj) !== clean;
  });

  return NextResponse.json({
    has_exact_collision: Boolean(exactMatch),
    exact_match: exactMatch,
    has_related_collision: relatedAccounts.length > 0,
    related_accounts: relatedAccounts,
  });
}
