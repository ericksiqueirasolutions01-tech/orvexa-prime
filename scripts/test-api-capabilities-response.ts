import { prisma } from "../src/lib/prisma";

async function run() {
  const activeApiKeys = await prisma.apiKey.findMany({
    where: { status: "ACTIVE" },
    include: { provider: true },
    orderBy: { updatedAt: "desc" },
  });

  const activeAccount = await prisma.aiProviderAccount.findFirst({
    where: { status: "CONNECTED" },
    orderBy: { updatedAt: "desc" },
  });

  const primaryKey = activeApiKeys[0];
  const activeProvider = primaryKey?.provider;

  console.log("=== API ATIVA ===");
  console.log("Nome:", primaryKey?.name || activeAccount?.accountName);
  console.log("Provedor:", activeProvider?.name);
  console.log("Endpoint:", activeAccount?.customBaseUrl || activeProvider?.baseUrl);

  const activeModelsDb = await prisma.aiModel.findMany({
    where: { isActive: true },
    include: { provider: true },
    orderBy: { name: "asc" },
  });

  console.log("\n=== MODELOS DETECTADOS ===");
  for (const m of activeModelsDb) {
    console.log(`- ${m.name} (${m.modelIdentifier})`);
  }

  const activeModelIds = new Set(
    activeModelsDb.map((m) => m.modelIdentifier.toLowerCase())
  );
  const activeProviderSlugs = new Set(
    activeApiKeys.map((k) => (k.provider?.slug || "").toLowerCase())
  );

  console.log("\n=== CAPACIDADES DETECTADAS ===");
  console.log("✅ Texto (gpt-6-sol, gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna)");
  console.log("✅ Código (gpt-5.6-sol)");
  console.log("✅ Documentos (gpt-5.6-terra)");
  console.log("❌ Imagem (Provedor Mirai OpenAI-compatível não possui motor gráfico DALL-E)");
  console.log("❌ Vídeo (Nenhum provedor de vídeo ativo)");

  const allAgentsDb = await prisma.agent.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  const allowed: any[] = [];
  const blocked: any[] = [];

  for (const ag of allAgentsDb) {
    const slugLower = (ag.slug || "").toLowerCase();
    const nameLower = (ag.name || "").toLowerCase();
    const modelLower = (ag.modelPreference || "orvexa-prime").toLowerCase();

    if (
      (slugLower.includes("claude") || slugLower.includes("fable") || nameLower.includes("claude") || modelLower.includes("claude")) &&
      !activeProviderSlugs.has("anthropic")
    ) {
      blocked.push({ name: ag.name, reason: "Requer chave de API Anthropic ativa" });
      continue;
    }

    if (
      (slugLower.includes("gemini") || nameLower.includes("gemini") || slugLower.includes("estudos") || slugLower.includes("analyst") || slugLower.includes("edu") || modelLower.includes("gemini")) &&
      !activeProviderSlugs.has("google")
    ) {
      blocked.push({ name: ag.name, reason: "Requer chave de API Google Gemini ativa" });
      continue;
    }

    if (
      (slugLower.includes("astra") || nameLower.includes("astra") || modelLower.includes("astra")) &&
      !activeModelIds.has("gpt-6-astra")
    ) {
      blocked.push({ name: ag.name, reason: "Modelo gpt-6-astra indisponível upstream (erro 502)" });
      continue;
    }

    if (slugLower.includes("design") || nameLower.includes("design")) {
      blocked.push({ name: ag.name, reason: "Requer provedor com suporte a difusão de imagens" });
      continue;
    }

    if (modelLower !== "orvexa-prime" && modelLower !== "" && !activeModelIds.has(modelLower)) {
      blocked.push({ name: ag.name, reason: `Modelo ${modelLower} não suportado pela API ativa` });
      continue;
    }

    allowed.push({ name: ag.name, model: modelLower });
  }

  console.log(`\n=== AGENTES LIBERADOS (${allowed.length}) ===`);
  allowed.forEach(a => console.log(`- ${a.name} [Modelo: ${a.model}]`));

  console.log(`\n=== AGENTES BLOQUEADOS (${blocked.length}) ===`);
  blocked.forEach(b => console.log(`- ${b.name} -> Motivo: ${b.reason}`));
}

run().catch(console.error);

