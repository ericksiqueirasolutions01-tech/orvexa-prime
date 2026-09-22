import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { executeAgentTool, OFFICIAL_AGENTS } from "@/lib/agents-hub";
import { checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // REGRA ESTRITA: Apenas usuários com status ACTIVE ou ADMIN podem acionar ferramentas
    if (user.status !== "ACTIVE" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso bloqueado: assinatura com pagamento pendente de confirmação via webhook." },
        { status: 403 }
      );
    }

    // RATE LIMITING: Máximo 30 execuções de ferramentas por minuto por usuário
    const rateCheck = checkRateLimit(`agent-tools:${user.id}`, 30, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Limite de requisições excedido. Tente novamente em ${rateCheck.resetInSeconds} segundos.` },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.resetInSeconds),
            "X-RateLimit-Limit": String(rateCheck.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const body = await req.json();
    const { agentSlug, toolId, input } = body;

    if (!agentSlug || !toolId || !input) {
      return NextResponse.json(
        { error: "agentSlug, toolId e input são obrigatórios." },
        { status: 400 }
      );
    }

    const agent = OFFICIAL_AGENTS.find((a) => a.slug === agentSlug);
    if (!agent) {
      return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
    }

    const tool = agent.tools.find((t) => t.id === toolId);
    if (!tool) {
      return NextResponse.json({ error: "Ferramenta não encontrada." }, { status: 404 });
    }

    const result = executeAgentTool(agentSlug, toolId, input);

    return NextResponse.json(
      {
        success: true,
        agentName: agent.name,
        toolName: tool.name,
        result,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rateCheck.limit),
          "X-RateLimit-Remaining": String(rateCheck.remaining),
        },
      }
    );
  } catch (error: any) {
    console.error("[Agent Tool Execution Error]:", error);
    return NextResponse.json(
      { error: "Erro ao executar ferramenta: " + error.message },
      { status: 500 }
    );
  }
}
