async function listAllModels() {
  const baseUrl = "https://api.miraiapi.com/v1";
  const codexKey = "sk-lOlWI7nTnv6CtAWWrrerBHyhMLVJLF7z757tOPcN1t0OoD2r";
  const claudeKey = "sk-ise0qYxQ2uPRnb6vUaspA1I1JRauQCgLJDzSXRRmPXSweTcs";

  const res1 = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${codexKey}` },
  });
  const data1 = await res1.json();
  console.log("=== Modelos Liberados para a Chave Codex ===");
  console.log(data1.data.map(m => m.id));

  const res2 = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${claudeKey}` },
  });
  const data2 = await res2.json();
  console.log("\n=== Modelos Liberados para a Chave Claude ===");
  console.log(data2.data.map(m => m.id));
}

listAllModels();

