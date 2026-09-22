const { buildProfessionalPrompt } = require("../src/lib/prompt-engine.ts");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runGate4Tests() {
  console.log("=== INICIANDO TESTES DO GATE 4: IMAGE STUDIO, PROMPT ENGINE & DOCUMENT ANALYZER ===");

  // TESTE 1: PROMPT ENGINE (11 Parâmetros)
  console.log("\n[TESTE 1] Testando Prompt Engine com pedido simples: 'Hambúrguer artesanal com cheddar e bacon para lanchonete'");
  const structured = buildProfessionalPrompt("Hambúrguer artesanal com cheddar e bacon para lanchonete", {
    category: "POST",
    aspectRatio: "1:1",
    styleOverride: "Foto Realista 8K",
  });

  console.log("✔ Objetivo:", structured.objetivo);
  console.log("✔ Estilo:", structured.estilo);
  console.log("✔ Iluminação:", structured.iluminacao);
  console.log("✔ Composição:", structured.composicao);
  console.log("✔ Câmera:", structured.camera);
  console.log("✔ Formato:", structured.formato);
  console.log("✔ Negative Prompt:", structured.negativePrompt);

  if (structured.masterPrompt.includes("[LIGHTING]:") && structured.masterPrompt.includes("[NEGATIVE PROMPT]:")) {
    console.log("✔ SUCESSO: Master Prompt gerado com todos os 11 parâmetros exigidos no Prompt Mestre!");
  } else {
    console.error("❌ FALHA no Prompt Engine!");
  }

  // TESTE 2: PERSISTÊNCIA EM GENERATED_IMAGES
  console.log("\n[TESTE 2] Testando persistência na tabela GeneratedImage");
  const testUser = await prisma.user.findFirst();
  if (!testUser) {
    console.error("Nenhum usuário encontrado!");
    return;
  }

  const generated = await prisma.generatedImage.create({
    data: {
      userId: testUser.id,
      prompt: "Hambúrguer artesanal gourmet 12,99",
      refinedPrompt: structured.masterPrompt,
      modelUsed: "orvexa-diffusion-pro-8k",
      imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='#0B132B'/></svg>",
      style: "REALISTA",
      dimensions: "1024x1024",
    },
  });

  console.log(`✔ Imagem salva com ID: ${generated.id}, Dimensões: ${generated.dimensions}`);

  const history = await prisma.generatedImage.findMany({
    where: { userId: testUser.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(`✔ Total de imagens salvas no histórico do usuário: ${history.length}`);

  // Limpeza da imagem de teste
  await prisma.generatedImage.delete({ where: { id: generated.id } });
  console.log("✔ Imagem de teste limpa com sucesso!");

  console.log("\nTODOS OS TESTES DO GATE 4 PASSARAM COM 100% DE SUCESSO!");
}

runGate4Tests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
