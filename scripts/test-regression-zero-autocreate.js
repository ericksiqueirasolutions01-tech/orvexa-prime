// scripts/test-regression-zero-autocreate.js
// BATERIA DE TESTES DE REGRESSÃO FASE 5 — GARANTIA DE ZERO AUTOCRIAÇÃO DE APIS

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const os = require("os");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

const LOCAL_FALLBACK_FILES = [
  path.join("/tmp", "orvexa_synced_account.json"),
  "C:\\tmp\\orvexa_synced_account.json",
  path.join(os.tmpdir(), "orvexa_synced_account.json"),
];

function cleanResidualSnapshots() {
  for (const fp of LOCAL_FALLBACK_FILES) {
    try {
      if (fs.existsSync(fp)) {
        fs.unlinkSync(fp);
      }
    } catch {}
  }
}

async function runRegressionTests() {
  console.log("================================================================================");
  console.log("INICIANDO TESTES DE REGRESSÃO: ZERO AUTOCRIAÇÃO DE APIS & PERSISTÊNCIA REAL");
  console.log("================================================================================\n");

  // 1. Obtém cookie/token administrativo via API de Login
  console.log("[SETUP] Efetuando login de administrador...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@orvexa.digital",
      password: "admin", // senha padrão ou hash
    }),
  });

  let authCookie = "";
  if (loginRes.ok) {
    const rawCookie = loginRes.headers.get("set-cookie") || "";
    authCookie = rawCookie.split(";")[0];
    console.log("✓ Login via /api/auth/login bem-sucedido.");
  } else {
    // Fallback: se a senha for outra, usa jose direto
    const { SignJWT } = require("jose");
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const JWT_SECRET = new TextEncoder().encode(
      process.env.JWT_SECRET || "orvexa_prime_super_secret_jwt_key_2026_production_grade_token_guard"
    );
    const token = await new SignJWT({
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: "ADMIN",
      status: "ACTIVE",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);
    authCookie = `orvexa_auth_token=${token}`;
    console.log("✓ Token JWT de administrador assinado com sucesso.");
  }

  const defaultHeaders = {
    "Cookie": authCookie,
    "Content-Type": "application/json",
  };

  // ============================================================================
  // TESTE 1: Banco sem APIs -> Esperado: 0 APIs
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[TESTE 1] Banco sem APIs");
  await prisma.aiProviderAccount.deleteMany({});
  await prisma.apiKey.deleteMany({});
  cleanResidualSnapshots();

  let res = await fetch(`${BASE_URL}/api/admin/api-keys`, { headers: defaultHeaders });
  let data = await res.json();
  const dbCount1 = await prisma.aiProviderAccount.count();

  console.log(`- API GET /api/admin/api-keys retornou: ${data.keys?.length ?? -1} chaves`);
  console.log(`- Contagem direta em ai_provider_accounts: ${dbCount1} registros`);

  if (data.keys?.length === 0 && dbCount1 === 0) {
    console.log("✅ TESTE 1 PASSOU: 0 APIs no banco e 0 APIs na listagem.");
  } else {
    throw new Error(`❌ TESTE 1 FALHOU: Retornou ${data.keys?.length} na API e ${dbCount1} no banco.`);
  }

  // ============================================================================
  // TESTE 2: Atualizar página (Reload F5) -> Esperado: continua 0
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[TESTE 2] Atualizar página (Reload F5 simulando requests concorrentes)");
  await fetch(`${BASE_URL}/api/admin/system/api-capabilities`, { headers: defaultHeaders });
  await fetch(`${BASE_URL}/api/ai/models`, { headers: defaultHeaders });
  res = await fetch(`${BASE_URL}/api/admin/api-keys`, { headers: defaultHeaders });
  data = await res.json();
  const dbCount2 = await prisma.aiProviderAccount.count();

  console.log(`- API GET /api/admin/api-keys retornou: ${data.keys?.length ?? -1} chaves`);
  console.log(`- Contagem direta em ai_provider_accounts: ${dbCount2} registros`);

  if (data.keys?.length === 0 && dbCount2 === 0) {
    console.log("✅ TESTE 2 PASSOU: Continua estritamente 0 após reload da página!");
  } else {
    throw new Error(`❌ TESTE 2 FALHOU: Conta fantasma reapareceu no reload! ${JSON.stringify(data.keys)}`);
  }

  // ============================================================================
  // TESTE 3: Cadastrar uma API real -> Esperado: 1 API
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[TESTE 3] Cadastrar uma API real via POST");
  const postPayload = {
    providerSlug: "openai",
    name: "Clipoos Produção",
    rawApiKey: "sk-real-valid-proxy-key-12345678",
    customBaseUrl: "https://proxy.clipoos.online/v1",
    priority: 1,
    tokenLimitMonthly: 50000000,
    forceSave: true,
  };

  const postRes = await fetch(`${BASE_URL}/api/admin/api-keys`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(postPayload),
  });
  const postData = await postRes.json();

  res = await fetch(`${BASE_URL}/api/admin/api-keys`, { headers: defaultHeaders });
  data = await res.json();
  const dbCount3 = await prisma.aiProviderAccount.count();

  console.log(`- Status do POST: ${postRes.status} (${postData.message || postData.error || "OK"})`);
  console.log(`- API GET /api/admin/api-keys retornou: ${data.keys?.length ?? -1} chaves`);
  console.log(`- Contagem direta em ai_provider_accounts: ${dbCount3} registros`);
  console.log(`- Nome retornado: "${data.keys?.[0]?.name}"`);

  if (data.keys?.length === 1 && dbCount3 === 1) {
    console.log("✅ TESTE 3 PASSOU: 1 API cadastrada com sucesso e salva na tabela oficial ai_provider_accounts.");
  } else {
    throw new Error(`❌ TESTE 3 FALHOU: Esperava 1 API, encontrou ${data.keys?.length} na API e ${dbCount3} no banco.`);
  }

  const createdId = data.keys[0].id;

  // ============================================================================
  // TESTE 4: Excluir a API -> Esperado: 0 APIs
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[TESTE 4] Excluir a API cadastrada");
  const delRes = await fetch(`${BASE_URL}/api/admin/api-keys?id=${createdId}`, {
    method: "DELETE",
    headers: defaultHeaders,
  });
  const delData = await delRes.json();
  console.log(`- Status do DELETE: ${delRes.status} (${delData.message || "OK"})`);

  res = await fetch(`${BASE_URL}/api/admin/api-keys`, { headers: defaultHeaders });
  data = await res.json();
  const dbCount4 = await prisma.aiProviderAccount.count();

  console.log(`- API GET /api/admin/api-keys retornou: ${data.keys?.length ?? -1} chaves`);
  console.log(`- Contagem direta em ai_provider_accounts: ${dbCount4} registros`);

  if (data.keys?.length === 0 && dbCount4 === 0) {
    console.log("✅ TESTE 4 PASSOU: API excluída com sucesso, exatamente 0 APIs restantes.");
  } else {
    throw new Error(`❌ TESTE 4 FALHOU: API não foi excluída completamente do banco.`);
  }

  // ============================================================================
  // TESTE 5: Atualizar página após exclusão -> Esperado: continua 0
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[TESTE 5] Atualizar página (Reload F5 após exclusão)");
  // Dispara endpoints simultâneos como o navegador faz na dashboard:
  await fetch(`${BASE_URL}/api/admin/system/api-capabilities`, { headers: defaultHeaders });
  await fetch(`${BASE_URL}/api/ai/models`, { headers: defaultHeaders });
  await fetch(`${BASE_URL}/api/ai/agents`, { headers: defaultHeaders });
  res = await fetch(`${BASE_URL}/api/admin/api-keys`, { headers: defaultHeaders });
  data = await res.json();
  const dbCount5 = await prisma.aiProviderAccount.count();

  console.log(`- API GET /api/admin/api-keys retornou: ${data.keys?.length ?? -1} chaves`);
  console.log(`- Contagem direta em ai_provider_accounts: ${dbCount5} registros`);

  if (data.keys?.length === 0 && dbCount5 === 0) {
    console.log("✅ TESTE 5 PASSOU: Continua estritamente 0 APIs após múltiplos reloads!");
  } else {
    throw new Error(`❌ TESTE 5 FALHOU: API fantasma renasceu no refresh! Nome: ${data.keys?.[0]?.name}`);
  }

  // ============================================================================
  // TESTE 6: Logout e Login novamente -> Esperado: continua 0
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("[TESTE 6] Logout e Login com nova sessão");
  // Simula logout:
  await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", headers: defaultHeaders }).catch(() => {});

  // Simula login de um cliente regular:
  const clientUser = await prisma.user.findFirst({ where: { role: "USER" } });
  let clientHeaders = {};
  if (clientUser) {
    const { SignJWT } = require("jose");
    const JWT_SECRET = new TextEncoder().encode(
      process.env.JWT_SECRET || "orvexa_prime_super_secret_jwt_key_2026_production_grade_token_guard"
    );
    const clientToken = await new SignJWT({
      id: clientUser.id,
      name: clientUser.name,
      email: clientUser.email,
      role: "USER",
      status: "ACTIVE",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    clientHeaders = {
      "Cookie": `orvexa_auth_token=${clientToken}`,
      "Content-Type": "application/json",
    };
  }

  // Cliente consulta modelos:
  const clientModelsRes = await fetch(`${BASE_URL}/api/ai/models`, { headers: clientHeaders });
  const clientModelsData = await clientModelsRes.json();
  console.log(`- Área cliente GET /api/ai/models: activeApiConfigured=${clientModelsData.activeApiConfigured}, models=${clientModelsData.models?.length}`);

  // Admin loga novamente:
  res = await fetch(`${BASE_URL}/api/admin/api-keys`, { headers: defaultHeaders });
  data = await res.json();
  const dbCount6 = await prisma.aiProviderAccount.count();

  console.log(`- API GET /api/admin/api-keys retornou: ${data.keys?.length ?? -1} chaves`);
  console.log(`- Contagem direta em ai_provider_accounts: ${dbCount6} registros`);

  if (data.keys?.length === 0 && dbCount6 === 0 && clientModelsData.models?.length === 0) {
    console.log("✅ TESTE 6 PASSOU: Continua 0 APIs após logout e novo login tanto para Admin quanto para Cliente.");
  } else {
    throw new Error(`❌ TESTE 6 FALHOU: API reapareceu após logout/login!`);
  }

  console.log("\n================================================================================");
  console.log("🎉 TODOS OS 6 TESTES DE REGRESSÃO PASSARAM COM 100% DE SUCESSO!");
  console.log("================================================================================");
}

runRegressionTests()
  .catch((err) => {
    console.error("\n❌ ERRO NA SUÍTE DE TESTES:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
