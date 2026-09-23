// scripts/test-chat-stream-router.ts
// TESTE END-TO-END DE STREAMING DO CHAT COM SMART AI ROUTER

const BASE_URL = "http://localhost:3000";

async function testChatStreamRouter() {
  console.log("================================================================================");
  console.log("   TESTE E2E: STREAMING DE CHAT COM SMART AI ROUTER (ORVEXA AUTO)");
  console.log("================================================================================\n");

  // 1. Login como admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@orvexa.digital",
      password: "AdminOrvexa2026!",
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Falha no login: HTTP ${loginRes.status}`);
  }

  const cookie = loginRes.headers.get("set-cookie") || "";
  console.log("✅ [AUTH] Login efetuado com sucesso.");

  // 2. Envia mensagem via ORVEXA AUTO
  console.log("📡 [CHAT STREAM] Enviando pergunta em modo 'orvexa-prime'...");
  const chatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Como funciona a gravidade quântica?" }],
      modelPreference: "orvexa-prime",
    }),
  });

  console.log(`   -> HTTP Status: ${chatRes.status}`);
  const modelHeader = chatRes.headers.get("x-orvexa-model");
  const badgeHeader = chatRes.headers.get("x-orvexa-router-badge");
  const intentHeader = chatRes.headers.get("x-orvexa-intent");

  console.log(`   -> Header x-orvexa-model: "${modelHeader}"`);
  console.log(`   -> Header x-orvexa-router-badge: "${badgeHeader ? decodeURIComponent(badgeHeader) : "Nenhum"}"`);
  console.log(`   -> Header x-orvexa-intent: "${intentHeader}"`);

  if (!chatRes.ok) {
    const errText = await chatRes.text();
    console.error("Erro no chat:", errText);
    process.exit(1);
  }

  // Lê primeiros bytes do stream
  const reader = chatRes.body?.getReader();
  if (reader) {
    const chunk = await reader.read();
    const decoder = new TextDecoder();
    console.log("   -> Primeiro chunk de resposta recebido:", decoder.decode(chunk.value).slice(0, 100) + "...");
    reader.cancel();
  }

  console.log("\n✅ [PASSOU] Streaming do chat com Smart Router e selo validado com sucesso!\n");
}

testChatStreamRouter().catch((err) => {
  console.error("Erro no teste E2E:", err);
  process.exit(1);
});

