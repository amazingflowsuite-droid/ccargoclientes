import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AppUser, UserRole } from "@/types";

export const SESSION_COOKIE_NAME = "ccargo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export interface SessionPayload {
  id: string;
  nome: string;
  email: string;
  perfil: UserRole;
  exp: number;
}

function getSigningSecret(): string {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "ccargo-dev-fallback-secret"
  );
}

function signData(data: string): string {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(data)
    .digest("base64url");
}

export function createSessionToken(user: Pick<AppUser, "id" | "nome" | "email" | "perfil">): string {
  const payload: SessionPayload = {
    id: user.id,
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signData(encoded);
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = signData(encoded);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!parsed?.id || !parsed?.email || !parsed?.perfil) return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(
  response: NextResponse,
  user: Pick<AppUser, "id" | "nome" | "email" | "perfil">
): void {
  const token = createSessionToken(user);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function getServerSession(): SessionPayload | null {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function requireSession():
  | { session: SessionPayload; errorResponse?: never }
  | { session?: never; errorResponse: NextResponse } {
  const session = getServerSession();
  if (!session) {
    return {
      errorResponse: NextResponse.json(
        { error: "Sessão inválida ou expirada. Faça login novamente." },
        { status: 401 }
      ),
    };
  }
  return { session };
}

export function requireGestor():
  | { session: SessionPayload; errorResponse?: never }
  | { session?: never; errorResponse: NextResponse } {
  const auth = requireSession();
  if (auth.errorResponse) return auth;
  if (auth.session.perfil !== "gestor") {
    return {
      errorResponse: NextResponse.json(
        { error: "Acesso restrito ao perfil Gestor." },
        { status: 403 }
      ),
    };
  }
  return { session: auth.session };
}

export function sanitizeUser(user: Partial<AppUser> & Record<string, unknown>): AppUser {
  return {
    id: String(user.id || ""),
    nome: String(user.nome || ""),
    email: String(user.email || ""),
    perfil: (user.perfil as UserRole) || "comercial",
    status_senha: (user.status_senha as AppUser["status_senha"]) || "ativa",
    ativo: Boolean(user.ativo ?? true),
    created_at: String(user.created_at || new Date().toISOString()),
  };
}
