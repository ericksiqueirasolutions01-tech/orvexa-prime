async function testRealKeys() {
  const codexKey = "sk-lOlWI7nTnv6CtAWWrrerBHyhMLVJLF7z757tOPcN1t0OoD2r";
  const claudeKey = "sk-ise0qYxQ2uPRnb6vUaspA1I1JRauQCgLJDzSXRRmPXSweTcs";

  console.log("=== 1. Testando Codex na OpenAI oficial ===");
  try {
    const res1 = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${codexKey}` },
    });
    console.log("OpenAI Status:", res1.status, (await res1.text()).slice(0, 200));
  } catch (e) {
    console.log("OpenAI Error:", e.message);
  }

  console.log("\n=== 2. Testando Claude na Anthropic oficial (x-api-key) ===");
  try {
    const res2 = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
    });
    console.log("Anthropic Status:", res2.status, (await res2.text()).slice(0, 200));
  } catch (e) {
    console.log("Anthropic Error:", e.message);
  }

  console.log("\n=== 3. Testando Claude como Bearer Token na OpenAI oficial ===");
  try {
    const res3 = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${claudeKey}` },
    });
    console.log("OpenAI with Claude key Status:", res3.status, (await res3.text()).slice(0, 200));
  } catch (e) {
    console.log("OpenAI with Claude Error:", e.message);
  }
}

testRealKeys();

