import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { OFFICIAL_AGENTS } from "@/lib/agents-hub";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      agents: OFFICIAL_AGENTS,
    });
  } catch (error: any) {
    console.error("[Agents GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao listar agentes: " + error.message },
      { status: 500 }
    );
  }
}
