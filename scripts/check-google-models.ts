import { prisma } from "../src/lib/prisma";
import { decryptApiKey } from "../src/lib/crypto";

async function main() {
  const geminiKey = await prisma.apiKey.findFirst({
    where: { provider: { slug: "google" } },
  });
  if (!geminiKey) return;
  const rawKey = decryptApiKey(geminiKey.encryptedKey, geminiKey.iv, geminiKey.authTag);

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${rawKey}`);
  const data = await res.json();
  const models = data.models?.map((m: any) => m.name.replace("models/", "")) || [];
  console.log("Real Google Models:", models);
}

main().finally(() => prisma.$disconnect());

