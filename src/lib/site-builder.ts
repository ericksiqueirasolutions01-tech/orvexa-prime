// src/lib/site-builder.ts
// ORVEXA SITE BUILDER — Motor de Geração Automática de Sites Profissionais
// Suporta os 7 segmentos: LOJA, CLINICA, RESTAURANTE, IGREJA, ADVOGADO, PETSHOP, LANDING

export interface SiteBuilderParams {
  segment: "loja" | "clinica" | "restaurante" | "igreja" | "advogado" | "petshop" | "landing";
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
  bgColor?: string;
  objective?: string;
  whatsapp?: string;
  customDetails?: string;
}

export interface SiteBlock {
  id: string;
  type: "header" | "hero" | "features" | "special" | "testimonials" | "contact" | "footer";
  title: string;
  subtitle?: string;
  content?: string;
  items?: any[];
  ctaText?: string;
  ctaLink?: string;
}

export interface GeneratedSite {
  title: string;
  segment: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  html: string;
  blocks: SiteBlock[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogTitle: string;
    ogDescription: string;
    schemaJson: string;
  };
}

// 7 Templates Padrão com metadados para o catálogo
export const SITE_TEMPLATES = [
  {
    slug: "loja",
    segment: "loja",
    name: "Orvexa Commerce",
    category: "E-Commerce & Catálogo",
    description: "Layout de alta conversão para produtos físicos ou digitais com grade de itens, destaques e checkout via WhatsApp.",
    defaultColors: { primary: "#06B6D4", secondary: "#10B981", bg: "#090D16" },
    icon: "ShoppingBag",
    badge: "MAIS POPULAR",
    features: ["Catálogo de Produtos com Preços", "Botão Pedir pelo WhatsApp", "Cálculo de Frete Simulado", "Garantia e Selos de Confiança"],
  },
  {
    slug: "clinica",
    segment: "clinica",
    name: "Orvexa Med & Estética",
    category: "Saúde & Bem-Estar",
    description: "Design moderno, higiênico e acolhedor para médicos, dentistas, psicólogos e clínicas de estética com agendamento online.",
    defaultColors: { primary: "#0EA5E9", secondary: "#14B8A6", bg: "#070D18" },
    icon: "Stethoscope",
    badge: "PROFISSIONAL",
    features: ["Corpo Clínico & Especialistas", "Agendamento de Consultas", "Depoimentos de Pacientes", "Dúvidas Frequentes (FAQ)"],
  },
  {
    slug: "restaurante",
    segment: "restaurante",
    name: "Orvexa Gourmet",
    category: "Gastronomia & Delivery",
    description: "Visual apetitoso com cardápio digital por abas, fotos em destaque, reserva de mesas e pedidos instantâneos via WhatsApp.",
    defaultColors: { primary: "#F59E0B", secondary: "#EF4444", bg: "#0F0B08" },
    icon: "Utensils",
    badge: "ALTA DEMANDA",
    features: ["Cardápio Interativo por Categorias", "Reserva de Mesas Online", "Horários de Funcionamento", "Link Direto p/ Delivery"],
  },
  {
    slug: "igreja",
    segment: "igreja",
    name: "Orvexa Faith & Church",
    category: "Comunidade & Fé",
    description: "Portal inspirador para igrejas e ministérios com programação dos cultos, transmissão ao vivo, células e pedidos de oração.",
    defaultColors: { primary: "#8B5CF6", secondary: "#EC4899", bg: "#0D0A17" },
    icon: "Flame",
    badge: "COMUNIDADE",
    features: ["Horários dos Cultos e Eventos", "Player de Transmissão ao Vivo", "Ministérios e Grupos Familiares", "Canal de Contribuição e Doações"],
  },
  {
    slug: "advogado",
    segment: "advogado",
    name: "Orvexa Law & Juris",
    category: "Direito & Consultoria",
    description: "Autoridade e elegância jurídica com áreas de atuação especializadas, credenciais da OAB e formulário de consulta confidencial.",
    defaultColors: { primary: "#D97706", secondary: "#64748B", bg: "#0B0C10" },
    icon: "Scale",
    badge: "ALTO PADRÃO",
    features: ["Áreas de Especialidade Jurídica", "Perfil dos Sócios e OAB", "Consulta Confidencial Expressa", "Artigos e Pareceres Informativos"],
  },
  {
    slug: "petshop",
    segment: "petshop",
    name: "Orvexa Pet Care",
    category: "Petshop & Veterinária",
    description: "Ambiente lúdico e confiável para banho e tosa, consultas veterinárias, hotelzinho e produtos para pets com agendamento rápido.",
    defaultColors: { primary: "#10B981", secondary: "#F59E0B", bg: "#07120D" },
    icon: "PawPrint",
    badge: "NOVIDADE",
    features: ["Tabela de Serviços (Banho/Tosa)", "Plantão Veterinário", "Depoimentos de Tutores", "Agendamento pelo WhatsApp"],
  },
  {
    slug: "landing",
    segment: "landing",
    name: "Orvexa High-Convert",
    category: "Landing Page SaaS & Infoproduto",
    description: "Estrutura científica de copywriting para captura de leads, vendas diretas de produtos digitais, mentorias e softwares.",
    defaultColors: { primary: "#06B6D4", secondary: "#8B5CF6", bg: "#050811" },
    icon: "Zap",
    badge: "CONVERSÃO MÁXIMA",
    features: ["Headline com Gatilhos Mentais", "Comparativo de Benefícios", "Contador Regressivo de Escassez", "Garantia Blindada de 7 Dias"],
  },
];

// Presets de Cores recomendados
export const COLOR_PRESETS = [
  { name: "Ciberpunk Neon", primary: "#06B6D4", secondary: "#10B981", bg: "#080C14" },
  { name: "Tech Blue Corporate", primary: "#2563EB", secondary: "#38BDF8", bg: "#0B1329" },
  { name: "Gourmet Dourado", primary: "#F59E0B", secondary: "#DC2626", bg: "#0F0B08" },
  { name: "Saúde & Esmeralda", primary: "#10B981", secondary: "#14B8A6", bg: "#051611" },
  { name: "Púrpura Criativo", primary: "#8B5CF6", secondary: "#EC4899", bg: "#0F0A1C" },
  { name: "Jurídico Imperial", primary: "#D97706", secondary: "#94A3B8", bg: "#0A0C10" },
];

// Imagens Curadas por Segmento (Unsplash alta fidelidade)
const SEGMENT_IMAGES: Record<string, { hero: string; items: string[]; about: string }> = {
  loja: {
    hero: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80",
    items: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80",
    ],
    about: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
  },
  clinica: {
    hero: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
    items: [
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80",
    ],
    about: "https://images.unsplash.com/photo-1504813184591-01572f98c85f?auto=format&fit=crop&w=800&q=80",
  },
  restaurante: {
    hero: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    items: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80",
    ],
    about: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80",
  },
  igreja: {
    hero: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80",
    items: [
      "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1478147427282-58a87a120781?auto=format&fit=crop&w=600&q=80",
    ],
    about: "https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?auto=format&fit=crop&w=800&q=80",
  },
  advogado: {
    hero: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    items: [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
    ],
    about: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=800&q=80",
  },
  petshop: {
    hero: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=1200&q=80",
    items: [
      "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1535294435445-d7249524ef2e?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80",
    ],
    about: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80",
  },
  landing: {
    hero: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    items: [
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=600&q=80",
    ],
    about: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
  },
};

// Gerador Central de Sites ORVEXA
export function generateSite(params: SiteBuilderParams): GeneratedSite {
  const {
    segment,
    name,
    primaryColor = "#06B6D4",
    secondaryColor = "#10B981",
    bgColor = "#080C14",
    objective = "Atrair clientes e converter pedidos",
    whatsapp = "5511999998888",
  } = params;

  const images = SEGMENT_IMAGES[segment] || SEGMENT_IMAGES["landing"];
  const waClean = whatsapp.replace(/\D/g, "");
  const waLink = `https://wa.me/${waClean}?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20${encodeURIComponent(name)}%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es.`;

  // Conteúdo especializado por segmento
  let heroTitle = "";
  let heroSubtitle = "";
  let ctaText = "";
  let specialTitle = "";
  let specialSubtitle = "";
  let specialItems: any[] = [];
  let seoKeywords: string[] = [];
  let schemaType = "LocalBusiness";

  switch (segment) {
    case "loja":
      heroTitle = `Os Melhores Produtos com Entrega Rápida na ${name}`;
      heroSubtitle = "Qualidade garantida, atendimento direto pelo WhatsApp e as melhores ofertas exclusivas da semana.";
      ctaText = "Ver Ofertas & Comprar";
      specialTitle = "Produtos em Destaque";
      specialSubtitle = "Seleção especial com envio imediato e facilidade de pagamento";
      specialItems = [
        { name: "Smartwatch Titanium Pro", price: "R$ 289,90", oldPrice: "R$ 399,00", tag: "MAIS VENDIDO", img: images.items[0] },
        { name: "Fone Bluetooth ANC 8K", price: "R$ 189,90", oldPrice: "R$ 249,00", tag: "OFERTA", img: images.items[1] },
        { name: "Carregador Magnético Turbo", price: "R$ 99,90", oldPrice: "R$ 149,00", tag: "NOVIDADE", img: images.items[2] },
      ];
      seoKeywords = [name, "loja online", "comprar online", "promoções", "frete rápido", "produtos"];
      schemaType = "Store";
      break;

    case "clinica":
      heroTitle = `Cuidado Humanizado e Medicina de Precisão na ${name}`;
      heroSubtitle = "Especialistas dedicados à sua saúde e bem-estar. Ambientes modernos e tecnologia de ponta para você e sua família.";
      ctaText = "Agendar Minha Consulta";
      specialTitle = "Nossas Especialidades";
      specialSubtitle = "Corpo clínico altamente qualificado para diagnósticos precisos e tratamentos eficazes";
      specialItems = [
        { name: "Check-up Preventivo Geral", price: "Sob Consulta", oldPrice: "", tag: "ESSENCIAL", desc: "Avaliação completa para longevidade e prevenção ativa.", img: images.items[0] },
        { name: "Odontologia & Estética", price: "Sob Consulta", oldPrice: "", tag: "ESTÉTICA", desc: "Clareamento a laser, facetas e reabilitação oral com tecnologia digital.", img: images.items[1] },
        { name: "Dermatologia & Laser", price: "Sob Consulta", oldPrice: "", tag: "CUIDADO", desc: "Tratamentos modernos para saúde e rejuvenescimento da pele.", img: images.items[2] },
      ];
      seoKeywords = [name, "clínica médica", "médicos", "agendar consulta", "saúde", "exames"];
      schemaType = "MedicalClinic";
      break;

    case "restaurante":
      heroTitle = `Experiência Gastronômica Inesquecível no ${name}`;
      heroSubtitle = "Ingredientes frescos selecionados, receitas autorais e ambiente acolhedor. Venha saborear ou peça pelo delivery.";
      ctaText = "Ver Cardápio & Reservar";
      specialTitle = "Pratos Especiais do Chef";
      specialSubtitle = "O melhor da nossa cozinha preparado especialmente para o seu paladar";
      specialItems = [
        { name: "Filé Mignon ao Molho Trufado", price: "R$ 89,90", oldPrice: "", tag: "CHEF PICK", desc: "Acompanha risoto cremoso de queijo brie com ervas finas.", img: images.items[0] },
        { name: "Salmão Grelhado com Legumes", price: "R$ 79,90", oldPrice: "", tag: "LEVE & FIT", desc: "Grelhado com crosta de gergelim e redução de maracujá.", img: images.items[1] },
        { name: "Sobremesa Signature Fondant", price: "R$ 34,90", oldPrice: "", tag: "DOCE", desc: "Chocolate belga 70% com sorvete artesanal de baunilha.", img: images.items[2] },
      ];
      seoKeywords = [name, "restaurante", "cardápio", "delivery", "onde comer", "reserva de mesa"];
      schemaType = "Restaurant";
      break;

    case "igreja":
      heroTitle = `Um Lugar de Acolhimento, Fé e Propósito: ${name}`;
      heroSubtitle = "Família, comunhão e esperança. Venha celebrar conosco e viver momentos transformadores na presença de Deus.";
      ctaText = "Conhecer Nossos Cultos";
      specialTitle = "Nossa Programação Semanal";
      specialSubtitle = "Encontros pensados para fortalecer sua vida espiritual e família";
      specialItems = [
        { name: "Culto da Família (Domingo 18h)", price: "Entrada Livre", oldPrice: "", tag: "DOMINGO", desc: "Mensagem inspiradora e espaço especial kids para crianças.", img: images.items[0] },
        { name: "Células & Grupos de Conexão", price: "Toda Terça", oldPrice: "", tag: "COMUNHÃO", desc: "Reuniões acolhedoras nos lares para oração e estudo da Palavra.", img: images.items[1] },
        { name: "Culto de Louvor & Jovens", price: "Sábado 19h30", oldPrice: "", tag: "JOVENS", desc: "Música vibrante, propósito de vida e amizades genuínas.", img: images.items[2] },
      ];
      seoKeywords = [name, "igreja", "cultos", "comunidade cristã", "fé", "palavra de deus"];
      schemaType = "Church";
      break;

    case "advogado":
      heroTitle = `Defesa Rigorosa e Estratégia Jurídica de Alto Nível`;
      heroSubtitle = `${name} — Advocacia consultiva e contenciosa com ética, discrição e histórico comprovado de vitórias.`;
      ctaText = "Agendar Consulta Jurídica";
      specialTitle = "Áreas de Atuação Especializada";
      specialSubtitle = "Soluções sob medida para blindar seu patrimônio e garantir seus direitos legais";
      specialItems = [
        { name: "Direito Empresarial & Contratos", price: "Atendimento VIP", oldPrice: "", tag: "EMPRESAS", desc: "Estruturação societária, blindagem contratual e gestão de riscos.", img: images.items[0] },
        { name: "Direito Tributário & Recuperação", price: "Consultoria", oldPrice: "", tag: "TRIBUTOS", desc: "Recuperação de créditos fiscais e planejamento tributário estratégico.", img: images.items[1] },
        { name: "Direito Digital & LGPD", price: "Compliance", oldPrice: "", tag: "TECNOLOGIA", desc: "Adequação completa a dados, termos de uso e segurança jurídica digital.", img: images.items[2] },
      ];
      seoKeywords = [name, "advocacia", "advogado", "direito empresarial", "consultoria jurídica", "contratos", "oab"];
      schemaType = "LegalService";
      break;

    case "petshop":
      heroTitle = `Amor, Carinho e Saúde para o Seu Melhor Amigo no ${name}`;
      heroSubtitle = "Banho relaxante, tosa higiênica e médica veterinária com equipe apaixonada por animais de estimação.";
      ctaText = "Agendar Banho ou Tosa";
      specialTitle = "Nossos Cuidados Pet";
      specialSubtitle = "Ambiente higienizado e produtos dermatológicos testados para a saúde do seu pet";
      specialItems = [
        { name: "Banho & Tosa Especializada", price: "A partir de R$ 55", oldPrice: "", tag: "MAIS PEDIDO", desc: "Secagem suave, corte de unhas e hidratação com produtos hipoalergênicos.", img: images.items[0] },
        { name: "Consulta Veterinária & Vacinas", price: "Sob Agendamento", oldPrice: "", tag: "SAÚDE", desc: "Acompanhamento preventivo e aplicação do calendário vacinal.", img: images.items[1] },
        { name: "Hotelzinho & Creche Pet", price: "Diárias Flexíveis", oldPrice: "", tag: "DIVERSÃO", desc: "Socialização segura, brincadeiras monitoradas e muito amor.", img: images.items[2] },
      ];
      seoKeywords = [name, "petshop", "banho e tosa", "veterinário", "hotel pet", "ração", "animais"];
      schemaType = "LocalBusiness";
      break;

    case "landing":
    default:
      heroTitle = `Acelere Seus Resultados com a Solução Definitiva da ${name}`;
      heroSubtitle = "Aumente sua produtividade, elimine retrabalho e alcance resultados exponenciais com nossa metodologia validada.";
      ctaText = "Quero Começar Agora";
      specialTitle = "Por Que Escolher Nossa Solução?";
      specialSubtitle = "Resultados mensuráveis comprovados por centenas de clientes satisfeitos";
      specialItems = [
        { name: "Eficiência 10x Maior", price: "Incluso", oldPrice: "", tag: "PRODUTIVIDADE", desc: "Processos automatizados com tecnologia de última geração para poupar horas semanais.", img: images.items[0] },
        { name: "Suporte VIP Especializado", price: "Incluso", oldPrice: "", tag: "EXCLUSIVO", desc: "Time dedicado pronto para guiar seus passos e garantir sucesso no uso.", img: images.items[1] },
        { name: "Garantia Blindada de 7 Dias", price: "Risco Zero", oldPrice: "", tag: "SEGURANÇA", desc: "Se você não ficar 100% satisfeito, devolvemos seu investimento sem perguntas.", img: images.items[2] },
      ];
      seoKeywords = [name, "conversão", "resultados", "solução", "metodologia", "saas", "alta performance"];
      schemaType = "SoftwareApplication";
      break;
  }

  // Blocos Estruturados
  const blocks: SiteBlock[] = [
    {
      id: "header",
      type: "header",
      title: name,
      ctaText: "WhatsApp",
      ctaLink: waLink,
    },
    {
      id: "hero",
      type: "hero",
      title: heroTitle,
      subtitle: heroSubtitle,
      ctaText,
      ctaLink: waLink,
    },
    {
      id: "special",
      type: "special",
      title: specialTitle,
      subtitle: specialSubtitle,
      items: specialItems,
      ctaText: "Solicitar no WhatsApp",
      ctaLink: waLink,
    },
    {
      id: "features",
      type: "features",
      title: "Diferenciais Exclusivos",
      subtitle: `Conheça as vantagens de confiar em ${name}`,
      items: [
        { title: "Atendimento Rápido", desc: "Sem filas ou espera. Conversamos com você diretamente pelo WhatsApp.", icon: "⚡" },
        { title: "Qualidade Comprovada", desc: "Foco total na satisfação do cliente com garantia e suporte humano.", icon: "⭐" },
        { title: "Transparência Total", desc: "Preços claros, processos auditáveis e compromisso com o seu resultado.", icon: "🛡️" },
      ],
    },
    {
      id: "testimonials",
      type: "testimonials",
      title: "O que Nossos Clientes Dizem",
      subtitle: "Histórias reais de quem confia no nosso trabalho",
      items: [
        { name: "Carlos Eduardo", role: "Cliente Verificado", comment: "Excelente experiência! Atendimento rápido, resolveram tudo no mesmo dia com extrema qualidade. Recomendo a todos!", rating: 5 },
        { name: "Mariana Silva", role: "Cliente Verificada", comment: "Superou todas as minhas expectativas. Profissionalismo impecável e cuidado com cada detalhe!", rating: 5 },
      ],
    },
    {
      id: "contact",
      type: "contact",
      title: "Fale Conosco Diretamente",
      subtitle: "Estamos prontos para atender você agora mesmo",
      ctaText: "Conversar no WhatsApp",
      ctaLink: waLink,
    },
    {
      id: "footer",
      type: "footer",
      title: name,
      content: `© ${new Date().getFullYear()} ${name}. Todos os direitos reservados. Plataforma otimizada por ORVEXA PRIME DIGITAL.`,
    },
  ];

  // Metadados SEO
  const seo = {
    title: `${name} — ${heroTitle.split("—")[0].slice(0, 55)}`,
    description: heroSubtitle.slice(0, 155),
    keywords: seoKeywords,
    ogTitle: `${name} | Oficial`,
    ogDescription: heroSubtitle,
    schemaJson: JSON.stringify({
      "@context": "https://schema.org",
      "@type": schemaType,
      name: name,
      description: heroSubtitle,
      image: images.hero,
      telephone: whatsapp,
      url: "https://orvexa.digital",
    }),
  };

  // Gerador de Código HTML5 + Tailwind CSS completo
  const html = `<!DOCTYPE html>
<html lang="pt-BR" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seo.title}</title>
  <meta name="description" content="${seo.description}">
  <meta name="keywords" content="${seo.keywords.join(", ")}">
  <meta property="og:title" content="${seo.ogTitle}">
  <meta property="og:description" content="${seo.ogDescription}">
  <meta property="og:image" content="${images.hero}">
  <meta property="og:type" content="website">

  <!-- Tailwind CSS via CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brandPrimary: '${primaryColor}',
            brandSecondary: '${secondaryColor}',
            brandBg: '${bgColor}'
          }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .neon-glow { box-shadow: 0 0 25px ${primaryColor}40; }
  </style>

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
    ${seo.schemaJson}
  </script>
</head>
<body class="bg-brandBg text-slate-100 antialiased min-h-screen flex flex-col selection:bg-brandPrimary selection:text-slate-950">

  <!-- NAVBAR -->
  <header class="sticky top-0 z-50 backdrop-blur-md bg-brandBg/80 border-b border-slate-800/80">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <a href="#" class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brandPrimary to-brandSecondary flex items-center justify-center text-slate-950 font-black text-xl shadow-lg">
          ${name.charAt(0).toUpperCase()}
        </div>
        <span class="font-extrabold text-xl tracking-tight text-white">${name}</span>
      </a>

      <nav class="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
        <a href="#destaques" class="hover:text-brandPrimary transition-colors">Destaques</a>
        <a href="#diferenciais" class="hover:text-brandPrimary transition-colors">Vantagens</a>
        <a href="#depoimentos" class="hover:text-brandPrimary transition-colors">Avaliações</a>
        <a href="#contato" class="hover:text-brandPrimary transition-colors">Contato</a>
      </nav>

      <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-brandPrimary to-brandSecondary text-slate-950 font-extrabold text-sm hover:opacity-90 transition-all neon-glow">
        <span>Fale no WhatsApp</span>
        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.84 2.791.84 3.184 0 5.77-2.587 5.77-5.766.001-3.181-2.585-5.766-5.77-5.766zm9.969 5.766c0 5.503-4.478 9.98-9.969 9.98-1.748 0-3.377-.456-4.808-1.25l-5.223 1.368 1.394-5.093c-.878-1.488-1.363-3.218-1.363-5.005 0-5.503 4.478-9.98 9.969-9.98 5.492 0 9.969 4.477 9.969 9.98z"/></svg>
      </a>
    </div>
  </header>

  <!-- HERO SECTION -->
  <section class="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
    <div class="absolute inset-0 bg-radial from-brandPrimary/10 via-transparent to-transparent pointer-events-none"></div>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-brandPrimary text-xs font-bold tracking-wide uppercase mb-6">
            <span class="w-2 h-2 rounded-full bg-brandSecondary animate-pulse"></span>
            Qualidade & Confiança Garantida
          </div>
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-6">
            ${heroTitle}
          </h1>
          <p class="text-lg text-slate-300 mb-8 leading-relaxed">
            ${heroSubtitle}
          </p>
          <div class="flex flex-col sm:flex-row gap-4">
            <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="px-8 py-4 rounded-xl bg-gradient-to-r from-brandPrimary to-brandSecondary text-slate-950 font-black text-base flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl neon-glow">
              ${ctaText}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </a>
            <a href="#destaques" class="px-8 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-base flex items-center justify-center border border-slate-800 transition-all">
              Saiba Mais
            </a>
          </div>
        </div>

        <div class="relative">
          <div class="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <img src="${images.hero}" alt="${name}" class="w-full h-[450px] object-cover hover:scale-105 transition-all duration-700">
            <div class="absolute inset-0 bg-gradient-to-t from-brandBg via-transparent to-transparent"></div>
            <div class="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs text-slate-400 font-mono">STATUS OFICIAL</div>
                  <div class="text-sm font-bold text-white">${name} • Atendimento Aberto</div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-black bg-brandSecondary/20 text-brandSecondary border border-brandSecondary/30">ONLINE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- SPECIAL SECTION (Segment Showcase) -->
  <section id="destaques" class="py-20 bg-slate-950/60 border-y border-slate-800/80">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-4">${specialTitle}</h2>
        <p class="text-slate-400 text-base">${specialSubtitle}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        ${specialItems
          .map(
            (item) => `
        <div class="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden hover:border-brandPrimary/40 transition-all group flex flex-col">
          <div class="relative h-56 overflow-hidden">
            <img src="${item.img}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-110 transition-all duration-500">
            <span class="absolute top-3 left-3 px-3 py-1 rounded-lg text-xs font-black bg-slate-950/80 backdrop-blur-sm text-brandPrimary border border-brandPrimary/30">
              ${item.tag}
            </span>
          </div>
          <div class="p-6 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="text-lg font-bold text-white mb-2 group-hover:text-brandPrimary transition-colors">${item.name}</h3>
              <p class="text-xs text-slate-400 leading-relaxed mb-4">${item.desc || "Item com alto padrão de qualidade e garantia assegurada por nossa equipe."}</p>
            </div>
            <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                ${item.oldPrice ? `<span class="text-xs line-through text-slate-500 block">${item.oldPrice}</span>` : ""}
                <span class="text-lg font-black text-brandSecondary">${item.price}</span>
              </div>
              <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-lg bg-brandPrimary/15 hover:bg-brandPrimary text-brandPrimary hover:text-slate-950 text-xs font-bold transition-all border border-brandPrimary/30">
                Pedir Agora
              </a>
            </div>
          </div>
        </div>
        `
          )
          .join("")}
      </div>
    </div>
  </section>

  <!-- FEATURES SECTION -->
  <section id="diferenciais" class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-4">Por Que Escolher a ${name}?</h2>
        <p class="text-slate-400 text-base">Nosso compromisso é entregar sempre a melhor experiência com foco nos seus resultados.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-brandPrimary/30 transition-all">
          <div class="text-3xl mb-4">⚡</div>
          <h3 class="text-xl font-bold text-white mb-2">Atendimento Imediato</h3>
          <p class="text-sm text-slate-400 leading-relaxed">Você conversa diretamente com especialistas prontos para tirar dúvidas e agilizar seu pedido.</p>
        </div>

        <div class="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-brandPrimary/30 transition-all">
          <div class="text-3xl mb-4">⭐</div>
          <h3 class="text-xl font-bold text-white mb-2">Padrão de Excelência</h3>
          <p class="text-sm text-slate-400 leading-relaxed">Cada serviço ou produto passa por critérios rigorosos para garantir satisfação absoluta.</p>
        </div>

        <div class="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-brandPrimary/30 transition-all">
          <div class="text-3xl mb-4">🛡️</div>
          <h3 class="text-xl font-bold text-white mb-2">Segurança & Confiabilidade</h3>
          <p class="text-sm text-slate-400 leading-relaxed">Operação transparente, ético e com suporte contínuo antes, durante e depois da compra.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS SECTION -->
  <section id="depoimentos" class="py-20 bg-slate-950/60 border-y border-slate-800/80">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-4">Avaliações de Clientes</h2>
        <p class="text-slate-400 text-base">Veja o que diz quem já contratou ou comprou com a ${name}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div class="p-8 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center gap-1 text-amber-400 text-sm mb-4">★★★★★</div>
          <p class="text-slate-300 text-sm italic mb-6">"Atendimento impecável! Recomendo de olhos fechados. Fui atendido no WhatsApp em menos de 2 minutos e resolveram com extrema agilidade."</p>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-brandPrimary/20 flex items-center justify-center font-bold text-brandPrimary">CE</div>
            <div>
              <div class="text-sm font-bold text-white">Carlos Eduardo</div>
              <div class="text-xs text-slate-400">Cliente Verificado</div>
            </div>
          </div>
        </div>

        <div class="p-8 rounded-2xl bg-slate-900 border border-slate-800">
          <div class="flex items-center gap-1 text-amber-400 text-sm mb-4">★★★★★</div>
          <p class="text-slate-300 text-sm italic mb-6">"Superou minhas expectativas. A clareza nas informações e a qualidade do serviço prestado me conquistaram. Estão de parabéns!"</p>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-brandSecondary/20 flex items-center justify-center font-bold text-brandSecondary">MS</div>
            <div>
              <div class="text-sm font-bold text-white">Mariana Silva</div>
              <div class="text-xs text-slate-400">Cliente Verificada</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CONTACT & CTA SECTION -->
  <section id="contato" class="py-24 relative overflow-hidden">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
      <div class="p-12 rounded-3xl bg-gradient-to-b from-slate-900 to-brandBg border border-slate-800 shadow-2xl relative">
        <span class="inline-block p-4 rounded-2xl bg-brandPrimary/10 text-brandPrimary mb-6">
          <svg class="w-8 h-8 fill-current mx-auto" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.84 2.791.84 3.184 0 5.77-2.587 5.77-5.766.001-3.181-2.585-5.766-5.77-5.766zm9.969 5.766c0 5.503-4.478 9.98-9.969 9.98-1.748 0-3.377-.456-4.808-1.25l-5.223 1.368 1.394-5.093c-.878-1.488-1.363-3.218-1.363-5.005 0-5.503 4.478-9.98 9.969-9.98 5.492 0 9.969 4.477 9.969 9.98z"/></svg>
        </span>
        <h2 class="text-3xl sm:text-4xl font-black text-white mb-4">Pronto para dar o próximo passo?</h2>
        <p class="text-slate-400 text-base max-w-xl mx-auto mb-8">Clique no botão abaixo para iniciar uma conversa direta no nosso canal oficial do WhatsApp.</p>
        <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-brandPrimary to-brandSecondary text-slate-950 font-black text-base hover:scale-105 transition-all shadow-xl neon-glow">
          Iniciar Conversa no WhatsApp
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="mt-auto py-12 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-4">
      <p class="mb-2">© ${new Date().getFullYear()} ${name}. Todos os direitos reservados.</p>
      <p class="font-mono text-slate-600">Construído com tecnologia de ponta ORVEXA PRIME DIGITAL</p>
    </div>
  </footer>

  <!-- FLOATING WHATSAPP BUTTON -->
  <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-[#25D366] text-white shadow-2xl hover:scale-110 transition-all flex items-center justify-center">
    <svg class="w-7 h-7 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.84 2.791.84 3.184 0 5.77-2.587 5.77-5.766.001-3.181-2.585-5.766-5.77-5.766zm9.969 5.766c0 5.503-4.478 9.98-9.969 9.98-1.748 0-3.377-.456-4.808-1.25l-5.223 1.368 1.394-5.093c-.878-1.488-1.363-3.218-1.363-5.005 0-5.503 4.478-9.98 9.969-9.98 5.492 0 9.969 4.477 9.969 9.98z"/></svg>
  </a>

</body>
</html>`;

  return {
    title: name,
    segment,
    primaryColor,
    secondaryColor,
    bgColor,
    html,
    blocks,
    seo,
  };
}

