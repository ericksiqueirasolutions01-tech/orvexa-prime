async function testMiraiApi() {
  const baseUrl = "https://api.miraiapi.com/v1";

  const keys = [
    { label: "Codex sk-", key: "sk-lOlWI7nTnv6CtAWWrrerBHyhMLVJLF7z757tOPcN1t0OoD2r", model: "gpt-4o" },
    { label: "Claude sk-", key: "sk-ise0qYxQ2uPRnb6vUaspA1I1JRauQCgLJDzSXRRmPXSweTcs", model: "claude-3-5-sonnet-20241022" },
    { label: "Codex MR-", key: "MR-EE6D174ECD301E4189AA4DBC7842CA34D35EECF88F6D3CF5", model: "gpt-4o" },
    { label: "Claude MR-", key: "MR-3C4C31AD800269E0AED47F5167189AD99A0868E58331852E", model: "claude-3-5-sonnet-20241022" },
  ];

  console.log("=== 1. Testando /models na Mirai API ===");
  for (const item of keys) {
    try {
      const res = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${item.key}` },
      });
      console.log(`[${item.label}] /models Status:`, res.status);
      if (res.ok) {
        const data = await res.json();
        console.log(`[${item.label}] Modelos encontrados:`, data.data ? data.data.map(m => m.id).slice(0, 5) : data);
      } else {
        console.log(`[${item.label}] Erro:`, (await res.text()).slice(0, 150));
      }
    } catch (e) {
      console.log(`[${item.label}] Falha de rede:`, e.message);
    }
  }

  console.log("\n=== 2. Testando /chat/completions na Mirai API ===");
  for (const item of keys) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${item.key}`,
        },
        body: JSON.stringify({
          model: item.model,
          messages: [{ role: "user", content: "Diga apenas 'Conectado com Sucesso!'" }],
          max_tokens: 30,
        }),
      });
      console.log(`[${item.label}] /chat/completions Status:`, res.status);
      const text = await res.text();
      console.log(`[${item.label}] Resposta:`, text.slice(0, 250));
    } catch (e) {
      console.log(`[${item.label}] Erro no chat:`, e.message);
    }
  }
}

testMiraiApi();

