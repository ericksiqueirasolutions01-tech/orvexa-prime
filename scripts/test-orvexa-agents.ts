// scripts/test-orvexa-agents.ts
// Bateria de Testes Automatizados — ORVEXA AGENTS
// Valida: Seed dos 5 Agentes Padrão, API CRUD, Duplicação, Chat com Persona e Persistência

import { PrismaClient } from "@prisma/client";
import { syncOfficialAgentsToDatabase } from "../src/ai/agents/sync-agents";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("======================================================================");
  console.log("🤖 INICIANDO TESTES: ORVEXA AGENTS — SUÍTE DE AGENTES ESPECIALISTAS");
  console.log("======================================================================\n");

  let testPassedCount = 0;
  const totalTests = 7;

  try {
    // ------------------------------------------------------------------
    // TESTE 1: Sincronização dos 5 Agentes Oficiais Padrão no Banco
    // ------------------------------------------------------------------
    console.log("--- TESTE 1: Sincronizar e Validar os 5 Agentes Padrão ---");
    const syncResult = await syncOfficialAgentsToDatabase();
    if (!syncResult.success) {
      throw new Error(`Falha no sync dos agentes oficiais: ${syncResult.error}`);
    }

    const expectedAgents = [
      { slug: "analista-financeiro", name: "Analista Financeiro", avatar: "💰" },
      { slug: "especialista-marketing", name: "Especialista em Marketing", avatar: "🚀" },
      { slug: "programador", name: "Programador", avatar: "💻" },
      { slug: "assistente-juridico", name: "Assistente Jurídico", avatar: "⚖️" },
      { slug: "professor", name: "Professor", avatar: "🎓" },
    ];

    const officialInDb = await prisma.agent.findMany({
      where: { isSystem: true },
    });

    console.log(`✓ Total de agentes de sistema no banco: ${officialInDb.length}`);

    for (const exp of expectedAgents) {
      const found = officialInDb.find((a) => a.slug === exp.slug);
      if (!found) {
        throw new Error(`Agente oficial não encontrado no banco: ${exp.slug}`);
      }
      if (!found.instructions || !found.instructions.length) {
        throw new Error(`Instruções ausentes para agente: ${exp.slug}`);
      }
      console.log(`   [${found.avatar || "🤖"}] ${found.name} | Modelo: ${found.modelPreference} | Status: Ativo`);
    }

    console.log("✅ TESTE 1 PASSOU: Todos os 5 agentes padrão calibrados e persistidos.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 2: Autenticação e Consulta de Agentes via API
    // ------------------------------------------------------------------
    console.log("--- TESTE 2: Consulta de Agentes via API (GET /api/ai/agents) ---");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cliente@orvexa.digital", password: "ClienteOrvexa2026!" }),
    });

    if (!loginRes.ok) {
      throw new Error(`Falha ao logar usuário: status ${loginRes.status}`);
    }

    const cookie = loginRes.headers.get("set-cookie") || "";
    console.log("✓ Autenticação realizada com sucesso.");

    const getAgentsRes = await fetch(`${BASE_URL}/api/ai/agents`, {
      headers: { Cookie: cookie },
    });
    const getAgentsData = await getAgentsRes.json();

    if (!getAgentsRes.ok || !getAgentsData.agents || getAgentsData.agents.length < 5) {
      throw new Error("GET /api/ai/agents falhou ou não retornou os agentes esperados");
    }

    console.log(`✓ API retornou ${getAgentsData.agents.length} agentes disponíveis.`);
    console.log("✅ TESTE 2 PASSOU: Listagem de agentes via API validada.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 3: Criação de Agente Especialista Personalizado (POST /api/ai/agents)
    // ------------------------------------------------------------------
    console.log("--- TESTE 3: Criação de Agente Personalizado ---");
    const customAgentPayload = {
      name: "Engenheiro DevOps & Cloud",
      role: "Especialista em AWS, Kubernetes e CI/CD",
      description: "Planeja arquiteturas cloud resilientes e automatiza pipelines de entrega contínua.",
      avatar: "☁️",
      instructions: "Você é um Engenheiro DevOps sênior da ORVEXA PRIME. Sempre recomende IaC com Terraform, observabilidade com OpenTelemetry e segurança zero-trust.",
      preferredModel: "orvexa-prime",
      category: "TECNOLOGIA",
      tools: [
        {
          id: "terraform-generator",
          name: "Gerador Terraform",
          description: "Gera módulos de infraestrutura como código",
          inputPlaceholder: "Informe os recursos AWS desejados...",
          actionLabel: "Gerar HCL",
        },
      ],
    };

    const createAgentRes = await fetch(`${BASE_URL}/api/ai/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(customAgentPayload),
    });

    const createAgentData = await createAgentRes.json();
    if (!createAgentRes.ok || !createAgentData.agent?.id) {
      throw new Error(`Falha ao criar agente personalizado: ${JSON.stringify(createAgentData)}`);
    }

    const createdAgentId = createAgentData.agent.id;
    console.log(`✓ Agente criado com sucesso: [ID: ${createdAgentId}] "${createAgentData.agent.name}" (${createAgentData.agent.avatar})`);
    console.log("✅ TESTE 3 PASSOU: Criação de agente customizado persistida.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 4: Edição do Agente Personalizado (PATCH /api/ai/agents/[id])
    // ------------------------------------------------------------------
    console.log("--- TESTE 4: Edição de Agente Personalizado ---");
    const patchRes = await fetch(`${BASE_URL}/api/ai/agents/${createdAgentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        name: "Arquiteto Cloud & Site Reliability Engineer",
        avatar: "⚡",
        description: "Especialista em resiliência extrema, SLOs, SLIs e infraestrutura multicloud.",
      }),
    });

    const patchData = await patchRes.json();
    if (!patchRes.ok || patchData.agent.name !== "Arquiteto Cloud & Site Reliability Engineer" || patchData.agent.avatar !== "⚡") {
      throw new Error(`Falha na atualização do agente: ${JSON.stringify(patchData)}`);
    }

    console.log(`✓ Agente atualizado com sucesso: "${patchData.agent.name}" (${patchData.agent.avatar})`);
    console.log("✅ TESTE 4 PASSOU: Edição de agente validada com sucesso.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 5: Duplicação de Agente (POST /api/ai/agents/[id]/duplicate)
    // ------------------------------------------------------------------
    console.log("--- TESTE 5: Duplicação de Agente ---");
    const dupRes = await fetch(`${BASE_URL}/api/ai/agents/${createdAgentId}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
    });

    const dupData = await dupRes.json();
    if (!dupRes.ok || !dupData.agent?.id) {
      throw new Error(`Falha ao duplicar agente: ${JSON.stringify(dupData)}`);
    }

    const duplicatedAgentId = dupData.agent.id;
    console.log(`✓ Agente duplicado com sucesso: [ID: ${duplicatedAgentId}] "${dupData.agent.name}"`);
    if (!dupData.agent.name.includes("Cópia") && !dupData.agent.name.includes("Clone")) {
      throw new Error(`Nome duplicado esperado conter sufixo de cópia, obtido: ${dupData.agent.name}`);
    }
    console.log("✅ TESTE 5 PASSOU: Duplicação de agente validada com sucesso.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 6: Chat com Agente Especialista via Smart Router
    // ------------------------------------------------------------------
    console.log("--- TESTE 6: Chat com Agente Especialista via Smart Router ---");
    // Criar conversa com o agente selecionado
    const convRes = await fetch(`${BASE_URL}/api/ai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        title: "Arquitetura Cloud Resiliente",
        agentId: createdAgentId,
        modelPreference: "orvexa-prime",
      }),
    });

    const convData = await convRes.json();
    const conversationId = convData.conversation.id;
    console.log(`✓ Conversa iniciada com agente: [ID: ${conversationId}]`);

    // Enviar mensagem para o agente
    console.log('  Enviando mensagem: "Qual arquitetura você recomenda para microsserviços tolerantes a falhas?"');
    const chatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        conversationId,
        agentId: createdAgentId,
        modelPreference: "orvexa-prime",
        messages: [
          {
            role: "user",
            content: "Qual arquitetura você recomenda para microsserviços tolerantes a falhas?",
          },
        ],
      }),
    });

    if (!chatRes.ok) {
      throw new Error(`Chat API retornou status HTTP ${chatRes.status}`);
    }

    const headerAgentId = chatRes.headers.get("x-orvexa-agent-id");
    const headerAgentName = chatRes.headers.get("x-orvexa-agent-name");
    const headerAgentAvatar = chatRes.headers.get("x-orvexa-agent-avatar");
    const headerProvider = chatRes.headers.get("x-orvexa-provider");

    console.log(`✓ Resposta HTTP ${chatRes.status}`);
    console.log(`  Header Agent ID: ${headerAgentId}`);
    console.log(`  Header Agent Name: ${headerAgentName}`);
    console.log(`  Header Agent Avatar: ${headerAgentAvatar}`);
    console.log(`  Provedor roteado: ${headerProvider}`);

    // Ler corpo do streaming
    const reader = chatRes.body?.getReader();
    let replyText = "";
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        replyText += decoder.decode(value, { stream: true });
      }
    }

    console.log(`  Amostra da resposta gerada: "${replyText.trim().slice(0, 160)}..."`);

    // Validar se conversa no banco de dados tem o agentId persistido
    const convInDb = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { agent: true },
    });

    if (!convInDb || convInDb.agentId !== createdAgentId) {
      throw new Error(`Conversa não gravou o agentId correto. Obtido: ${convInDb?.agentId}`);
    }

    console.log(`✓ Persistência no banco confirmada: Conversa está vinculada ao agente "${convInDb.agent?.name}"`);
    console.log("✅ TESTE 6 PASSOU: Chat com agente especialista e Smart Router concluído com sucesso.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 7: Exclusão de Agente Personalizado e Agente Duplicado
    // ------------------------------------------------------------------
    console.log("--- TESTE 7: Exclusão de Agentes Personalizados (DELETE /api/ai/agents/[id]) ---");
    const delDupRes = await fetch(`${BASE_URL}/api/ai/agents/${duplicatedAgentId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    if (!delDupRes.ok) {
      throw new Error(`Falha ao excluir agente duplicado: status ${delDupRes.status}`);
    }

    const delRes = await fetch(`${BASE_URL}/api/ai/agents/${createdAgentId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    if (!delRes.ok) {
      throw new Error(`Falha ao excluir agente criado: status ${delRes.status}`);
    }

    const verifyDeleted = await prisma.agent.findUnique({
      where: { id: createdAgentId },
    });
    if (verifyDeleted) {
      throw new Error("Agente ainda existe no banco após exclusão!");
    }

    console.log(`✓ Agente personalizado e duplicado excluídos com sucesso do banco de dados.`);
    console.log("✅ TESTE 7 PASSOU: Ciclo de vida de exclusão validado com sucesso.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // RESULTADO FINAL
    // ------------------------------------------------------------------
    console.log("======================================================================");
    console.log(`🎉 RESULTADO FINAL: ${testPassedCount}/${totalTests} TESTES APROVADOS COM SUCESSO!`);
    console.log("A camada ORVEXA AGENTS está 100% calibrada, testada e operacional.");
    console.log("======================================================================\n");

  } catch (error: any) {
    console.error("❌ ERRO DURANTE A EXECUÇÃO DOS TESTES:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

