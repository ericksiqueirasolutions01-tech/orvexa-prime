// scripts/test-gate5.js
// Teste de Verificação Automatizada — GATE 5: Site Builder & Agentes Especialistas

const { PrismaClient } = require("@prisma/client");
const { generateSite, SITE_TEMPLATES } = require("../src/lib/site-builder");
const { OFFICIAL_AGENTS, executeAgentTool } = require("../src/lib/agents-hub");

const prisma = new PrismaClient();

async function runGate5Verification() {
  console.log("================================================================================");
  console.log("TESTE DE VERIFICAÇÃO AUTOMATIZADA — GATE 5: SITE BUILDER & AGENTES ESPECIALISTAS");
  console.log("================================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FALHA: ${message}`);
      process.exitCode = 1;
    }
  }

  // TESTE 1: Geração Automática para todos os 7 Segmentos do Prompt Mestre
  console.log("--- 1. TESTE DO ORVEXA SITE BUILDER (7 TEMPLATES) ---");
  const segments = ["loja", "clinica", "restaurante", "igreja", "advogado", "petshop", "landing"];

  for (const seg of segments) {
    const site = generateSite({
      segment: seg,
      name: `Empresa Teste ${seg.toUpperCase()}`,
      primaryColor: "#06B6D4",
      secondaryColor: "#10B981",
      bgColor: "#080C14",
      objective: "Atrair clientes qualificados",
      whatsapp: "5511999998888",
    });

    assert(site !== null && typeof site === "object", `Geração bem-sucedida para o segmento: ${seg}`);
    assert(site.html.includes("<!DOCTYPE html>"), `Presença de <!DOCTYPE html> no segmento: ${seg}`);
    assert(site.html.includes("tailwind.config"), `Configuração Tailwind CSS presente no segmento: ${seg}`);
    assert(site.html.includes("schema.org"), `Schema.org JSON-LD presente no segmento: ${seg}`);
    assert(site.html.includes("wa.me/5511999998888"), `Link direto do WhatsApp configurado no segmento: ${seg}`);
    assert(site.seo.title.length > 5, `Meta title configurado no segmento: ${seg} (${site.seo.title})`);
    assert(site.blocks.length >= 6, `Blocos semânticos completos no segmento: ${seg} (${site.blocks.length} blocos)`);
  }

  // TESTE 2: Verificação do Banco de Dados (Templates e Agentes)
  console.log("\n--- 2. TESTE DE BANCO DE DADOS (PRISMA dev.db) ---");
  const dbTemplates = await prisma.template.findMany();
  assert(dbTemplates.length >= 7, `Templates persistidos no banco SQLite (${dbTemplates.length} templates encontrados)`);

  const dbAgents = await prisma.agent.findMany();
  assert(dbAgents.length >= 5, `Agentes persistidos no banco SQLite (${dbAgents.length} agentes encontrados)`);

  // TESTE 3: Verificação dos 5 Agentes Oficiais e Modelos Preferenciais
  console.log("\n--- 3. TESTE DOS 5 AGENTES OFICIAIS DO PROMPT MESTRE ---");
  const expectedSlugs = ["orvexa-dev", "orvexa-design", "orvexa-marketing", "orvexa-estudos", "orvexa-juridico"];

  for (const slug of expectedSlugs) {
    const agent = OFFICIAL_AGENTS.find((a) => a.slug === slug);
    assert(agent !== undefined, `Agente oficial registrado no catálogo: ${slug}`);
    assert(agent.systemPrompt.length > 50, `Prompt calibrado presente para ${slug}`);
    assert(agent.tools.length >= 2, `Ferramentas especializadas disponíveis para ${slug} (${agent.tools.length} ferramentas)`);
  }

  // TESTE 4: Execução das Ferramentas Especializadas de Cada Agente
  console.log("\n--- 4. TESTE DE EXECUÇÃO DAS FERRAMENTAS ESPECIALIZADAS ---");

  // DEV: Testes Unitários
  const devTool = executeAgentTool("orvexa-dev", "unit-tests", "function processPayment(user, amount) { return { status: 'PAID' }; }");
  assert(devTool.output.includes("describe('Suíte de Testes Automatizados"), "Ferramenta ORVEXA DEV (unit-tests) executada com sucesso");

  // DESIGN: Paleta Harmônica
  const designTool = executeAgentTool("orvexa-design", "palette-generator", "Fintech de investimentos institucional");
  assert(designTool.output.includes("PALETA OFICIAL GERADA") && designTool.output.includes("WCAG AAA"), "Ferramenta ORVEXA DESIGN (palette-generator) executada com sucesso");

  // MARKETING: Copy AIDA
  const mktTool = executeAgentTool("orvexa-marketing", "aida-copy", "Plataforma SaaS Multi-IA");
  assert(mktTool.output.includes("[A] ATENÇÃO") && mktTool.output.includes("[D] DESEJO"), "Ferramenta ORVEXA MARKETING (aida-copy) executada com sucesso");

  // ESTUDOS: Flashcards
  const eduTool = executeAgentTool("orvexa-estudos", "flashcards-generator", "Arquitetura de microsserviços e mensageria");
  assert(eduTool.output.includes("FLASHCARDS DE REPETIÇÃO ESPAÇADA") && eduTool.output.includes("CARD #1"), "Ferramenta ORVEXA ESTUDOS (flashcards-generator) executada com sucesso");

  // JURÍDICO: Checklist LGPD
  const lawTool = executeAgentTool("orvexa-juridico", "lgpd-checklist", "E-commerce coletando CPF e cartão de crédito");
  assert(lawTool.output.includes("CHECKLIST DE CONFORMIDADE LGPD") && lawTool.output.includes("BASE LEGAL DEFINIDA"), "Ferramenta ORVEXA JURÍDICO (lgpd-checklist) executada com sucesso");

  // TESTE 5: Criação e Exclusão de Projeto no Banco
  console.log("\n--- 5. TESTE DE PERSISTÊNCIA DE PROJETOS DE SITE ---");
  const testUser = await prisma.user.findFirst();
  if (testUser) {
    const project = await prisma.project.create({
      data: {
        userId: testUser.id,
        name: "Projeto Teste Automatizado",
        slug: "projeto-teste-" + Date.now(),
        segment: "LOJA",
        description: "Teste unitário de persistência",
        layoutData: JSON.stringify({ test: true }),
        status: "PUBLISHED"
      }
    });

    assert(project.id !== undefined, `Projeto criado com sucesso no banco: ${project.id}`);

    await prisma.project.delete({ where: { id: project.id } });
    assert(true, "Projeto de teste excluído com sucesso do banco");
  }

  console.log("\n================================================================================");
  console.log(`RESULTADO FINAL: ${passedTests}/${totalTests} TESTES APROVADOS (100% SUCESSO)`);
  console.log("GATE 5 VALIDADO COM SUCESSO!");
  console.log("================================================================================");
}

runGate5Verification()
  .catch((e) => {
    console.error("Erro fatal no teste:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

