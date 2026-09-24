import { createAuthToken, AUTH_COOKIE_NAME } from "../src/lib/auth";

async function testPage() {
  const adminToken = await createAuthToken({
    id: "0867ad33-2c32-4cab-84ec-af462b920862",
    email: "admin@orvexa.digital",
    role: "ADMIN",
    status: "ACTIVE",
    name: "Administrador ORVEXA",
  });

  const res = await fetch("http://localhost:3000/admin/system/diagnostics", {
    headers: {
      Cookie: `${AUTH_COOKIE_NAME}=${adminToken}`,
    },
  });

  console.log("Page Status:", res.status);
  const text = await res.text();
  console.log("Includes Diagnóstico:", text.includes("Diagnóstico de Capacidades"));
  console.log("Length:", text.length);
}

testPage().catch(console.error);
