import { BrasilAPICompanyResponse } from "@/types";
import { cleanCNPJ } from "./utils";

export async function fetchCompanyByCNPJ(rawCnpj: string): Promise<{
  success: boolean;
  data?: BrasilAPICompanyResponse;
  error?: string;
}> {
  const cnpj = cleanCNPJ(rawCnpj);
  if (cnpj.length !== 14) {
    return { success: false, error: "CNPJ deve conter exatamente 14 dígitos." };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    // Consulta através da rota interna do Next.js (Serverless Proxy)
    // Isso evita bloqueios de CORS, adblockers e Cloudflare 403 no navegador
    const response = await fetch(`/api/cnpj?cnpj=${cnpj}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    const json = await response.json();

    if (!response.ok || !json.success) {
      return {
        success: false,
        error: json.error || "Não foi possível carregar os dados cadastrais da empresa.",
      };
    }

    return {
      success: true,
      data: json.data as BrasilAPICompanyResponse,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Tempo limite esgotado ao consultar dados da Receita." };
    }
    return { success: false, error: "Não foi possível conectar ao serviço de consulta de CNPJ." };
  }
}
