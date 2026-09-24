import { prisma } from "../src/lib/prisma";

async function testCapabilities() {
  const activeApiKeys = await prisma.apiKey.findMany({
    where: { status: "ACTIVE" },
    include: { provider: true },
  });
  const primaryKey = activeApiKeys[0];
  const activeProvider = primaryKey?.provider;
  const activeProviderSlugs = new Set(
    activeApiKeys.map((k) => (k.provider?.slug || "").toLowerCase())
  );

  const activeModelsDb = await prisma.aiModel.findMany({
    where: { isActive: true },
  });
  const activeModelIds = new Set(
    activeModelsDb.map((m) => m.modelIdentifier.toLowerCase())
  );

  const allAgentsDb = await prisma.agent.findMany();

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
      blocked.push({ name: ag.name, reason: "Requer Anthropic Claude API" });
      continue;
    }

    if (
      (slugLower.includes("gemini") || nameLower.includes("gemini") || slugLower.includes("estudos") || slugLower.includes("analyst") || slugLower.includes("edu") || modelLower.includes("gemini")) &&
      !activeProviderSlugs.has("google")
    ) {
      blocked.push({ name: ag.name, reason: "Requer Google Gemini API" });
      continue;
    }

    if (
      (slugLower.includes("astra") || nameLower.includes("astra") || modelLower.includes("astra")) &&
      !activeModelIds.has("gpt-6-astra")
    ) {
      blocked.push({ name: ag.name, reason: "Upstream 502 no modelo gpt-6-astra" });
      continue;
    }

    if (slugLower.includes("design") || nameLower.includes("design")) {
      blocked.push({ name: ag.name, reason: "Requer difusão de imagens" });
      continue;
    }

    if (modelLower !== "orvexa-prime" && modelLower !== "" && !activeModelIds.has(modelLower)) {
      blocked.push({ name: ag.name, reason: `Modelo ${modelLower} não suportado` });
      continue;
    }

    allowed.push({ name: ag.name, model: modelLower });
  }

  console.log("ALLOWED AGENTS (" + allowed.length + "):", allowed.map(a => a.name));
  console.log("BLOCKED AGENTS (" + blocked.length + "):", blocked.map(b => `${b.name} -> ${b.reason}`));
}

testCapabilities().catch(console.error);
