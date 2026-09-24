import { prisma } from "../src/lib/prisma";

async function main() {
  const activeApiKeys = await prisma.apiKey.findMany({
    where: { status: "ACTIVE" },
    include: { provider: true },
  });
  console.log("Active keys:", activeApiKeys.length);

  const activeModelsDb = await prisma.aiModel.findMany({
    where: { isActive: true },
    include: { provider: true },
  });
  console.log("Active models in DB:", activeModelsDb.map(m => m.modelIdentifier));

  const allAgents = await prisma.agent.findMany();
  console.log("Total agents:", allAgents.length);
}

main().catch(console.error);
