// scripts/test-conversations-api.js
// TESTES AUTOMATIZADOS: ENDPOINTS DE GERENCIAMENTO DE CONVERSAS (CRUD)

const assert = require("assert");

async function testConversations() {
  console.log("===============================================================================");
  console.log("🧪 TESTANDO API DE CONVERSAS E HISTÓRICO — ORVEXA PRIME");
  console.log("===============================================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Login como cliente
  console.log("[1/5] Autenticando usuário de teste...");
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "cliente@orvexa.digital", password: "ClienteOrvexa2026!" }),
  });
  assert.strictEqual(loginRes.status, 200, "Login deve ser 200");
  const cookie = loginRes.headers.get("set-cookie");
  console.log("  ✓ Autenticado com sucesso.\n");

  // 2. Criar nova conversa
  console.log("[2/5] Criando nova conversa via POST /api/ai/conversations...");
  const createRes = await fetch(`${baseUrl}/api/ai/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ title: "Planejamento Estratégico Q4", modelPreference: "orvexa-prime" }),
  });
  const createData = await createRes.json();
  assert.strictEqual(createRes.status, 200, "Criação deve retornar 200");
  assert(createData.conversation.id, "Conversa criada deve ter ID");
  const convId = createData.conversation.id;
  console.log(`  ✓ Conversa criada com sucesso: ID=${convId}, Título="${createData.conversation.title}"\n`);

  // 3. Listar conversas com busca
  console.log("[3/5] Listando conversas via GET /api/ai/conversations...");
  const listRes = await fetch(`${baseUrl}/api/ai/conversations?q=Planejamento`, {
    headers: { Cookie: cookie },
  });
  const listData = await listRes.json();
  assert.strictEqual(listRes.status, 200, "Listagem deve retornar 200");
  const found = listData.conversations.find((c) => c.id === convId);
  assert(found, "Conversa criada deve aparecer nos resultados da busca");
  console.log(`  ✓ Busca retornou conversa com sucesso: "${found.title}"\n`);

  // 4. Renomear conversa via PATCH
  console.log("[4/5] Renomeando conversa via PATCH /api/ai/conversations/:id...");
  const patchRes = await fetch(`${baseUrl}/api/ai/conversations/${convId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ title: "Planejamento Estratégico 2027 (Aprovado)" }),
  });
  const patchData = await patchRes.json();
  assert.strictEqual(patchRes.status, 200, "Patch deve retornar 200");
  assert.strictEqual(patchData.conversation.title, "Planejamento Estratégico 2027 (Aprovado)", "Título deve ter sido atualizado");
  console.log(`  ✓ Conversa renomeada para: "${patchData.conversation.title}"\n`);

  // 5. Excluir conversa via DELETE
  console.log("[5/5] Excluindo conversa via DELETE /api/ai/conversations/:id...");
  const deleteRes = await fetch(`${baseUrl}/api/ai/conversations/${convId}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  const deleteData = await deleteRes.json();
  assert.strictEqual(deleteRes.status, 200, "Delete deve retornar 200");
  assert(deleteData.success, "Sucesso deve ser true");
  console.log("  ✓ Conversa excluída com sucesso.\n");

  console.log("===============================================================================");
  console.log("🎉 TODOS OS TESTES DA API DE CONVERSAS FORAM APROVADOS COM SUCESSO!");
  console.log("===============================================================================");
}

testConversations().catch((err) => {
  console.error("❌ FALHA NO TESTE:", err);
  process.exit(1);
});

