async function testCodexModels() {
  const baseUrl = "https://api.miraiapi.com/v1";
  const codexKey = "sk-lOlWI7nTnv6CtAWWrrerBHyhMLVJLF7z757tOPcN1t0OoD2r";
  const models = ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-6-astra", "gpt-5.6-luna"];

  for (const m of models) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${codexKey}`,
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: "user", content: "Olá" }],
          stream: true,
        }),
      });
      console.log(`Modelo ${m}: Status ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`Resposta ${m}:`, text.slice(0, 100));
      }
    } catch (e) {
      console.log(`Erro ${m}:`, e.message);
    }
  }
}

testCodexModels();

