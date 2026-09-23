// scripts/test-ai-provider-layer.js
// BATERIA DE TESTES AUTOMATIZADOS: AI PROVIDER LAYER — ORVEXA PRIME DIGITAL

const assert = require("assert");

async function runTests() {
  console.log("===============================================================================");
  console.log("🧪 INICIANDO TESTES DA CAMADA AI PROVIDER LAYER (AIProviderService)");
  console.log("===============================================================================\n");

  const baseUrl = "http://localhost:3000";

  // -------------------------------------------------------------------------
  // TESTE 1: Login de Administrador para Acessar Rotas Protegidas
  // -------------------------------------------------------------------------
  console.log("[1/5] Autenticando como Administrador...");
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@orvexa.digital",
      password: "AdminOrvexa2026!",
    }),
  });

  assert.strictEqual(adminLoginRes.status, 200, "Login do admin deve retornar status 200");
  const adminCookie = adminLoginRes.headers.get("set-cookie");
  assert(adminCookie, "Cookie de sessão JWT deve ser emitido");
  console.log("  ✓ Admin autenticado com sucesso.\n");

  // -------------------------------------------------------------------------
  // TESTE 2: Validação de Chave Vazia (Mensagem Clara)
  // -------------------------------------------------------------------------
  console.log("[2/5] Testando validação de chave vazia...");
  const emptyKeyRes = await fetch(`${baseUrl}/api/admin/api-keys/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      rawApiKey: "",
      providerSlug: "openai",
    }),
  });

  const emptyKeyData = await emptyKeyRes.json();
  assert.strictEqual(emptyKeyRes.status, 400, "Chave vazia deve retornar 400");
  assert(
    emptyKeyData.error && emptyKeyData.error.toLowerCase().includes("não informada"),
    `Mensagem deve ser clara sobre chave não informada. Recebido: ${emptyKeyData.error}`
  );
  console.log(`  ✓ Resposta esperada recebida: "${emptyKeyData.error}"\n`);

  // -------------------------------------------------------------------------
  // TESTE 3: Validação de Chave Inválida (Mensagem Clara 401)
  // -------------------------------------------------------------------------
  console.log("[3/5] Testando resposta amigável para chave inválida (OpenAI Oficial)...");
  const invalidKeyRes = await fetch(`${baseUrl}/api/admin/api-keys/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      rawApiKey: "sk-invalid-fake-key-for-testing-12345",
      providerSlug: "openai",
    }),
  });

  const invalidKeyData = await invalidKeyRes.json();
  assert.strictEqual(invalidKeyRes.status, 400, "Chave inválida deve retornar status 400 com erro amigável");
  assert(
    invalidKeyData.error && (invalidKeyData.error.includes("inválida") || invalidKeyData.error.includes("autenticação") || invalidKeyData.error.includes("401")),
    `Erro deve conter explicação amigável sobre credencial inválida. Recebido: ${invalidKeyData.error}`
  );
  console.log(`  ✓ Diagnóstico claro retornado: "${invalidKeyData.error}" (${invalidKeyData.latencyMs}ms)\n`);

  // -------------------------------------------------------------------------
  // TESTE 4: Teste de Conexão com Gateway Personalizado (ex: Mirai API / LocalAI / Custom)
  // -------------------------------------------------------------------------
  console.log("[4/5] Testando resolução de Gateway Personalizado (Mirai API)...");
  const customGatewayRes = await fetch(`${baseUrl}/api/admin/api-keys/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      rawApiKey: "sk-fake-custom-gateway-key",
      customBaseUrl: "https://api.miraiapi.com/v1",
      providerSlug: "openai",
    }),
  });

  const customGatewayData = await customGatewayRes.json();
  assert(customGatewayData.endpointUsed.includes("api.miraiapi.com/v1"), "Endpoint utilizado deve ser o customBaseUrl");
  console.log(`  ✓ Gateway customizado resolvido para: ${customGatewayData.endpointUsed}`);
  console.log(`  ✓ Retorno diagnóstico do gateway: ${customGatewayData.error || customGatewayData.message}\n`);

  // -------------------------------------------------------------------------
  // TESTE 5: Chamada End-to-End no AI Gateway (/api/ai/chat) com AIProviderService
  // -------------------------------------------------------------------------
  console.log("[5/5] Testando execução do chat no backend via AI Gateway...");
  // Login como cliente
  const clientLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cliente@orvexa.digital",
      password: "ClienteOrvexa2026!",
    }),
  });
  const clientCookie = clientLoginRes.headers.get("set-cookie");

  const chatRes = await fetch(`${baseUrl}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: clientCookie,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Diga 'ORVEXA AI Provider Layer OK' em uma linha." }],
      modelPreference: "orvexa-prime",
    }),
  });

  assert.strictEqual(chatRes.status, 200, "Chat deve responder com status 200");
  const intent = chatRes.headers.get("x-orvexa-intent");
  const modelName = chatRes.headers.get("x-orvexa-model");
  const keyStatus = chatRes.headers.get("x-orvexa-key-status");
  const streamText = await chatRes.text();

  console.log(`  ✓ Resposta recebida (HTTP 200 Streaming)`);
  console.log(`    - Intenção detectada: ${intent}`);
  console.log(`    - Modelo roteado: ${modelName}`);
  console.log(`    - Status da chave: ${keyStatus}`);
  console.log(`    - Trecho do stream: "${streamText.slice(0, 100).replace(/\n/g, " ")}..."\n`);

  console.log("===============================================================================");
  console.log("🎉 TODOS OS 5 TESTES DA CAMADA AI PROVIDER LAYER FORAM APROVADOS COM SUCESSO!");
  console.log("===============================================================================");
}

runTests().catch((err) => {
  console.error("❌ FALHA NO TESTE:", err);
  process.exit(1);
});

