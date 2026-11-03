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
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "CNPJ não encontrado na base da Receita Federal." };
      }
      return { success: false, error: `Falha na consulta da BrasilAPI (Código ${response.status}).` };
    }

    const data: BrasilAPICompanyResponse = await response.json();
    return { success: true, data };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Tempo limite esgotado ao consultar a BrasilAPI." };
    }
    return { success: false, error: "Não foi possível conectar ao serviço de consulta de CNPJ." };
  }
}

