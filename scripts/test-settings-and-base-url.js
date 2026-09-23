// scripts/test-settings-and-base-url.js
// Valida salvamento e leitura de openaiBaseUrl via API de Settings e comportamento da Base URL

const assert = require("assert");

async function testSettings() {
  console.log("===============================================================================");
  console.log("🧪 TESTANDO PERSISTÊNCIA E LEITURA DE OPENAI_BASE_URL");
  console.log("===============================================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Login Admin
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@orvexa.digital", password: "AdminOrvexa2026!" }),
  });
  const cookie = loginRes.headers.get("set-cookie");

  // 2. Salva uma URL Base personalizada via POST /api/admin/settings
  console.log("[1/3] Salvando openaiBaseUrl personalizada ('https://api.miraiapi.com/v1')...");
  const saveRes = await fetch(`${baseUrl}/api/admin/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      openaiBaseUrl: "https://api.miraiapi.com/v1",
    }),
  });
  assert.strictEqual(saveRes.status, 200, "Deve salvar com sucesso");

  // 3. Lê de volta via GET /api/admin/settings
  console.log("[2/3] Verificando recuperação de openaiBaseUrl salva...");
  const getRes = await fetch(`${baseUrl}/api/admin/settings`, {
    headers: { Cookie: cookie },
  });
  const getData = await getRes.json();
  assert.strictEqual(getData.settings.openaiBaseUrl, "https://api.miraiapi.com/v1", "openaiBaseUrl deve corresponder ao valor salvo");
  console.log(`  ✓ Confirmado: openaiBaseUrl retornado = "${getData.settings.openaiBaseUrl}"`);

  // 4. Teste de chave sem customBaseUrl individual -> deve herdar a URL global salva
  console.log("[3/3] Validando que teste sem URL individual herda a URL global salva...");
  const testRes = await fetch(`${baseUrl}/api/admin/api-keys/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      rawApiKey: "sk-fake-test-key",
      providerSlug: "openai",
    }),
  });
  const testData = await testRes.json();
  assert(testData.endpointUsed.includes("api.miraiapi.com/v1"), `Deve ter usado a URL global salva. Usou: ${testData.endpointUsed}`);
  console.log(`  ✓ Confirmado: herdou "${testData.endpointUsed}" da configuração global!`);

  console.log("\n===============================================================================");
  console.log("🎉 PERSISTÊNCIA E HERANÇA DE OPENAI_BASE_URL TOTALMENTE APROVADAS!");
  console.log("===============================================================================");
}

testSettings().catch((err) => {
  console.error("❌ FALHA:", err);
  process.exit(1);
});

