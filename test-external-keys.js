async function testKeys() {
  const codexKey = "MR-EE6D174ECD301E4189AA4DBC7842CA34D35EECF88F6D3CF5";
  const claudeKey = "MR-3C4C31AD800269E0AED47F5167189AD99A0868E58331852E";

  console.log("=== Testando Chave OpenAI/Codex direta ===");
  try {
    const res1 = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${codexKey}` },
    });
    console.log("OpenAI Status:", res1.status, await res1.text());
  } catch (e) {
    console.log("OpenAI Error:", e.message);
  }

  console.log("\n=== Testando Chave Anthropic Claude direta ===");
  try {
    const res2 = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
    });
    console.log("Anthropic Status:", res2.status, await res2.text());
  } catch (e) {
    console.log("Anthropic Error:", e.message);
  }
}

testKeys();

