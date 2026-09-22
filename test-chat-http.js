async function testChatViaHttp() {
  // 1. Login como cliente
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cliente@orvexa.digital",
      password: "ClienteOrvexa2026!",
    }),
  });

  const cookie = loginRes.headers.get("set-cookie");
  console.log("Login Status:", loginRes.status, "Cookie recebido:", !!cookie);

  // 2. Chama o AI Gateway para OpenAI (Mirai)
  console.log("\nEnviando pergunta para a IA via AI Gateway...");
  const chatRes = await fetch("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Olá! Responda em 1 linha: Quem é você e o que é a ORVEXA?" }],
      modelPreference: "openai",
    }),
  });

  console.log("Chat Status:", chatRes.status);
  console.log("Header x-orvexa-model:", chatRes.headers.get("x-orvexa-model"));
  console.log("Header x-orvexa-key-status:", chatRes.headers.get("x-orvexa-key-status"));

  const text = await chatRes.text();
  console.log("\n=== Resposta da IA via Streaming SSE ===");
  console.log(text);
}

testChatViaHttp();

