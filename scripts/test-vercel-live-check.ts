async function check() {
  try {
    const loginRes = await fetch("https://orvexa-prime.vercel.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@orvexa.digital", password: "AdminOrvexa2026!" }),
    });
    console.log("Login HTTP Status:", loginRes.status);
    const cookie = loginRes.headers.get("set-cookie")?.split(";")[0];
    if (!cookie) {
      console.log("Cookie não retornado");
      return;
    }

    const keysRes = await fetch("https://orvexa-prime.vercel.app/api/admin/api-keys", {
      headers: { Cookie: cookie },
    });
    const keysData = await keysRes.json();
    console.log("Admin API Keys no Vercel:", keysData.keys?.length ?? "Erro");

    const modelsRes = await fetch("https://orvexa-prime.vercel.app/api/ai/models", {
      headers: { Cookie: cookie },
    });
    const modelsData = await modelsRes.json();
    console.log("Modelos visíveis no Vercel:", {
      activeApiConfigured: modelsData.activeApiConfigured,
      modelsCount: modelsData.models?.length,
    });
  } catch (err: any) {
    console.error("Erro na verificação Vercel:", err?.message || err);
  }
}

check();
