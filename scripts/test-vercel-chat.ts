async function testVercelChat() {
  const loginRes = await fetch("https://orvexa-prime.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cliente.real@orvexa.digital",
      password: "ClienteSenhaSegura2026!",
    }),
  });

  const cookies = loginRes.headers.get("set-cookie");
  console.log("Client Logged In on Vercel:", loginRes.status, !!cookies);

  if (!cookies) return;

  const chatRes = await fetch("https://orvexa-prime.vercel.app/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Olá, responda apenas: VERCEL ONLINE" }],
      modelPreference: "orvexa-prime",
    }),
  });

  console.log("Chat HTTP Status on Vercel:", chatRes.status);
  const text = await chatRes.text();
  console.log("Chat SSE Stream Output:\n", text.slice(0, 500));
}

testVercelChat().catch(console.error);

