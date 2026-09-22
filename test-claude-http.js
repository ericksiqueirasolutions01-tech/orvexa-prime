async function testClaudeViaHttp() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cliente@orvexa.digital",
      password: "ClienteOrvexa2026!",
    }),
  });

  const cookie = loginRes.headers.get("set-cookie");

  console.log("\nEnviando pergunta para o Claude via AI Gateway...");
  const chatRes = await fetch("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Olá Claude! Escreva uma frase motivacional empolgante para a equipe da ORVEXA." }],
      modelPreference: "claude",
    }),
  });

  console.log("Chat Status:", chatRes.status);
  console.log("Header x-orvexa-model:", chatRes.headers.get("x-orvexa-model"));
  console.log("Header x-orvexa-key-status:", chatRes.headers.get("x-orvexa-key-status"));

  const text = await chatRes.text();
  console.log("\n=== Resposta do Claude em Tempo Real ===");
  console.log(text);
}

testClaudeViaHttp();

