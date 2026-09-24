async function testVercel() {
  const loginRes = await fetch("https://orvexa-prime.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@orvexa.digital",
      password: "AdminOrvexa2026!",
    }),
  });

  console.log("Vercel Login Status:", loginRes.status);
  const data = await loginRes.json();
  console.log("Login Body:", data);
  const cookies = loginRes.headers.get("set-cookie");
  console.log("Got Cookies:", !!cookies);

  if (cookies) {
    const capRes = await fetch("https://orvexa-prime.vercel.app/api/admin/system/api-capabilities", {
      headers: { Cookie: cookies },
    });
    console.log("Vercel Capabilities Status:", capRes.status);
    if (capRes.ok) {
      const capData = await capRes.json();
      console.log("Vercel Capabilities Success:", capData.success);
      console.log("API Active Name:", capData.apiInfo?.name);
      console.log("Capabilities:", capData.capabilities?.map((c: any) => `${c.supported ? '✅' : '❌'} ${c.name}`));
      console.log("Allowed Agents:", capData.allowedAgents?.length);
      console.log("Blocked Agents:", capData.blockedAgents?.length);
    }
  }
}

testVercel().catch(console.error);

