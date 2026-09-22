async function testChatCompletions() {
  const baseUrl = "https://api.miraiapi.com/v1";
  const codexKey = "sk-lOlWI7nTnv6CtAWWrrerBHyhMLVJLF7z757tOPcN1t0OoD2r";
  const claudeKey = "sk-ise0qYxQ2uPRnb6vUaspA1I1JRauQCgLJDzSXRRmPXSweTcs";

  console.log("=== 1. Testando gpt-5.6-luna (Codex Key) ===");
  try {
    const res1 = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${codexKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        messages: [{ role: "user", content: "Olá! Responda: 'ORVEXA AI CONECTADA COM SUCESSO!'" }],
        max_tokens: 50,
      }),
    });
    console.log("Status Codex:", res1.status);
    const data1 = await res1.json();
    console.log("Resposta Codex:", data1.choices?.[0]?.message?.content || data1);
  } catch (e) {
    console.log("Erro Codex:", e.message);
  }

  console.log("\n=== 2. Testando claude-sonnet-5 (Claude Key) ===");
  try {
    const res2 = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${claudeKey}`,
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        messages: [{ role: "user", content: "Olá! Responda: 'CLAUDE CONECTADO NA ORVEXA!'" }],
        max_tokens: 50,
      }),
    });
    console.log("Status Claude:", res2.status);
    const data2 = await res2.json();
    console.log("Resposta Claude:", data2.choices?.[0]?.message?.content || data2);
  } catch (e) {
    console.log("Erro Claude:", e.message);
  }
}

testChatCompletions();

