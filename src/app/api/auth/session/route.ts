import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";

export async function GET() {
  const session = getServerSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: session.id,
      nome: session.nome,
      email: session.email,
      perfil: session.perfil,
      ativo: true,
      status_senha: "ativa",
    },
  });
}
