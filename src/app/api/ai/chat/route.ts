import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeAiGatewayStream, ChatMessageInput } from "@/lib/ai-gateway";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    if (session.status !== "ACTIVE" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Assinatura inativa ou com pagamento pendente." },
        { status: 403 }
      );
    }

    const {
      messages,
      conversationId,
      modelPreference = "orvexa-prime",
      agentId,
      hasFiles = false,
    } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Nenhuma mensagem enviada." }, { status: 400 });
    }

    // 1. Verificação de Quota de Tokens do Usuário (se não for ADMIN)
    if (session.role !== "ADMIN") {
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        include: { plan: true },
      });

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usageAgg = await prisma.usageLog.aggregate({
        where: {
          userId: session.id,
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalTokens: true },
      });

      const used = usageAgg._sum.totalTokens || 0;
      const quota = user?.plan?.monthlyTokens || 0;

      if (quota > 0 && used >= quota) {
        return NextResponse.json(
          {
            error: "Limite de tokens do seu plano atingido neste ciclo. Faça upgrade do seu plano.",
            quotaExceeded: true,
          },
          { status: 403 }
        );
      }
    }

    // 2. Busca informações do Agente se selecionado
    let systemPrompt: string | undefined;
    let effectiveModelPreference = modelPreference;

    if (agentId) {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: { preferredModel: true },
      });

      if (agent) {
        systemPrompt = agent.systemPrompt;
        if (agent.preferredModel && modelPreference === "orvexa-prime") {
          effectiveModelPreference = agent.preferredModel.modelIdentifier;
        }
      }
    }

    // 3. Salva ou atualiza a conversa e a mensagem do usuário
    let activeConvId = conversationId;
    const lastUserMessage = messages.filter((m: ChatMessageInput) => m.role === "user").slice(-1)[0];

    if (!activeConvId) {
      const newConv = await prisma.conversation.create({
        data: {
          userId: session.id,
          agentId: agentId || null,
          title: lastUserMessage ? lastUserMessage.content.slice(0, 45) + "..." : "Nova Conversa",
          modelPreference: effectiveModelPreference,
        },
      });
      activeConvId = newConv.id;
    }

    if (lastUserMessage) {
      await prisma.message.create({
        data: {
          conversationId: activeConvId,
          role: "USER",
          content: lastUserMessage.content,
          tokensIn: Math.ceil(lastUserMessage.content.length / 4),
        },
      });
    }

    // 4. Executa chamada no AI Gateway com failover e balanceamento
    const gatewayResult = await executeAiGatewayStream({
      userId: session.id,
      userRole: session.role,
      messages,
      selectedModelPreference: effectiveModelPreference,
      systemPrompt,
      hasFiles,
    });

    // Retorna streaming com headers diagnósticos do Gateway
    return new Response(gatewayResult.stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "x-orvexa-conversation-id": activeConvId,
        "x-orvexa-intent": gatewayResult.decision.intent,
        "x-orvexa-model": gatewayResult.decision.modelName,
        "x-orvexa-failover": gatewayResult.isFailover ? "true" : "false",
        "x-orvexa-key-status": gatewayResult.apiKeyName?.includes("Fallback") ? "fallback" : "live",
      },
    });
  } catch (error: any) {
    console.error("[AI Chat API Error]", error);
    return NextResponse.json(
      { error: error.message || "Erro no processamento do AI Gateway." },
      { status: 500 }
    );
  }
}

