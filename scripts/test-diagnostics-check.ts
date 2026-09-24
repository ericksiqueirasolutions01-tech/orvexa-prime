// scripts/test-diagnostics-check.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function login(email: string, pass: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  const setCookie = res.headers.get("set-cookie");
  return setCookie!.split(";")[0];
}

async function main() {
  const adminCookie = await login("admin@orvexa.digital", "AdminOrvexa2026!");
  const res = await fetch(`${BASE_URL}/api/admin/system/api-capabilities`, {
    headers: { Cookie: adminCookie },
  });
  const data = await res.json();
  console.log("Diagnostics result:");
  console.log("- API Info:", data.apiInfo);
  console.log("- Detected Models:", data.detectedModels?.map((m: any) => m.identifier));
  console.log("- Capabilities:", data.capabilities?.map((c: any) => `${c.name}: ${c.supported}`));
  console.log("- Summary:", data.summary);
}

main().catch(console.error).finally(() => prisma.$disconnect());
