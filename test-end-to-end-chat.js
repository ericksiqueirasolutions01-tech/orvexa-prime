const { executeAiGatewayStream } = require("./src/lib/ai-gateway");
const { prisma } = require("./src/lib/prisma");

async function testGatewayEndToEnd() {
  const user = await prisma.user.findFirst({ where: { email: "cliente@orvexa.digital" } });

  console.log("=== Testando AI Gateway da ORVEXA com Mirai API ===");
  const result = await executeAiGatewayStream({
    userId: user.id,
    userRole: "USER",
    messages: [
      { role: "user", content: "Olá! Qual é a capital do Brasil e cite 3 vantagens da inteligência artificial?" }
    ],
    selectedModelPreference: "openai", // Roteia para Mirai Codex (gpt-5.6-sol)
  });

  console.log("Decisão do Gateway:", result.decision.modelName, "via", result.decision.providerSlug);
  console.log("Chave utilizada:", result.apiKeyName);

  // Lê stream
  const reader = result.stream.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }

  console.log("\n=== RESPOSTA RECEBIDA DA IA EM TEMPO REAL ===");
  console.log(text);
  console.log("\n✓ Teste concluído com sucesso!");
}

testGatewayEndToEnd().catch(console.error).finally(() => prisma.$disconnect());

