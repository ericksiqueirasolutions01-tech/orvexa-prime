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
import { assertCanSendMessage, assertCanUseAgent, getUserConsumption, invalidateUserConsumptionCache } from "@/lib/consumption";

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
      projectId,
      hasFiles = false,
      fileCategory,
      fileSizeBytes,
      intent,
      fileIds,
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

    // 1.1 Verificação de Quota de Mensagens do Plano com cache L1
    const consumptionSummary = await getUserConsumption(session.id);
    const messageGuard = await assertCanSendMessage(session.id, consumptionSummary);
    if (!messageGuard.allowed) {
      return NextResponse.json(
        {
          error: messageGuard.reason,
          quotaExceeded: true,
          planUpgradeRequired: true,
          usage: messageGuard.usage,
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
    let resolvedAgent: any = null;
    let agentLinkedProjectId: string | null = null;
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
        if (!agent.isActive && session.role !== "ADMIN" && agent.userId !== session.id) {
          return NextResponse.json(
            { error: `O especialista "${agent.name}" está temporariamente desativado.` },
            { status: 403 }
          );
        }

        // Usuário dono do agente personalizado sempre tem acesso livre
        const isOwner = agent.userId === session.id;

        if (!isOwner && agent.isSystem) {
          let allowedRoles: string[] = ["USER", "ADMIN"];
          let allowedPlans: string[] = ["ALL"];
          try {
            allowedRoles = JSON.parse(agent.allowedRoles || "[\"USER\",\"ADMIN\"]");
          } catch {}
          try {
            allowedPlans = JSON.parse(agent.allowedPlans || "[\"ALL\"]");
          } catch {}

          const planSlug = consumptionSummary.plan.slug.toUpperCase();
          const hasAccess =
            (allowedRoles.includes(session.role) &&
              (allowedPlans.includes("ALL") || allowedPlans.includes(planSlug))) ||
            session.role === "ADMIN";

          const agentGuard = await assertCanUseAgent(session.id, agent.slug, consumptionSummary);
          if (!agentGuard.allowed) {
            return NextResponse.json(
              {
                error: agentGuard.reason,
                planUpgradeRequired: true,
              },
              { status: 403 }
            );
          }

          if (!hasAccess) {
            return NextResponse.json(
              {
                error: `O agente ${agent.name} está disponível exclusivamente para os planos: ${allowedPlans.join(", ")}. Faça upgrade da sua conta.`,
              },
              { status: 403 }
            );
          }
        }

        resolvedAgentId = agent.id;
        resolvedAgent = agent;
        agentLinkedProjectId = agent.projectId || null;
        systemPrompt = agent.instructions || agent.systemPrompt;

        // Injeta a memória dedicada do agente sobre o usuário
        const agentMemoryContext = await buildAgentMemoryContextPrompt(agent.id, session.id);
        if (agentMemoryContext) {
          systemPrompt += `\n${agentMemoryContext}`;
        }

        // Aplica modelo preferencial do agente se usuário não forçou outro
        if (modelPreference === "orvexa-prime" || !modelPreference) {
          if (agent.modelPreference && agent.modelPreference !== "orvexa-prime") {
            effectiveModelPreference = agent.modelPreference;
          } else if (agent.preferredModel) {
            effectiveModelPreference = agent.preferredModel.modelIdentifier;
          }
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
    let existingConvProjectId: string | null = null;

    // Validação estrita: se activeConvId foi enviado, confirma que existe no banco
    if (activeConvId) {
      const existingConv = await prisma.conversation.findUnique({
        where: { id: activeConvId },
      });
      if (!existingConv) {
        activeConvId = null;
      } else {
        existingConvProjectId = existingConv.projectId;
      }
    }

    const effectiveProjectId = projectId || existingConvProjectId || agentLinkedProjectId || null;

    if (!activeConvId) {
      const newConv = await prisma.conversation.create({
        data: {
          userId: session.id,
          agentId: resolvedAgentId,
          projectId: effectiveProjectId,
          title: lastUserMessage ? lastUserMessage.content.slice(0, 45) + "..." : "Nova Conversa",
          modelPreference: effectiveModelPreference,
        },
      });
      activeConvId = newConv.id;

      if (effectiveProjectId) {
        await prisma.projectConversation.create({
          data: {
            projectId: effectiveProjectId,
            conversationId: activeConvId,
          },
        }).catch(() => {});
      }
    }

    // 3.0 Vinculação e Injeção de Contexto de Arquivos Anexados nesta Conversa
    const attachedFileIds: string[] = Array.isArray(fileIds) ? fileIds.filter(Boolean) : [];

    // Se temos arquivos enviados nesta interação, vincula à conversa ativa
    if (attachedFileIds.length > 0 && activeConvId) {
      await prisma.file.updateMany({
        where: { id: { in: attachedFileIds }, userId: session.id },
        data: { conversationId: activeConvId },
      }).catch(() => {});
    }

    // Busca arquivos relevantes desta conversa ou passados explicitamente
    let relevantFiles: any[] = [];
    if (attachedFileIds.length > 0) {
      relevantFiles = await prisma.file.findMany({
        where: { id: { in: attachedFileIds }, userId: session.id },
      });
    } else if (hasFiles && activeConvId) {
      relevantFiles = await prisma.file.findMany({
        where: { conversationId: activeConvId, userId: session.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
    }

    if (relevantFiles.length > 0) {
      const filesContextBlock = relevantFiles
        .map((f) => {
          const content =
            f.extractedText && f.extractedText.trim().length > 0
              ? f.extractedText.trim()
              : `[Arquivo anexado: "${f.originalName}" (${f.mimeType || f.category}) - ${((f.fileSizeBytes || 0) / 1024).toFixed(1)} KB - processamento estruturado concluído]`;
          return `--- [ARQUIVO ANEXADO À CONVERSA: "${f.originalName}"] ---\nTipo/Formato: ${f.category || f.mimeType}\nTamanho: ${((f.fileSizeBytes || 0) / 1024).toFixed(1)} KB\n\nCONTEÚDO DO ARQUIVO:\n${content.slice(0, 35000)}\n--- [FIM DO ARQUIVO: "${f.originalName}"] ---`;
        })
        .join("\n\n");

      const fileDirective = `[DOCUMENTOS & ARQUIVOS ANEXADOS PELO USUÁRIO NESTA CONVERSA]:
O usuário anexou ${relevantFiles.length} arquivo(s) a esta conversa. O conteúdo textual extraído de cada um está fornecido abaixo com fidelidade total.
Utilize as informações destes documentos para responder com precisão técnica e detalhada a todas as solicitações, análises, resumos ou dúvidas do usuário sobre eles. NUNCA diga que o arquivo não consta ou que não foi recebido, pois os dados estão disponíveis acima.\n\n${filesContextBlock}`;

      systemPrompt = [fileDirective, systemPrompt].filter(Boolean).join("\n\n");
    }

    // 3.1 Injeção de Contexto do Projeto e Memória Contextual
    if (effectiveProjectId) {
      const project = await prisma.project.findFirst({
        where: { id: effectiveProjectId, userId: session.id },
        include: {
          memories: { orderBy: { createdAt: "desc" }, take: 25 },
          files: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });

      if (project) {
        const projectContextParts: string[] = [];
        projectContextParts.push(`[ESPAÇO DE TRABALHO / PROJETO ATIVO: "${project.name}"]`);
        if (project.description) {
          projectContextParts.push(`Descrição do Projeto: ${project.description}`);
        }
        if (project.customInstructions) {
          projectContextParts.push(`INSTRUÇÕES PERSONALIZADAS DO PROJETO:\n${project.customInstructions}`);
        }
        if (project.memories.length > 0) {
          projectContextParts.push(
            `MEMÓRIA CONTEXTUAL DO PROJETO:\n${project.memories.map((m) => `• ${m.content}`).join("\n")}`
          );
        }
        if (project.files.length > 0) {
          const filesSummary = project.files
            .map((f) => `• [Arquivo: ${f.fileName}]: ${f.extractedText ? f.extractedText.slice(0, 800) : "anexado ao projeto"}`)
            .join("\n");
          projectContextParts.push(`ARQUIVOS VINCULADOS AO PROJETO:\n${filesSummary}`);
        }
        projectContextParts.push(
          `DIRETRIZ OBRIGATÓRIA DO PROJETO:\nTodas as suas respostas neste projeto devem obrigatoriamente respeitar a memória contextual, o tom de voz e as diretrizes acima estabelecidas.`
        );

        systemPrompt = [projectContextParts.join("\n\n"), systemPrompt].filter(Boolean).join("\n\n");

        // Detecção conversacional de gravação na memória (ex: "Guarde que...", "Lembre-se que...")
        if (lastUserMessage) {
          const userText = lastUserMessage.content.trim();
          const memoryTriggers = [
            /^(?:guarde|salve|lembre-se|lembre|grave|anote|registre)\s+(?:que|de que|isso:?)\s+(.+)/i,
            /(?:guarde|salve|lembre-se|lembre|grave|anote|registre)\s+na\s+mem[óo]ria(?:\s+do\s+projeto)?(?::|\s+que|\s+de que|\s+isso:?)\s*(.+)/i,
          ];

          let extractedMemory: string | null = null;
          for (const regex of memoryTriggers) {
            const m = userText.match(regex);
            if (m && m[1]) {
              extractedMemory = m[1].trim();
              break;
            }
          }

          if (extractedMemory) {
            await prisma.projectMemory.create({
              data: {
                projectId: effectiveProjectId,
                userId: session.id,
                content: extractedMemory,
                category: "CONTEXT",
              },
            }).catch(() => {});

            systemPrompt += `\n\n[AVISO DE SISTEMA]: O usuário solicitou explicitamente registrar na memória contextual deste projeto o seguinte fato: "${extractedMemory}". Confirme com naturalidade e clareza que essa informação foi memorizada com sucesso para o projeto.`;
          }
        }
      }
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
      // Invalida cache de contagem de consumo do usuário em background
      invalidateUserConsumptionCache(session.id);
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

    // 5. Executa chamada no AI Gateway com Smart Router, failover e balanceamento
    const gatewayResult = await executeAiGatewayStream({
      userId: session.id,
      userRole: session.role,
      messages,
      selectedModelPreference: effectiveModelPreference,
      systemPrompt,
      hasFiles,
      fileCategory,
      fileSizeBytes,
      intent,
    });

    const isOrvexaAuto = effectiveModelPreference === "orvexa-prime" || !effectiveModelPreference;
    const routerBadge = isOrvexaAuto ? "ORVEXA escolheu a melhor IA para esta tarefa." : "";

    // Retorna streaming com headers diagnósticos do Gateway
    return new Response(gatewayResult.stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "x-orvexa-conversation-id": activeConvId,
        "x-orvexa-project-id": effectiveProjectId || "",
        "x-orvexa-intent": gatewayResult.decision.intent,
        "x-orvexa-model": isOrvexaAuto ? "ORVEXA AUTO" : gatewayResult.decision.modelName,
        "x-orvexa-router-badge": routerBadge ? encodeURIComponent(routerBadge) : "",
        "x-orvexa-failover": gatewayResult.isFailover ? "true" : "false",
        "x-orvexa-key-status": gatewayResult.apiKeyName?.includes("Fallback") ? "fallback" : "live",
        "x-orvexa-auto-tool": autoToolBadge ? encodeURIComponent(autoToolBadge) : "",
        "x-orvexa-agent-id": resolvedAgentId || "",
        "x-orvexa-agent-name": resolvedAgent ? encodeURIComponent(resolvedAgent.name) : "",
        "x-orvexa-agent-avatar": resolvedAgent?.avatar ? encodeURIComponent(resolvedAgent.avatar) : "",
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

