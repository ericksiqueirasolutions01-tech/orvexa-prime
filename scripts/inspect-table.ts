import { prisma } from "../src/lib/prisma";

async function main() {
  const info = await prisma.$queryRawUnsafe("PRAGMA table_info(ai_provider_accounts)");
  console.log(info);
}

main().catch(console.error);
