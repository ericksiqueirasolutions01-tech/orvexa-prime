const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando Seed da Plataforma ORVEXA PRIME DIGITAL...");

  // 1. Criar Provedores de IA
  const providersData = [
    { name: "OpenAI / Codex", slug: "openai", baseUrl: "https://api.openai.com/v1" },
    { name: "Anthropic Claude", slug: "anthropic", baseUrl: "https://api.anthropic.com/v1" },
    { name: "Google Gemini", slug: "google", baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  ];

  const providers = {};
  for (const p of providersData) {
    providers[p.slug] = await prisma.aiProvider.upsert({
      where: { slug: p.slug },
      update: { name: p.name, baseUrl: p.baseUrl },
      create: p,
    });
  }
  console.log("✓ Provedores de IA criados:", Object.keys(providers).join(", "));

  // 2. Criar Modelos de IA
  const modelsData = [
    {
      name: "Claude 3.5 Sonnet",
      modelIdentifier: "claude-3-5-sonnet-20241022",
      providerId: providers["anthropic"].id,
      category: "TEXT",
      costPer1kInputCents: 0.3,
      costPer1kOutputCents: 1.5,
    },
    {
      name: "Claude 3 Haiku",
      modelIdentifier: "claude-3-haiku-20240307",
      providerId: providers["anthropic"].id,
      category: "TEXT",
      costPer1kInputCents: 0.025,
      costPer1kOutputCents: 0.125,
    },
    {
      name: "GPT-4o",
      modelIdentifier: "gpt-4o",
      providerId: providers["openai"].id,
      category: "CODE",
      costPer1kInputCents: 0.25,
      costPer1kOutputCents: 1.0,
    },
    {
      name: "GPT-4o Mini",
      modelIdentifier: "gpt-4o-mini",
      providerId: providers["openai"].id,
      category: "CODE",
      costPer1kInputCents: 0.015,
      costPer1kOutputCents: 0.06,
    },
    {
      name: "Gemini 1.5 Pro",
      modelIdentifier: "gemini-1.5-pro",
      providerId: providers["google"].id,
      category: "RESEARCH",
      costPer1kInputCents: 0.125,
      costPer1kOutputCents: 0.5,
    },
    {
      name: "Gemini 1.5 Flash",
      modelIdentifier: "gemini-1.5-flash",
      providerId: providers["google"].id,
      category: "RESEARCH",
      costPer1kInputCents: 0.0075,
      costPer1kOutputCents: 0.03,
    },
  ];

  const models = {};
  for (const m of modelsData) {
    models[m.modelIdentifier] = await prisma.aiModel.upsert({
      where: { modelIdentifier: m.modelIdentifier },
      update: m,
      create: m,
    });
  }
  console.log("✓ Modelos de IA criados:", Object.keys(models).join(", "));

  // 3. Criar Planos de Assinatura Oficiais: FREE, PRO, BUSINESS, ENTERPRISE
  const plansData = [
    {
      name: "FREE",
      slug: "free",
      priceCents: 0, // R$ 0,00
      monthlyTokens: 100000,
      monthlyMessages: 100,
      monthlyFiles: 5,
      monthlyImages: 10,
      allowedAgents: JSON.stringify(["orvexa-dev"]),
      allowedModels: JSON.stringify(["gpt-4o-mini", "gemini-1.5-flash"]),
      maxSeats: 1,
      storageQuotaBytes: 104857600, // 100 MB
      features: JSON.stringify([
        "100 mensagens mensais",
        "5 arquivos processados",
        "10 gerações de imagem",
        "Agente Especialista Dev (Básico)",
        "100 MB de armazenamento em nuvem",
        "Modelos rápidos de alta eficiência",
      ]),
    },
    {
      name: "PRO",
      slug: "pro",
      priceCents: 7990, // R$ 79,90
      monthlyTokens: 1500000,
      monthlyMessages: 1500,
      monthlyFiles: 60,
      monthlyImages: 80,
      allowedAgents: JSON.stringify([
        "orvexa-dev",
        "orvexa-design",
        "orvexa-marketing",
        "orvexa-edu",
        "orvexa-business",
        "orvexa-analyst",
      ]),
      allowedModels: JSON.stringify([
        "gpt-4o",
        "claude-3-5-sonnet-20241022",
        "gemini-1.5-pro",
        "gpt-4o-mini",
        "claude-3-haiku-20240307",
        "gemini-1.5-flash",
      ]),
      maxSeats: 1,
      storageQuotaBytes: 5368709120, // 5 GB
      features: JSON.stringify([
        "1.500 mensagens mensais",
        "60 arquivos com chunking & RAG",
        "80 gerações de imagem HD",
        "Todos os 6 Agentes Oficiais",
        "5 GB de armazenamento seguro",
        "Modelos Top-Tier (Claude 3.5 Sonnet & GPT-4o)",
      ]),
    },
    {
      name: "BUSINESS",
      slug: "business",
      priceCents: 24990, // R$ 249,90
      monthlyTokens: 5000000,
      monthlyMessages: 6000,
      monthlyFiles: 300,
      monthlyImages: 300,
      allowedAgents: JSON.stringify(["ALL"]),
      allowedModels: JSON.stringify(["ALL"]),
      maxSeats: 5,
      storageQuotaBytes: 26843545600, // 25 GB
      features: JSON.stringify([
        "6.000 mensagens mensais",
        "300 arquivos corporativos",
        "300 imagens ultra HD",
        "Todos os Agentes + Agentes Customizados",
        "25 GB de armazenamento em nuvem",
        "Prioridade no AI Gateway Failover",
        "Até 5 membros da equipe",
      ]),
    },
    {
      name: "ENTERPRISE",
      slug: "enterprise",
      priceCents: 79990, // R$ 799,90
      monthlyTokens: 20000000,
      monthlyMessages: 50000,
      monthlyFiles: 2000,
      monthlyImages: 1500,
      allowedAgents: JSON.stringify(["ALL"]),
      allowedModels: JSON.stringify(["ALL"]),
      maxSeats: 25,
      storageQuotaBytes: 107374182400, // 100 GB
      features: JSON.stringify([
        "Mensagens ilimitadas (50.000 quota base)",
        "2.000 arquivos processados",
        "1.500 gerações de imagem 4K",
        "Agentes dedicados com memória ilimitada",
        "100 GB de armazenamento corporativo",
        "Chaves de API dedicadas no Gateway",
        "SLA 99.9% e Relatórios LGPD/SOC2",
        "Gerente de conta exclusivo 24/7",
      ]),
    },
  ];

  const plans = {};
  for (const pl of plansData) {
    plans[pl.slug] = await prisma.plan.upsert({
      where: { slug: pl.slug },
      update: pl,
      create: pl,
    });
  }
  console.log("✓ Planos criados:", Object.keys(plans).join(", "));

  // 4. Criar Agentes Especialistas ORVEXA
  const agentsData = [
    {
      name: "ORVEXA DEV",
      slug: "orvexa-dev",
      description: "Engenheiro de software e arquiteto de soluções sênior. Especialista em TypeScript, Python, bancos de dados, debug e código de produção.",
      systemPrompt: "Você é o ORVEXA DEV, arquiteto de software sênior da ORVEXA PRIME DIGITAL. Suas respostas devem ser de padrão produção, com código seguro, tipado e de alta performance. Explique o raciocínio arquitetural e sempre forneça soluções completas e testáveis.",
      preferredModelId: models["gpt-4o"].id,
      iconName: "Code2",
      category: "PROGRAMACAO",
    },
    {
      name: "ORVEXA MARKETING",
      slug: "orvexa-marketing",
      description: "Estrategista de Growth, Copywriting persuasivo, campanhas publicitárias, funis de vendas e lançamentos digitais.",
      systemPrompt: "Você é o ORVEXA MARKETING, o diretor de growth da ORVEXA PRIME DIGITAL. Domina neuromarketing, copywriting de alta conversão, tráfego pago e branding sofisticado. Suas copys devem ser magnéticas, diretas e focadas em conversão real.",
      preferredModelId: models["claude-3-5-sonnet-20241022"].id,
      iconName: "Megaphone",
      category: "MARKETING",
    },
    {
      name: "ORVEXA ESTUDOS",
      slug: "orvexa-estudos",
      description: "Tutor pedagógico e acadêmico para síntese de conteúdos complexos, cronogramas de aprendizado e preparação de alto nível.",
      systemPrompt: "Você é o ORVEXA ESTUDOS, mentor acadêmico de alta performance. Quebre conceitos difíceis em explicações claras, analogias memoráveis e mapas mentais. Teste o conhecimento do usuário com perguntas provocativas.",
      preferredModelId: models["gemini-1.5-pro"].id,
      iconName: "GraduationCap",
      category: "EDUCACAO",
    },
    {
      name: "ORVEXA JURÍDICO",
      slug: "orvexa-juridico",
      description: "Consultor em compliance empresarial, redação de contratos, adequação à LGPD e análise de termos e riscos legais.",
      systemPrompt: "Você é o ORVEXA JURÍDICO, consultor especializado em direito digital, contratos comerciais e governança. Analise cláusulas com precisão técnica e destaque riscos com clareza. (Sempre inclua nota de caráter orientativo).",
      preferredModelId: models["claude-3-5-sonnet-20241022"].id,
      iconName: "Scale",
      category: "JURIDICO",
    },
  ];

  for (const ag of agentsData) {
    await prisma.agent.upsert({
      where: { slug: ag.slug },
      update: ag,
      create: ag,
    });
  }
  console.log("✓ Agentes especialistas criados: ORVEXA DEV, MARKETING, ESTUDOS, JURÍDICO");

  // 5. Criar Regras do ORVEXA PRIME ENGINE
  const routerRulesData = [
    {
      intentName: "PROGRAMACAO",
      keywords: JSON.stringify(["código", "programação", "python", "typescript", "javascript", "sql", "react", "bug", "erro", "função", "algoritmo", "api", "backend", "docker", "prisma"]),
      targetProviderId: providers["openai"].id,
      targetModelId: models["gpt-4o"].id,
      priority: 1,
    },
    {
      intentName: "TEXTO_COPY",
      keywords: JSON.stringify(["escrever", "redação", "artigo", "copy", "email", "post", "anúncio", "texto", "roteiro", "linguagem", "revisão", "comunicação"]),
      targetProviderId: providers["anthropic"].id,
      targetModelId: models["claude-3-5-sonnet-20241022"].id,
      priority: 2,
    },
    {
      intentName: "PESQUISA_PROFUNDA",
      keywords: JSON.stringify(["pesquisar", "pesquisa", "análise", "resumo", "comparação", "dados", "estudo", "fontes", "mercado", "história", "estatísticas"]),
      targetProviderId: providers["google"].id,
      targetModelId: models["gemini-1.5-pro"].id,
      priority: 3,
    },
    {
      intentName: "DOCUMENTOS",
      keywords: JSON.stringify(["pdf", "planilha", "excel", "arquivo", "leia", "documento", "extrair", "tabela", "análise de arquivo"]),
      targetProviderId: providers["google"].id,
      targetModelId: models["gemini-1.5-pro"].id,
      priority: 4,
    },
  ];

  for (const rr of routerRulesData) {
    const existing = await prisma.routerRule.findFirst({
      where: { intentName: rr.intentName },
    });
    if (existing) {
      await prisma.routerRule.update({ where: { id: existing.id }, data: rr });
    } else {
      await prisma.routerRule.create({ data: rr });
    }
  }
  console.log("✓ Regras do ORVEXA PRIME ENGINE criadas com sucesso");

  // 6. Criar Usuários Iniciais
  const salt = await bcrypt.genSalt(10);
  
  // Admin
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "AdminOrvexa2026!";
  const adminHash = await bcrypt.hash(adminPassword, salt);
  const admin = await prisma.user.upsert({
    where: { email: "admin@orvexa.digital" },
    update: {
      passwordHash: adminHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: "Administrador ORVEXA",
      email: "admin@orvexa.digital",
      passwordHash: adminHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // Erick Siqueira (Admin Master)
  const erickHash = await bcrypt.hash("M@nu2901", salt);
  await prisma.user.upsert({
    where: { email: "ericksiqueiraa@gmail.com" },
    update: {
      passwordHash: erickHash,
      role: "ADMIN",
      status: "ACTIVE",
      name: "Erick Siqueira",
    },
    create: {
      name: "Erick Siqueira",
      email: "ericksiqueiraa@gmail.com",
      passwordHash: erickHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // Cliente Ativo Demo com Plano PRO
  const clientPassword = "ClienteOrvexa2026!";
  const clientHash = await bcrypt.hash(clientPassword, salt);
  const client = await prisma.user.upsert({
    where: { email: "cliente@orvexa.digital" },
    update: {
      passwordHash: clientHash,
      role: "USER",
      status: "ACTIVE",
      planId: plans["pro"].id,
    },
    create: {
      name: "Cliente Orvexa Prime",
      email: "cliente@orvexa.digital",
      passwordHash: clientHash,
      role: "USER",
      status: "ACTIVE",
      planId: plans["pro"].id,
    },
  });

  // Assinatura para o cliente de teste
  const existingSub = await prisma.subscription.findFirst({
    where: { userId: client.id },
  });
  if (!existingSub) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const sub = await prisma.subscription.create({
      data: {
        userId: client.id,
        planId: plans["pro"].id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextMonth,
        gatewayProvider: "STRIPE",
        externalSubscriptionId: "sub_demo_active_001",
      },
    });

    await prisma.payment.create({
      data: {
        userId: client.id,
        subscriptionId: sub.id,
        amountCents: 11990,
        currency: "BRL",
        status: "CONFIRMED",
        gateway: "STRIPE",
        transactionId: "ch_demo_payment_confirmed_001",
      },
    });
  }

  console.log("✓ Usuário Admin criado: admin@orvexa.digital / " + adminPassword);
  console.log("✓ Usuário Cliente criado: cliente@orvexa.digital / " + clientPassword);
  console.log("\nSEED CONCLUÍDO COM SUCESSO! Sistema pronto para o GATE 1.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
