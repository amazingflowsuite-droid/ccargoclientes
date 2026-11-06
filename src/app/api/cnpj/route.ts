import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawCnpj = searchParams.get("cnpj") || "";
  const cleanCnpj = rawCnpj.replace(/\D/g, "");

  if (cleanCnpj.length !== 14) {
    return NextResponse.json(
      { error: "CNPJ deve conter exatamente 14 dígitos numéricos." },
      { status: 400 }
    );
  }

  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  // Tentativa 1: BrasilAPI com User-Agent adequado
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        success: true,
        data: {
          cnpj: data.cnpj,
          razao_social: data.razao_social || "",
          nome_fantasia: data.nome_fantasia || "",
          cnae_fiscal: data.cnae_fiscal || 0,
          cnae_fiscal_descricao: data.cnae_fiscal_descricao || "",
          descricao_situacao_cadastral: data.descricao_situacao_cadastral || "ATIVA",
          logradouro: data.logradouro || "",
          numero: data.numero || "",
          complemento: data.complemento || "",
          bairro: data.bairro || "",
          municipio: data.municipio || "",
          uf: data.uf || "",
          cep: data.cep || "",
          ddd_telefone_1: data.ddd_telefone_1 || "",
        },
      });
    }
  } catch (err) {
    console.warn("BrasilAPI falhou ou timeout, tentando fallback MinhaReceita...", err);
  }

  // Tentativa 2: Fallback resiliente (MinhaReceita)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://minhareceita.org/${cleanCnpj}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        success: true,
        data: {
          cnpj: data.cnpj,
          razao_social: data.razao_social || "",
          nome_fantasia: data.nome_fantasia || "",
          cnae_fiscal: data.cnae_fiscal || 0,
          cnae_fiscal_descricao: data.cnae_fiscal_descricao || "",
          descricao_situacao_cadastral: data.descricao_situacao_cadastral || "ATIVA",
          logradouro: data.logradouro || "",
          numero: data.numero || "",
          complemento: data.complemento || "",
          bairro: data.bairro || "",
          municipio: data.municipio || "",
          uf: data.uf || "",
          cep: data.cep || "",
          ddd_telefone_1: data.ddd_telefone_1 || data.telefone || "",
        },
      });
    }
  } catch (err) {
    console.error("Falha em todos os provedores de CNPJ:", err);
  }

  return NextResponse.json(
    { error: "Não foi possível consultar os dados do CNPJ na Receita Federal no momento." },
    { status: 502 }
  );
}

