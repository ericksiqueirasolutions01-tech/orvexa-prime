// scripts/test-vercel-save-and-chat.ts
async function run() {
  const BASE = "https://orvexa-prime.vercel.app";

  console.log("1. Login no Vercel...");
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@orvexa.digital", password: "AdminOrvexa2026!" }),
  });
  console.log("Login HTTP Status:", loginRes.status);
  const authCookie = loginRes.headers.get("set-cookie")?.split(";")[0] || "";

  console.log("2. Admin cadastra API no Vercel...");
  const saveRes = await fetch(`${BASE}/api/admin/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      name: "Clipoos Produção",
      providerId: "openai",
      rawApiKey: "sk-clipoos-test-key-live",
      tokenLimitMonthly: 50000000,
      customBaseUrl: "https://proxy.clipoos.online/v1",
      capabilities: ["TEXTO", "CODIGO", "DOCUMENTO"],
      detectedModels: ["gpt-4o", "gpt-4o-mini"],
      priority: 1,
      status: "ACTIVE",
      forceSave: true,
    }),
  });

  console.log("Save HTTP Status:", saveRes.status);
  const saveData = await saveRes.json();
  console.log("Save Response:", saveData);
  
  // Extrai cookies setados
  const setCookies = saveRes.headers.get("set-cookie") || "";
  console.log("Set-Cookie retornado pelo Vercel:", setCookies ? "SIM" : "NÃO");

  const syncMatch = setCookies.match(/orvexa_ai_sync=([^;]+)/);
  const syncCookie = syncMatch ? `orvexa_ai_sync=${syncMatch[1]}` : "";
  const combinedCookies = [authCookie, syncCookie].filter(Boolean).join("; ");

  console.log("3. Admin consulta APIs no Vercel...");
  const keysRes = await fetch(`${BASE}/api/admin/api-keys`, {
    headers: { Cookie: combinedCookies },
  });
  const keysData = await keysRes.json();
  console.log("APIs no Vercel:", keysData.keys?.map((k: any) => ({ id: k.id, name: k.name })));

  console.log("4. Consulta modelos no Vercel...");
  const modelsRes = await fetch(`${BASE}/api/ai/models`, {
    headers: { Cookie: combinedCookies },
  });
  const modelsData = await modelsRes.json();
  console.log("Modelos no Vercel:", modelsData);
}

run().catch(console.error);

