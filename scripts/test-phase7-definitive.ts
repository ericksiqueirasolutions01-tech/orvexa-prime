// scripts/test-phase7-definitive.ts
// BATERIA DE HOMOLOGAÇÃO RIGOROSA FASE 7 — ORVEXA PRIME SINGLE SOURCE OF TRUTH

import { PrismaClient } from "@prisma/client";
import { appCache } from "../src/lib/cache";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

interface TestStepResult {
  step: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestStepResult[] = [];

async function login(email: string, pass: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email} with status ${res.status}`);
  }
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("No set-cookie returned upon login");
  }
  return setCookie.split(";")[0];
}

async function run() {
  console.log("==================================================================");
  console.log("INICIANDO BATERIA DE HOMOLOGAÇÃO FASE 7 — ORVEXA PRIME");
  console.log("==================================================================");

  // FASE 2 / TESTE 1: Limpeza completa de APIs para banco 100% limpo
  console.log("\n[TESTE 1] Limpando banco de dados para estado virgem (0 APIs)...");
  await prisma.aiProviderAccount.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.systemSetting.deleteMany({
    where: { key: { in: ["openai_base_url", "openai_custom_url"] } },
  });
  await prisma.aiProvider.updateMany({
    data: { isActive: false },
  });
  appCache.clear();

  // Autentica como Administrador
  const adminCookie = await login("admin@orvexa.digital", "AdminOrvexa2026!");
  console.log("Admin autenticado.");

  // Autentica como Cliente
  const clientCookie = await login("cliente.real@orvexa.digital", "ClienteSenhaSegura2026!");
  console.log("Cliente autenticado.");

  // Teste 1.1: GET /api/admin/api-keys
  const resKeysEmpty = await fetch(`${BASE_URL}/api/admin/api-keys`, {
    headers: { Cookie: adminCookie },
  });
  const dataKeysEmpty = await resKeysEmpty.json();
  const keysCount = dataKeysEmpty.keys?.length ?? -1;

  // Teste 1.2: GET /api/ai/models como Cliente
  const resModelsEmpty = await fetch(`${BASE_URL}/api/ai/models`, {
    headers: { Cookie: clientCookie },
  });
  const dataModelsEmpty = await resModelsEmpty.json();

  // Teste 1.3: GET /api/ai/agents como Cliente
  const resAgentsEmpty = await fetch(`${BASE_URL}/api/ai/agents`, {
    headers: { Cookie: clientCookie },
  });
  const dataAgentsEmpty = await resAgentsEmpty.json();

  const test1Passed =
    keysCount === 0 &&
    dataModelsEmpty.activeApiConfigured === false &&
    dataModelsEmpty.models.length === 0 &&
    dataAgentsEmpty.agents.length === 0;

  results.push({
    step: 1,
    name: "Banco Limpo (0 APIs)",
    passed: test1Passed,
    details: `APIs no Admin: ${keysCount} (esperado 0). Modelos no Cliente: ${dataModelsEmpty.models.length} (esperado 0). Agentes no Cliente: ${dataAgentsEmpty.agents.length} (esperado 0).`,
  });
  console.log(
    `Resultado Teste 1: ${test1Passed ? "PASSOU ✅" : "FALHOU ❌"} - ${results[0].details}`
  );

  // TESTE 2: Cadastrar API Clipoos Produção
  console.log("\n[TESTE 2] Cadastrando API Clipoos Produção (https://proxy.clipoos.online/v1)...");
  const postRes = await fetch(`${BASE_URL}/api/admin/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      name: "Clipoos Produção",
      providerId: "openai",
      apiKey: "sk-clipoos-real-token-2026-prod-xyz",
      tokenLimitMonthly: 50000000,
      customBaseUrl: "https://proxy.clipoos.online/v1",
      capabilities: ["TEXTO", "CODIGO", "DOCUMENTO"],
      detectedModels: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
      priority: 1,
      status: "ACTIVE",
    }),
  });

  const postData = await postRes.json();
  const test2Passed = postRes.ok && postData.success && postData.account?.id;
  results.push({
    step: 2,
    name: "Cadastro de API Real",
    passed: Boolean(test2Passed),
    details: `ID cadastrado: ${postData.account?.id || "N/A"}. Status: ${postData.account?.status || "N/A"}.`,
  });
  console.log(
    `Resultado Teste 2: ${test2Passed ? "PASSOU ✅" : "FALHOU ❌"} - ${results[1].details}`
  );

  // TESTE 3: Logout Administrador
  console.log("\n[TESTE 3] Executando Logout do Administrador...");
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: adminCookie },
  });
  const test3Passed = logoutRes.ok;
  results.push({
    step: 3,
    name: "Logout do Administrador",
    passed: test3Passed,
    details: `Status HTTP Logout: ${logoutRes.status}`,
  });
  console.log(`Resultado Teste 3: ${test3Passed ? "PASSOU ✅" : "FALHOU ❌"}`);

  // TESTE 4: Login novamente do Administrador e verificação de persistência
  console.log("\n[TESTE 4] Novo Login do Administrador e Auditoria de Persistência...");
  const newAdminCookie = await login("admin@orvexa.digital", "AdminOrvexa2026!");
  const resKeysAfterLogin = await fetch(`${BASE_URL}/api/admin/api-keys`, {
    headers: { Cookie: newAdminCookie },
  });
  const dataKeysAfterLogin = await resKeysAfterLogin.json();
  const foundAccount = dataKeysAfterLogin.keys?.find(
    (k: any) => k.name === "Clipoos Produção" && k.baseUrl === "https://proxy.clipoos.online/v1"
  );

  const test4Passed = Boolean(foundAccount && foundAccount.status === "ACTIVE");
  results.push({
    step: 4,
    name: "Persistência Pós-Login",
    passed: test4Passed,
    details: `Conta encontrada: "${foundAccount?.name}", BaseUrl: "${foundAccount?.baseUrl}", Status: "${foundAccount?.status}".`,
  });
  console.log(
    `Resultado Teste 4: ${test4Passed ? "PASSOU ✅" : "FALHOU ❌"} - ${results[3].details}`
  );

  // TESTE 5: Entrar como cliente e verificar isolamento
  console.log("\n[TESTE 5] Verificando Área do Cliente (Isolamento de Modelos e Agentes)...");
  const resModelsClient = await fetch(`${BASE_URL}/api/ai/models`, {
    headers: { Cookie: clientCookie },
  });
  const dataModelsClient = await resModelsClient.json();

  const clientModelIds = (dataModelsClient.models || []).map((m: any) => m.id);
  const hasOnlyClipoosModels =
    clientModelIds.includes("orvexa-prime") &&
    clientModelIds.includes("gpt-4o") &&
    clientModelIds.includes("gpt-4o-mini") &&
    clientModelIds.includes("gpt-3.5-turbo");

  const hasNoGhostModels =
    !clientModelIds.includes("gpt-6-sol") &&
    !clientModelIds.includes("claude-3-opus") &&
    !clientModelIds.includes("gemini-1.5-pro") &&
    !clientModelIds.includes("azure-gpt-4");

  const resAgentsClient = await fetch(`${BASE_URL}/api/ai/agents`, {
    headers: { Cookie: clientCookie },
  });
  const dataAgentsClient = await resAgentsClient.json();
  const clientAgents = dataAgentsClient.agents || [];

  const test5Passed =
    dataModelsClient.activeApiConfigured === true &&
    hasOnlyClipoosModels &&
    hasNoGhostModels &&
    clientAgents.length > 0;

  results.push({
    step: 5,
    name: "Área do Cliente (Isolamento de Modelos)",
    passed: test5Passed,
    details: `Modelos visíveis: [${clientModelIds.join(", ")}]. Ghost models bloqueados: ${hasNoGhostModels}. Agentes liberados: ${clientAgents.length}.`,
  });
  console.log(
    `Resultado Teste 5: ${test5Passed ? "PASSOU ✅" : "FALHOU ❌"} - ${results[4].details}`
  );

  // TESTE 6: Limpeza de Cache de Servidor / Reinício de Sessão
  console.log("\n[TESTE 6] Simulando Limpeza Total de Cache e Reinício de Sessão...");
  appCache.clear();

  const resKeysTest6 = await fetch(`${BASE_URL}/api/admin/api-keys`, {
    headers: { Cookie: newAdminCookie },
  });
  const dataKeysTest6 = await resKeysTest6.json();

  const resModelsTest6 = await fetch(`${BASE_URL}/api/ai/models`, {
    headers: { Cookie: clientCookie },
  });
  const dataModelsTest6 = await resModelsTest6.json();

  const test6Passed =
    dataKeysTest6.keys?.length === 1 &&
    dataKeysTest6.keys[0].name === "Clipoos Produção" &&
    dataModelsTest6.models?.length === 4; // orvexa-prime + gpt-4o + gpt-4o-mini + gpt-3.5-turbo

  results.push({
    step: 6,
    name: "Imutabilidade após Reset de Cache (Zero Regressão)",
    passed: test6Passed,
    details: `APIs após clear: ${dataKeysTest6.keys?.length} (esperado 1). Modelos no cliente: ${dataModelsTest6.models?.length} (esperado 4).`,
  });
  console.log(
    `Resultado Teste 6: ${test6Passed ? "PASSOU ✅" : "FALHOU ❌"} - ${results[5].details}`
  );

  console.log("\n==================================================================");
  console.log("RESUMO DA BATERIA DE HOMOLOGAÇÃO FASE 7:");
  console.log("==================================================================");
  let allPass = true;
  for (const r of results) {
    console.log(`[Teste ${r.step}] ${r.name}: ${r.passed ? "APROVADO ✅" : "FALHOU ❌"}`);
    console.log(`         ${r.details}`);
    if (!r.passed) allPass = false;
  }
  console.log("==================================================================");
  console.log(`STATUS FINAL: ${allPass ? "TODOS OS TESTES APROVADOS COM SUCESSO! 🚀" : "HOUVE FALHAS! ⚠️"}`);
}

run()
  .catch((err) => {
    console.error("Erro fatal na bateria de homologação:", err);
  })
  .finally(() => prisma.$disconnect());
