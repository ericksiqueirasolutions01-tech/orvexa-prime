// scripts/seed-gate5.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TEMPLATES = [
  {
    slug: "loja",
    segment: "LOJA",
    name: "Orvexa Commerce",
    description: "Layout de alta conversão para produtos físicos ou digitais com grade de itens, destaques e checkout via WhatsApp.",
    layoutData: JSON.stringify({
      primaryColor: "#06B6D4",
      secondaryColor: "#10B981",
      bgColor: "#090D16",
      features: ["Catálogo de Produtos com Preços", "Botão Pedir pelo WhatsApp", "Cálculo de Frete Simulado", "Garantia e Selos de Confiança"]
    })
  },
  {
    slug: "clinica",
    segment: "CLINICA",
    name: "Orvexa Med & Estética",
    description: "Design moderno, higiênico e acolhedor para médicos, dentistas, psicólogos e clínicas de estética com agendamento online.",
    layoutData: JSON.stringify({
      primaryColor: "#0EA5E9",
      secondaryColor: "#14B8A6",
      bgColor: "#070D18",
      features: ["Corpo Clínico & Especialistas", "Agendamento de Consultas", "Depoimentos de Pacientes", "Dúvidas Frequentes (FAQ)"]
    })
  },
  {
    slug: "restaurante",
    segment: "RESTAURANTE",
    name: "Orvexa Gourmet",
    description: "Visual apetitoso com cardápio digital por abas, fotos em destaque, reserva de mesas e pedidos instantâneos via WhatsApp.",
    layoutData: JSON.stringify({
      primaryColor: "#F59E0B",
      secondaryColor: "#EF4444",
      bgColor: "#0F0B08",
      features: ["Cardápio Interativo por Categorias", "Reserva de Mesas Online", "Horários de Funcionamento", "Link Direto p/ Delivery"]
    })
  },
  {
    slug: "igreja",
    segment: "IGREJA",
    name: "Orvexa Faith & Church",
    description: "Portal inspirador para igrejas e ministérios com programação dos cultos, transmissão ao vivo, células e pedidos de oração.",
    layoutData: JSON.stringify({
      primaryColor: "#8B5CF6",
      secondaryColor: "#EC4899",
      bgColor: "#0D0A17",
      features: ["Horários dos Cultos e Eventos", "Player de Transmissão ao Vivo", "Ministérios e Grupos Familiares", "Canal de Contribuição e Doações"]
    })
  },
  {
    slug: "advogado",
    segment: "ADVOGADO",
    name: "Orvexa Law & Juris",
    description: "Autoridade e elegância jurídica com áreas de atuação especializadas, credenciais da OAB e formulário de consulta confidencial.",
    layoutData: JSON.stringify({
      primaryColor: "#D97706",
      secondaryColor: "#64748B",
      bgColor: "#0B0C10",
      features: ["Áreas de Especialidade Jurídica", "Perfil dos Sócios e OAB", "Consulta Confidencial Expressa", "Artigos e Pareceres Informativos"]
    })
  },
  {
    slug: "petshop",
    segment: "PETSHOP",
    name: "Orvexa Pet Care",
    description: "Ambiente lúdico e confiável para banho e tosa, consultas veterinárias, hotelzinho e produtos para pets com agendamento rápido.",
    layoutData: JSON.stringify({
      primaryColor: "#10B981",
      secondaryColor: "#F59E0B",
      bgColor: "#07120D",
      features: ["Tabela de Serviços (Banho/Tosa)", "Plantão Veterinário", "Depoimentos de Tutores", "Agendamento pelo WhatsApp"]
    })
  },
  {
    slug: "landing",
    segment: "LANDING",
    name: "Orvexa High-Convert",
    description: "Estrutura científica de copywriting para captura de leads, vendas diretas de produtos digitais, mentorias e softwares.",
    layoutData: JSON.stringify({
      primaryColor: "#06B6D4",
      secondaryColor: "#8B5CF6",
      bgColor: "#050811",
      features: ["Headline com Gatilhos Mentais", "Comparativo de Benefícios", "Contador Regressivo de Escassez", "Garantia Blindada de 7 Dias"]
    })
  }
];

const AGENTS = [
  {
    slug: "orvexa-dev",
    name: "ORVEXA DEV",
    role: "Engenharia de Software & Código",
    category: "PROGRAMACAO",
    iconName: "Code2",
    description: "Engenheiro de software e arquiteto de soluções sênior. Especialista em TypeScript, Python, bancos de dados, debug de produção, Clean Architecture e testes unitários.",
    systemPrompt: "Você é o ORVEXA DEV, arquiteto de software sênior da ORVEXA PRIME DIGITAL. Entregue código limpo, tipado e com testes."
  },
  {
    slug: "orvexa-design",
    name: "ORVEXA DESIGN",
    role: "UI/UX & Design Systems",
    category: "DESIGN",
    iconName: "Palette",
    description: "Diretor de arte e especialista em UI/UX. Constrói paletas de cores harmônicas, design systems escaláveis em Tailwind CSS, tipografia e contraste WCAG AAA.",
    systemPrompt: "Você é o ORVEXA DESIGN, diretor criativo e especialista em UI/UX da ORVEXA PRIME DIGITAL. Foco em estética moderna, acessibilidade e microinterações."
  },
  {
    slug: "orvexa-marketing",
    name: "ORVEXA MARKETING",
    role: "Growth & Copywriting",
    category: "MARKETING",
    iconName: "Megaphone",
    description: "Estrategista de Growth, Neuromarketing e Copywriting persuasivo. Domina frameworks AIDA, PAS, anúncios Meta/Google e funis de alta conversão.",
    systemPrompt: "Você é o ORVEXA MARKETING, diretor de growth e copywriting da ORVEXA PRIME DIGITAL. Textos magnéticos focados em conversão."
  },
  {
    slug: "orvexa-estudos",
    name: "ORVEXA ESTUDOS",
    role: "Síntese Didática & Método Feynman",
    category: "EDUCACAO",
    iconName: "GraduationCap",
    description: "Tutor pedagógico e acadêmico para síntese de conteúdos complexos. Especialista no Método Feynman, flashcards Anki e aprendizado acelerado.",
    systemPrompt: "Você é o ORVEXA ESTUDOS, mentor pedagógico sênior da ORVEXA PRIME DIGITAL. Transforme assuntos difíceis em explicações claras e didáticas."
  },
  {
    slug: "orvexa-juridico",
    name: "ORVEXA JURÍDICO",
    role: "Compliance, LGPD & Contratos",
    category: "JURIDICO",
    iconName: "Scale",
    description: "Consultor em direito empresarial, contratos comerciais, conformidade com a LGPD e análise preventiva de riscos legais.",
    systemPrompt: "Você é o ORVEXA JURÍDICO, consultor especializado em compliance corporativo e direito digital da ORVEXA PRIME DIGITAL."
  }
];

async function main() {
  console.log("Iniciando Seed do GATE 5...");

  // 1. Templates
  for (const t of TEMPLATES) {
    await prisma.template.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        segment: t.segment,
        description: t.description,
        layoutData: t.layoutData,
        isSystem: true
      },
      create: {
        slug: t.slug,
        name: t.name,
        segment: t.segment,
        description: t.description,
        layoutData: t.layoutData,
        isSystem: true
      }
    });
  }
  console.log(`✓ ${TEMPLATES.length} Templates inseridos/atualizados com sucesso!`);

  // 2. Agentes
  for (const a of AGENTS) {
    await prisma.agent.upsert({
      where: { slug: a.slug },
      update: {
        name: a.name,
        description: a.description,
        systemPrompt: a.systemPrompt,
        category: a.category,
        iconName: a.iconName,
        isActive: true
      },
      create: {
        slug: a.slug,
        name: a.name,
        description: a.description,
        systemPrompt: a.systemPrompt,
        category: a.category,
        iconName: a.iconName,
        isActive: true
      }
    });
  }
  console.log(`✓ ${AGENTS.length} Agentes inseridos/atualizados com sucesso!`);
}

main()
  .catch((e) => {
    console.error("Erro no Seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

