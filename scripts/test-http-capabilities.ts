import { createAuthToken, AUTH_COOKIE_NAME } from "../src/lib/auth";

async function testHttp() {
  // Test as ADMIN
  const adminToken = await createAuthToken({
    id: "0867ad33-2c32-4cab-84ec-af462b920862",
    email: "admin@orvexa.digital",
    role: "ADMIN",
    status: "ACTIVE",
    name: "Administrador ORVEXA",
  });

  const res = await fetch("http://localhost:3000/api/admin/system/api-capabilities", {
    headers: {
      Cookie: `${AUTH_COOKIE_NAME}=${adminToken}`,
    },
  });

  console.log("Admin Status:", res.status);
  const data = await res.json();
  console.log("Success:", data.success);
  console.log("API Active Name:", data.apiInfo?.name);
  console.log("Detected Models:", data.detectedModels?.length);
  console.log("Capabilities:", data.capabilities?.map((c: any) => `${c.supported ? '✅' : '❌'} ${c.name}`));
  console.log("Allowed Agents:", data.allowedAgents?.length);
  console.log("Blocked Agents:", data.blockedAgents?.length);

  // Test as normal USER (should be 403 Forbidden)
  const userToken = await createAuthToken({
    id: "701648c6-67a6-49e7-b982-0f9a8b7d0d1b",
    email: "cliente.real@orvexa.digital",
    role: "USER",
    status: "ACTIVE",
    name: "Cliente Real",
  });

  const resUser = await fetch("http://localhost:3000/api/admin/system/api-capabilities", {
    headers: {
      Cookie: `${AUTH_COOKIE_NAME}=${userToken}`,
    },
  });

  console.log("\nNormal User Status:", resUser.status);
  const userData = await resUser.json();
  console.log("User Response (must be 403):", userData);
}

testHttp().catch(console.error);

