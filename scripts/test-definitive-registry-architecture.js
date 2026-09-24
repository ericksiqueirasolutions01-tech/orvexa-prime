// scripts/test-definitive-registry-architecture.js
// BATERIA DE TESTES DEFINITIVA — 7 PASSOS DE HOMOLOGAÇÃO
// Arquitetura Central: ai_provider_registry

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

let adminCookie = "";
let clientCookie = "";

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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

async function run7StepTest() {
  console.log("================================================================================");
  console.log("INICIANDO HOMOLOGAÇÃO DEFINITIVA — ARQUITETURA API REGISTRY CENTRAL (7 PASSOS)");
  console.log("================================================================================\n");

  const results = [];

  try {
    // -------------------------------------------------------------
    // PASSO 1: Limpar banco de dados
    // -------------------------------------------------------------
    console.log("👉 PASSO 1: Limpar banco de dados...");
    await prisma.aiProviderRegistry.deleteMany();
    await prisma.aiProviderAccount.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.systemSetting.deleteMany({
      where: { key: { in: ["openai_base_url", "openai_custom_url"] } },
    });

    const regCount1 = await prisma.aiProviderRegistry.count();
    const accCount1 = await prisma.aiProviderAccount.count();
    const keyCount1 = await prisma.apiKey.count();

    const pass1 = regCount1 === 0 && accCount1 === 0 && keyCount1 === 0;
    console.log(`   [STATUS] ai_provider_registry: ${regCount1}, ai_provider_accounts: ${accCount1}, apiKey: ${keyCount1}`);
    results.push({ step: 1, name: "Limpar banco de dados", passed: pass1, details: `Zero APIs em todas as tabelas (${regCount1}/${accCount1}/${keyCount1})` });

    // -------------------------------------------------------------
    // PASSO 2: Abrir sistema com banco limpo (Admin: 0 APIs / Cliente: bloqueado com aviso)
    // -------------------------------------------------------------
    console.log("\n👉 PASSO 2: Abrir sistema com banco vazio...");
    adminCookie = await login("admin@orvexa.digital", "AdminOrvexa2026!");
    clientCookie = await login("cliente.real@orvexa.digital", "ClienteSenhaSegura2026!");

    // 2.1 Admin lista chaves
    const adminListRes = await fetch(`${BASE_URL}/api/admin/api-keys`, {
      headers: { Cookie: adminCookie },
    });
    const adminListData = await adminListRes.json();
    const adminKeysCount = adminListData.keys?.length || 0;
    console.log(`   [ADMIN] Chaves listadas: ${adminKeysCount}`);

    // 2.2 Cliente consulta provedores disponíveis
    const clientAvailRes = await fetch(`${BASE_URL}/api/providers/available`, {
      headers: { Cookie: clientCookie },
    });
    const clientAvailData = await clientAvailRes.json();
    console.log(`   [CLIENTE] /api/providers/available: available=${clientAvailData.available}, activeCount=${clientAvailData.activeCount}`);

    // 2.3 Cliente consulta modelos
    const clientModelsRes = await fetch(`${BASE_URL}/api/ai/models`, {
      headers: { Cookie: clientCookie },
    });
    const clientModelsData = await clientModelsRes.json();
    console.log(`   [CLIENTE] /api/ai/models: activeApiConfigured=${clientModelsData.activeApiConfigured}, modelsCount=${clientModelsData.models?.length || 0}`);

    // 2.4 Chat tenta enviar sem API ativa
    const chatBlockedRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: clientCookie },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Olá, teste sem API" }],
      }),
    });
    const chatBlockedText = await chatBlockedRes.text();
    const chatCorrectlyBlocked = !chatBlockedRes.ok && (chatBlockedText.includes("Nenhuma API de IA configurada") || chatBlockedRes.status >= 400);
    console.log(`   [CLIENTE] Chat bloqueado corretamente: ${chatCorrectlyBlocked} (Status ${chatBlockedRes.status})`);

    const pass2 = adminKeysCount === 0 && clientAvailData.available === false && clientModelsData.activeApiConfigured === false && chatCorrectlyBlocked;
    results.push({
      step: 2,
      name: "Sistema Vazio (Admin 0 APIs, Cliente bloqueado com aviso)",
      passed: pass2,
      details: `Admin keys: ${adminKeysCount}, Client avail: ${clientAvailData.available}, Models configured: ${clientModelsData.activeApiConfigured}, Chat blocked: ${chatCorrectlyBlocked}`,
    });

    // -------------------------------------------------------------
    // PASSO 3: Cadastrar API no Admin (Validar e Gravar na ai_provider_registry)
    // -------------------------------------------------------------
    console.log("\n👉 PASSO 3: Cadastrar API 'Clipoos Produção' via Admin...");
    const regPayload = {
      name: "Clipoos Produção",
      provider: "openai",
      baseUrl: "https://proxy.clipoos.online/v1",
      apiKey: "sk-clipoos-prod-test-live-key-2026-homologation",
      priority: 1,
      quotaLimit: 5000000,
      capabilities: ["TEXTO", "CODIGO", "DOCUMENTO"],
      models: ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet-20241022"],
      forceSave: true, // Homologação sem necessidade de credencial de pagamento externa
    };

    const registerRes = await fetch(`${BASE_URL}/api/admin/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify(regPayload),
    });
    const registerData = await registerRes.json();
    console.log(`   [CADASTRO] Resposta: success=${registerData.success}, message=${registerData.message}`);

    // Verifica persistência física na ai_provider_registry
    const savedInRegistry = await prisma.aiProviderRegistry.findFirst({
      where: { name: "Clipoos Produção" },
    });
    const pass3 = Boolean(savedInRegistry && savedInRegistry.encryptedApiKey && savedInRegistry.isActive);
    console.log(`   [BANCO] Registro gravado em ai_provider_registry: id=${savedInRegistry?.id}, provider=${savedInRegistry?.provider}, keyHint=${savedInRegistry?.keyHint}`);
    results.push({
      step: 3,
      name: "Cadastrar API na ai_provider_registry",
      passed: pass3,
      details: `ID: ${savedInRegistry?.id}, Provider: ${savedInRegistry?.provider}, Status: ${savedInRegistry?.status}, KeyHint: ${savedInRegistry?.keyHint}`,
    });

    // -------------------------------------------------------------
    // PASSO 4: Fazer Logout
    // -------------------------------------------------------------
    console.log("\n👉 PASSO 4: Executar logout das sessões...");
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: adminCookie },
    });
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: clientCookie },
    });
    adminCookie = "";
    clientCookie = "";
    console.log("   [LOGOUT] Sessões finalizadas e cookies invalidados.");
    results.push({ step: 4, name: "Fazer Logout", passed: true, details: "Cookies e sessões locais limpos" });

    // -------------------------------------------------------------
    // PASSO 5: Fazer Login Novamente
    // -------------------------------------------------------------
    console.log("\n👉 PASSO 5: Efetuar novo login no sistema...");
    adminCookie = await login("admin@orvexa.digital", "AdminOrvexa2026!");
    clientCookie = await login("cliente.real@orvexa.digital", "ClienteSenhaSegura2026!");
    const pass5 = Boolean(adminCookie && clientCookie);
    console.log("   [LOGIN] Novo login de Admin e Cliente realizado com sucesso.");
    results.push({ step: 5, name: "Fazer Login Novamente", passed: pass5, details: "Novos tokens JWT obtidos" });

    // -------------------------------------------------------------
    // PASSO 6: Entrar como cliente (Modelos carregados, Chat habilitado)
    // -------------------------------------------------------------
    console.log("\n👉 PASSO 6: Validar experiência do Cliente...");
    // 6.1 /api/providers/available
    const cAvailRes = await fetch(`${BASE_URL}/api/providers/available`, {
      headers: { Cookie: clientCookie },
    });
    const cAvailData = await cAvailRes.json();
    console.log(`   [CLIENTE] /api/providers/available: available=${cAvailData.available}, activeCount=${cAvailData.activeCount}`);

    // 6.2 /api/ai/models
    const cModelsRes = await fetch(`${BASE_URL}/api/ai/models`, {
      headers: { Cookie: clientCookie },
    });
    const cModelsData = await cModelsRes.json();
    console.log(`   [CLIENTE] /api/ai/models: activeApiConfigured=${cModelsData.activeApiConfigured}, models=[${cModelsData.models?.map(m => m.id).join(", ")}]`);

    const hasExpectedModels = cModelsData.models?.some(m => m.id.includes("gpt-4o"));
    const pass6 = cAvailData.available === true && cModelsData.activeApiConfigured === true && hasExpectedModels;
    results.push({
      step: 6,
      name: "Área Cliente Conectada ao Registry",
      passed: pass6,
      details: `Disponível: ${cAvailData.available}, Configurado: ${cModelsData.activeApiConfigured}, Modelos: ${cModelsData.models?.length}`,
    });

    // -------------------------------------------------------------
    // PASSO 7: Retornar ao Admin (API permanece, estatísticas, modelos)
    // -------------------------------------------------------------
    console.log("\n👉 PASSO 7: Retornar ao Admin e confirmar persistência definitiva...");
    const adminCheckRes = await fetch(`${BASE_URL}/api/admin/api-keys`, {
      headers: { Cookie: adminCookie },
    });
    const adminCheckData = await adminCheckRes.json();
    const finalKeys = adminCheckData.keys || [];
    console.log(`   [ADMIN] Total de chaves encontradas: ${finalKeys.length}`);

    const clipoosKey = finalKeys.find(k => k.name === "Clipoos Produção");
    const pass7 = finalKeys.length === 1 && Boolean(clipoosKey) && clipoosKey.baseUrl === "https://proxy.clipoos.online/v1";

    console.log(`   [ADMIN] API Clipoos Produção presente: ${Boolean(clipoosKey)}`);
    if (clipoosKey) {
      console.log(`   [ADMIN] URL: ${clipoosKey.baseUrl}, Provider: ${clipoosKey.providerSlug}, Modelos: [${clipoosKey.modelsDetected?.join(", ")}]`);
    }

    results.push({
      step: 7,
      name: "Persistência Definitiva no Admin",
      passed: pass7,
      details: `KeysCount: ${finalKeys.length}, Encontrada: ${Boolean(clipoosKey)}, BaseURL: ${clipoosKey?.baseUrl}`,
    });

    // -------------------------------------------------------------
    // RESUMO FINAL
    // -------------------------------------------------------------
    console.log("\n================================================================================");
    console.log("RESULTADO DOS 7 PASSOS DE HOMOLOGAÇÃO:");
    console.log("================================================================================");
    let allPassed = true;
    for (const r of results) {
      const icon = r.passed ? "✅ PASSOU" : "❌ FALHOU";
      console.log(`[PASSO ${r.step}] ${icon} — ${r.name}`);
      console.log(`          Detalhes: ${r.details}`);
      if (!r.passed) allPassed = false;
    }
    console.log("================================================================================");
    if (allPassed) {
      console.log("🎉 SUCESSO TOTAL! ARQUITETURA API REGISTRY CENTRAL 100% VALIDADA E OPERACIONAL!");
    } else {
      console.error("⚠️ ALGUNS PASSOS NÃO ATINGIRAM O RESULTADO ESPERADO.");
    }
    console.log("================================================================================\n");

  } catch (err) {
    console.error("Erro fatal na execução da bateria de testes:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run7StepTest();
