import { prisma } from "../src/lib/prisma";
import { decryptApiKey } from "../src/lib/crypto";

async function main() {
  const geminiKey = await prisma.apiKey.findFirst({
    where: { provider: { slug: "google" } },
  });
  if (!geminiKey) return;
  const rawKey = decryptApiKey(geminiKey.encryptedKey, geminiKey.iv, geminiKey.authTag);

  const testModels = ["gemini-flash-latest", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-pro-latest"];
  for (const model of testModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${rawKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Responda apenas: OK" }] }],
      }),
    });
    console.log(`Model ${model}: status = ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`Response:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
    } else {
      console.log(`Error:`, await res.text());
    }
  }
}

main().finally(() => prisma.$disconnect());

