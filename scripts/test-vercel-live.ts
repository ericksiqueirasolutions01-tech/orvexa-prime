async function testVercel() {
  const loginRes = await fetch("https://orvexa-prime.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@orvexa.digital",
      password: "AdminSenhaSegura2026!",
    }),
  });

  console.log("Vercel Login Status:", loginRes.status);
  const cookies = loginRes.headers.get("set-cookie");
  console.log("Got Cookies:", !!cookies);

  if (cookies) {
    const capRes = await fetch("https://orvexa-prime.vercel.app/api/admin/system/api-capabilities", {
      headers: { Cookie: cookies },
    });
    console.log("Vercel Capabilities Status:", capRes.status);
    if (capRes.ok) {
      const data = await capRes.json();
      console.log("Vercel Capabilities Success:", data.success);
      console.log("API Active:", data.apiInfo?.name);
    }
  }
}

testVercel().catch(console.error);
