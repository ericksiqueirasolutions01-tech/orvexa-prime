import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeAiGatewayStream, ChatMessageInput } from "@/lib/ai-gateway";
import { buildAgentMemoryContextPrompt, extractAndSaveAgentFacts } from "@/ai/agents/agent-memory";
import { dispatchAutonomousAgentTool } from "@/ai/agents/tool-dispatcher";
import { retrieveUnifiedMemoryContext } from "@/ai/memory/semantic-search";
import { extractAndSaveFactsFromConversation } from "@/ai/memory/user-memory";
import { indexConversation } from "@/ai/memory/conversation-indexer";
import { checkUserTokenQuota, checkModelAccess } from "@/lib/plan-limits";

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

    // 1. Verificação de Quota de Tokens do Usuário via serviço centralizado
    const quotaStatus = await checkUserTokenQuota(session.id);
    if (!quotaStatus.hasQuota) {
      return NextResponse.json(
        {
          error: `Limite de tokens do seu plano (${quotaStatus.planName}) atingido neste ciclo (${quotaStatus.usedTokens.toLocaleString()} / ${quotaStatus.maxTokens.toLocaleString()}). Faça upgrade para continuar utilizando IA.`,
          quotaExceeded: true,
          quotaStatus,
        },
        { status: 403 }
      );
    }

    // 2. Verificação de Acesso ao Modelo solicitado
    if (modelPreference && modelPreference !== "orvexa-prime") {
      const modelAccess = await checkModelAccess(session.id, modelPreference);
      if (!modelAccess.allowed) {
        return NextResponse.json(
          {
            error: `O modelo "${modelPreference}" não está disponível no plano ${modelAccess.planName}. Faça upgrade para acessar este modelo.`,
            planUpgradeRequired: true,
          },
          { status: 403 }
        );
      }
    }

    const lastUserMessage = messages.filter((m: ChatMessageInput) => m.role === "user").slice(-1)[0];

    // 2. Busca informações do Agente se selecionado (suporta tanto UUID quanto slug)
    let systemPrompt: string | undefined;
    let effectiveModelPreference = modelPreference;
    let resolvedAgentId: string | null = null;
    let autoToolBadge: string | undefined;

    if (agentId) {
      const agent = await prisma.agent.findFirst({
        where: {
          OR: [{ id: agentId }, { slug: agentId }],
        },
        include: { preferredModel: true },
      });

      if (agent) {
        // Validação de status ativo
        if (!agent.isActive && session.role !== "ADMIN") {
          return NextResponse.json(
            { error: `O especialista "${agent.name}" está temporariamente desativado.` },
            { status: 403 }
          );
        }

        // Validação de permissões por plano/role
        let allowedRoles: string[] = ["USER", "ADMIN"];
        let allowedPlans: string[] = ["ALL"];
        try {
          allowedRoles = JSON.parse(agent.allowedRoles || "[\"USER\",\"ADMIN\"]");
        } catch {}
        try {
          allowedPlans = JSON.parse(agent.allowedPlans || "[\"ALL\"]");
        } catch {}

        const userRecord = await prisma.user.findUnique({
          where: { id: session.id },
          include: { plan: true },
        });
        const planSlug = userRecord?.plan?.slug?.toUpperCase() || "FREE";

        const hasAccess =
          (allowedRoles.includes(session.role) &&
            (allowedPlans.includes("ALL") || allowedPlans.includes(planSlug))) ||
          session.role === "ADMIN";

        if (!hasAccess) {
          return NextResponse.json(
            {
              error: `O agente ${agent.name} está disponível exclusivamente para os planos: ${allowedPlans.join(", ")}. Faça upgrade da sua conta.`,
            },
            { status: 403 }
          );
        }

        resolvedAgentId = agent.id;
        systemPrompt = agent.systemPrompt;

        // Injeta a memória dedicada do agente sobre o usuário
        const agentMemoryContext = await buildAgentMemoryContextPrompt(agent.id, session.id);
        if (agentMemoryContext) {
          systemPrompt += `\n${agentMemoryContext}`;
        }

        if (agent.preferredModel && modelPreference === "orvexa-prime") {
          effectiveModelPreference = agent.preferredModel.modelIdentifier;
        }

        // Despacho Autônomo de Ferramentas
        if (lastUserMessage) {
          let agentTools: any[] = [];
          try {
            agentTools = JSON.parse(agent.tools || "[]");
          } catch {}

          const autoToolResult = dispatchAutonomousAgentTool(
            agent.slug,
            agentTools,
            lastUserMessage.content
          );

          if (autoToolResult.executed && autoToolResult.result) {
            autoToolBadge = autoToolResult.diagnosticBadge;
            systemPrompt += `\n\n[FERRAMENTA ESPECIALIZADA ACIONADA AUTOMATICAMENTE PELO AGENTE]:
Ferramenta: ${autoToolResult.tool?.name}
Resultado Gerado:
${autoToolResult.result.output}

INSTRUÇÃO PARA SUA RESPOSTA:
Apresente o resultado gerado acima para o usuário de forma profissional, enriquecendo com sua análise técnica e orientações práticas de acordo com sua especialidade (${agent.name}).`;
          }

          // Aprende fatos novos para a memória dedicada em background
          extractAndSaveAgentFacts(agent.id, session.id, agent.slug, lastUserMessage.content).catch(() => {});
        }
      }
    }

    // 3. Salva ou atualiza a conversa e a mensagem do usuário com validação de FK
    let activeConvId = conversationId;

    // Validação estrita: se activeConvId foi enviado, confirma que existe no banco
    if (activeConvId) {
      const existingConv = await prisma.conversation.findUnique({
        where: { id: activeConvId },
      });
      if (!existingConv) {
        activeConvId = null;
      }
    }

    if (!activeConvId) {
      const newConv = await prisma.conversation.create({
        data: {
          userId: session.id,
          agentId: resolvedAgentId,
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

    // 4. Recuperação Semântica Unificada (RAG Inteligente)
    if (lastUserMessage) {
      const memoryContext = await retrieveUnifiedMemoryContext({
        userId: session.id,
        query: lastUserMessage.content,
        conversationId: activeConvId,
        limit: 5,
      });

      if (memoryContext) {
        systemPrompt = (systemPrompt || "") + memoryContext;
      }

      // Aprende novos fatos do usuário em background
      extractAndSaveFactsFromConversation(session.id, lastUserMessage.content).catch(() => {});

      // Indexa a conversa em background para manter a memória atualizada
      if (activeConvId) {
        indexConversation(activeConvId).catch(() => {});
      }
    }

    // 5. Executa chamada no AI Gateway com failover e balanceamento
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
        "x-orvexa-auto-tool": autoToolBadge ? encodeURIComponent(autoToolBadge) : "",
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

