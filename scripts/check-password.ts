import { prisma } from "../src/lib/prisma";
import { verifyPassword } from "../src/lib/auth";

async function checkPasswords() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    const isMaster = await verifyPassword("AdminSenhaSegura2026!", u.passwordHash);
    const isOrvexa = await verifyPassword("OrvexaAdmin2026!", u.passwordHash);
    const isCliente = await verifyPassword("ClienteSenhaSegura2026!", u.passwordHash);
    console.log(`User: ${u.email}`, {
      isMaster,
      isOrvexa,
      isCliente,
    });
  }
}

checkPasswords().catch(console.error);

