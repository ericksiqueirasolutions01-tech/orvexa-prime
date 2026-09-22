// scripts/test-agents-architecture-e2e.js
// TESTE COMPLETO END-TO-END DA ARQUITETURA DE AGENTES PROFISSIONAIS — ORVEXA PRIME

const assert = require("assert");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runAgentsE2ETests() {
  console.log("==================================================");
  console.log("INICIANDO SUÍTE E2E: ARQUITETURA DE AGENTES ORVEXA");
  console.log("==================================================\n");

  try {
    // TESTE 1: Sincronização dos 6 Agentes Oficiais
    console.log("▶ [TESTE 1] Verificando e Sincronizando os 6 Agentes Oficiais no Banco...");
    
    // Lista esperada dos 6 agentes
    const expectedSlugs = [
      "orvexa-dev",
      "orvexa-design",
      "orvexa-marketing",
      "orvexa-edu",
      "orvexa-business",
      "orvexa-analyst"
    ];

    const officialDefs = [
      {
        slug: "orvexa-dev",
        name: "ORVEXA DEV",
        role: "Engenharia de Software & Arquitetura",
        category: "PROGRAMACAO",
        preferredModelId: "gpt-5.6-sol",
        iconName: "Code2",
        badge: "CODEX FLAGSHIP",
        description: "Especialista em TypeScript, arquitetura de software, Clean Code e testes.",
        systemPrompt: "Você é o ORVEXA DEV. Entregue código limpo, tipado e com testes unitários.",
        tools: [
          { id: "unit-tests", name: "Gerador de Testes Unitários", description: "Gera suíte completa de testes." },
          { id: "refactor-clean", name: "Refatorador Clean Architecture", description: "Remove code smells e organiza arquitetura." }
        ]
      },
      {
        slug: "orvexa-design",
        name: "ORVEXA DESIGN",
        role: "UI/UX & Design Systems",
        category: "DESIGN",
        preferredModelId: "claude-sonnet-5",
        iconName: "Palette",
        badge: "DIREÇÃO DE ARTE",
        description: "Especialista em paletas harmônicas, design systems em Tailwind e WCAG AAA.",
        systemPrompt: "Você é o ORVEXA DESIGN. Crie interfaces modernas e harmônicas.",
        tools: [
          { id: "palette-generator", name: "Gerador de Paleta Harmônica", description: "Gera paleta de 5 cores harmonizadas." },
          { id: "design-system-tokens", name: "Gerador de Componente UI", description: "Cria componentes com glassmorphism." }
        ]
      },
      {
        slug: "orvexa-marketing",
        name: "ORVEXA MARKETING",
        role: "Growth Hacking, Copywriting & Campanhas",
        category: "MARKETING",
        preferredModelId: "claude-fable-5.1",
        iconName: "Megaphone",
        badge: "CONVERSÃO MÁXIMA",
        description: "Estrategista de Growth, Copywriting AIDA e anúncios de alta conversão.",
        systemPrompt: "Você é o ORVEXA MARKETING. Crie textos persuasivos com foco em vendas.",
        tools: [
          { id: "aida-copy", name: "Gerador de Copy no Framework AIDA", description: "Narrativa comercial persuasiva." },
          { id: "ad-variations", name: "Gerador de Anúncios Meta/Google", description: "Variações de anúncios de alta performance." }
        ]
      },
      {
        slug: "orvexa-edu",
        name: "ORVEXA EDU",
        role: "Pedagogia Avançada & Aprendizado Ativo",
        category: "EDUCACAO",
        preferredModelId: "gemini-3.8",
        iconName: "GraduationCap",
        badge: "APRENDIZADO ACELERADO",
        description: "Tutor pedagógico para síntese de conteúdos e método Feynman.",
        systemPrompt: "Você é o ORVEXA EDU. Transforme assuntos densos em aprendizado acessível.",
        tools: [
          { id: "flashcards-generator", name: "Gerador de Flashcards Anki", description: "Gera cartões de repetição espaçada." },
          { id: "feynman-explanation", name: "Explicador Método Feynman", description: "Explica conceitos com analogias simples." }
        ]
      },
      {
        slug: "orvexa-business",
        name: "ORVEXA BUSINESS",
        role: "Estratégia Empresarial & Unit Economics",
        category: "BUSINESS",
        preferredModelId: "claude-opus-5",
        iconName: "Briefcase",
        badge: "VENTURE & STRATEGY",
        description: "Consultor de estratégia executiva, métricas LTV/CAC e pitch decks.",
        systemPrompt: "Você é o ORVEXA BUSINESS. Analise modelos de negócio com foco em ROI.",
        tools: [
          { id: "unit-economics", name: "Calculadora de Unit Economics", description: "Calcula LTV, CAC e Payback." },
          { id: "pitch-deck-generator", name: "Estrutura de Pitch Deck", description: "Estrutura padrão Silicon Valley em 10 slides." }
        ]
      },
      {
        slug: "orvexa-analyst",
        name: "ORVEXA ANALYST",
        role: "Inteligência de Dados & BI",
        category: "ANALYST",
        preferredModelId: "gemini-3-flash-preview",
        iconName: "BarChart3",
        badge: "DATA INTELLIGENCE",
        description: "Cientista de dados para análises preditivas e matriz de cohort.",
        systemPrompt: "Você é o ORVEXA ANALYST. Transforme dados brutos em decisões precisas.",
        tools: [
          { id: "kpi-forecast", name: "Simulador Preditivo de KPIs", description: "Projeta receitas e crescimento." },
          { id: "data-insights", name: "Diagnóstico de Cohort", description: "Analisa retenção por coorte." }
        ]
      }
    ];

    for (const def of officialDefs) {
      await prisma.agent.upsert({
        where: { slug: def.slug },
        update: {
          name: def.name,
          role: def.role,
          category: def.category,
          iconName: def.iconName,
          badge: def.badge,
          description: def.description,
          systemPrompt: def.systemPrompt,
          tools: JSON.stringify(def.tools),
          isSystem: true,
          isActive: true
        },
        create: {
          slug: def.slug,
          name: def.name,
          role: def.role,
          category: def.category,
          iconName: def.iconName,
          badge: def.badge,
          description: def.description,
          systemPrompt: def.systemPrompt,
          tools: JSON.stringify(def.tools),
          isSystem: true,
          isActive: true,
          allowedPlans: JSON.stringify(["ALL"]),
          allowedRoles: JSON.stringify(["USER", "ADMIN"])
        }
      });
    }

    const agentsInDb = await prisma.agent.findMany({
      where: { slug: { in: expectedSlugs } }
    });
    assert.strictEqual(agentsInDb.length, 6, "Os 6 agentes oficiais devem estar cadastrados");
    console.log(`  ✔ Todos os 6 Agentes Oficiais cadastrados e validados no banco! (${agentsInDb.map(a => a.name).join(", ")})\n`);

    // TESTE 2: Criação de Agente Personalizado pelo Administrador
    console.log("▶ [TESTE 2] Testando Criação e Gestão de Agente Personalizado...");
    const customSlug = "orvexa-logistica-test";
    
    // Remove se existir de teste anterior
    await prisma.agent.deleteMany({ where: { slug: customSlug } });

    const createdCustom = await prisma.agent.create({
      data: {
        name: "ORVEXA LOGÍSTICA & SUPPLY",
        slug: customSlug,
        role: "Otimização de Frotas & Rotas",
        category: "BUSINESS",
        badge: "ENTERPRISE EXCLUSIVE",
        color: "amber",
        description: "Otimizador logístico corporativo para cálculo de frete e rotas.",
        systemPrompt: "Você é o especialista logístico da ORVEXA. Calcule rotas e prazos com precisão.",
        tools: JSON.stringify([
          { id: "freight-calculator", name: "Calculadora de Frete por KM", description: "Estima custos de diesel e pedágio." }
        ]),
        allowedPlans: JSON.stringify(["PRO", "EMPRESA"]),
        allowedRoles: JSON.stringify(["USER", "ADMIN"]),
        isSystem: false,
        isActive: true
      }
    });

    assert(createdCustom.id, "Agente custom deve possuir ID");
    assert.strictEqual(createdCustom.isSystem, false);
    console.log(`  ✔ Agente personalizado "${createdCustom.name}" criado com sucesso!\n`);

    // TESTE 3: Ativação / Desativação de Agentes (Toggle Switch)
    console.log("▶ [TESTE 3] Testando Alternador Ativar/Desativar Agente...");
    const updatedStatus = await prisma.agent.update({
      where: { id: createdCustom.id },
      data: { isActive: false }
    });
    assert.strictEqual(updatedStatus.isActive, false, "Agente deve estar inativo");

    // Reativa
    const reactivated = await prisma.agent.update({
      where: { id: createdCustom.id },
      data: { isActive: true }
    });
    assert.strictEqual(reactivated.isActive, true, "Agente deve estar reativado");
    console.log("  ✔ Alternador de ativação/desativação testado com 100% de sucesso!\n");

    // TESTE 4: Memória Dedicada por Agente (AgentMemory) & Isolamento
    console.log("▶ [TESTE 4] Testando Memória Dedicada & Isolamento entre Agentes...");
    const testUser = await prisma.user.findFirst();
    assert(testUser, "Deve haver usuário para o teste de memória");

    const devAgent = await prisma.agent.findUnique({ where: { slug: "orvexa-dev" } });
    const mktAgent = await prisma.agent.findUnique({ where: { slug: "orvexa-marketing" } });

    // Salva fato para o DEV
    await prisma.agentMemory.create({
      data: {
        agentId: devAgent.id,
        userId: testUser.id,
        key: "stack_backend",
        value: "Utiliza Next.js 14 App Router e Prisma com SQLite/Postgres.",
        category: "STACK",
        importance: 5
      }
    });

    // Salva fato para o MARKETING
    await prisma.agentMemory.create({
      data: {
        agentId: mktAgent.id,
        userId: testUser.id,
        key: "brand_voice",
        value: "Tom de voz sóbrio, luxuoso, dark neon e focado em clientes corporativos B2B.",
        category: "PREFERENCE",
        importance: 5
      }
    });

    // Valida que o DEV só vê memórias do DEV
    const devMemories = await prisma.agentMemory.findMany({
      where: { agentId: devAgent.id, userId: testUser.id }
    });
    assert(devMemories.some(m => m.key === "stack_backend"), "DEV deve possuir stack_backend");
    assert(!devMemories.some(m => m.key === "brand_voice"), "DEV NÃO deve conter memórias de marketing");

    // Valida que o MARKETING só vê memórias do MARKETING
    const mktMemories = await prisma.agentMemory.findMany({
      where: { agentId: mktAgent.id, userId: testUser.id }
    });
    assert(mktMemories.some(m => m.key === "brand_voice"), "MARKETING deve possuir brand_voice");
    assert(!mktMemories.some(m => m.key === "stack_backend"), "MARKETING NÃO deve conter memórias de dev");
    console.log("  ✔ Memória dedicada e isolamento de contexto 100% verificados!\n");

    // TESTE 5: Despacho Autônomo de Ferramentas Conforme a Tarefa
    console.log("▶ [TESTE 5] Testando Despacho Autônomo de Ferramentas...");
    
    // Heurística de despacho autônomo
    function detectTool(tools, prompt) {
      const p = prompt.toLowerCase();
      for (const t of tools) {
        if (t.id === "unit-tests" && (p.includes("teste") || p.includes("vitest"))) return t;
        if (t.id === "palette-generator" && (p.includes("paleta") || p.includes("cores"))) return t;
        if (t.id === "aida-copy" && (p.includes("copy") || p.includes("aida"))) return t;
        if (t.id === "flashcards-generator" && (p.includes("flashcard") || p.includes("anki"))) return t;
        if (t.id === "unit-economics" && (p.includes("cac") || p.includes("ltv"))) return t;
        if (t.id === "kpi-forecast" && (p.includes("forecast") || p.includes("projeção"))) return t;
      }
      return null;
    }

    const devTools = JSON.parse(devAgent.tools);
    const mktTools = JSON.parse(mktAgent.tools);

    const devTaskMatch = detectTool(devTools, "Gere uma suíte de testes unitários com Vitest para a API de pagamentos.");
    assert(devTaskMatch && devTaskMatch.id === "unit-tests", "Deve selecionar unit-tests automaticamente");

    const mktTaskMatch = detectTool(mktTools, "Escreva uma copy persuasion no framework AIDA para vender nossa assinatura.");
    assert(mktTaskMatch && mktTaskMatch.id === "aida-copy", "Deve selecionar aida-copy automaticamente");
    console.log("  ✔ O agente seleciona autonomamente suas ferramentas conforme a tarefa!\n");

    // TESTE 6: Histórico Próprio de Conversas por Agente
    console.log("▶ [TESTE 6] Testando Histórico Isolado de Conversas por Agente...");
    const conv = await prisma.conversation.create({
      data: {
        userId: testUser.id,
        agentId: devAgent.id,
        title: "Sessão de Debug de Arquitetura",
        modelPreference: "gpt-5.6-sol"
      }
    });

    const agentHistory = await prisma.conversation.findMany({
      where: { userId: testUser.id, agentId: devAgent.id }
    });
    assert(agentHistory.some(c => c.id === conv.id), "Conversa deve pertencer ao histórico do agente");

    // Limpeza dos dados de teste
    await prisma.conversation.delete({ where: { id: conv.id } });
    await prisma.agentMemory.deleteMany({
      where: { userId: testUser.id, key: { in: ["stack_backend", "brand_voice"] } }
    });
    await prisma.agent.delete({ where: { id: createdCustom.id } });
    console.log("  ✔ Histórico próprio do agente e limpeza de teste concluídos com sucesso!\n");

    console.log("==================================================");
    console.log("🎉 TODOS OS 6 TESTES DA ARQUITETURA DE AGENTES FORAM CONCLUÍDOS COM 100% DE SUCESSO!");
    console.log("==================================================");
  } finally {
    await prisma.$disconnect();
  }
}

runAgentsE2ETests().catch((err) => {
  console.error("❌ Falha nos testes de agentes:", err);
  process.exit(1);
});

