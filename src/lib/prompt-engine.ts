/**
 * PROMPT ENGINE — ORVEXA PRIME DIGITAL
 * Transforma pedidos em linguagem natural (PT-BR) em prompts de difusão cinematográfica
 * de altíssima fidelidade com tradução semântica inteligente e parâmetros visuais.
 */

export interface StructuredPromptDetails {
  objetivo: string;
  publico: string;
  estilo: string;
  cenario: string;
  iluminacao: string;
  composicao: string;
  cores: string;
  camera: string;
  qualidade: string;
  formato: string;
  negativePrompt: string;
  masterPrompt: string;
}

export interface PromptEngineOptions {
  category?: "POST" | "BANNER" | "LOGO" | "THUMBNAIL" | "MOCKUP" | "GERAL";
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:5";
  styleOverride?: string;
}

/**
 * Converte e enriquece prompts em linguagem natural (PT-BR) para termos de difusão em inglês de alta fidelidade
 */
export function translateToArtisticEnglish(userInput: string): { englishSubject: string; contextType: string } {
  let text = userInput.trim().toLowerCase();

  // 1. Remove ruídos conversacionais em português com precisão
  text = text.replace(/^(quero\s+que\s+voc[êe]\s+crie|quero\s+que\s+crie|quero\s+criar|quero|crie|cria|gere|fa[çc]a|desenhe)\s+/gi, "");
  text = text.replace(/^(uma\s+imagem\s+(de\s+|do\s+|da\s+|dos\s+|das\s+)?|uma\s+foto\s+(de\s+|do\s+|da\s+)?|um\s+desenho\s+(de\s+|do\s+|da\s+)?|imagem\s+(de\s+|do\s+|da\s+)?|foto\s+(de\s+|do\s+|da\s+)?)/gi, "");
  text = text.replace(/^(e\s+com\s+|com\s+|onde\s+tenha\s+|mostrando\s+)/gi, "");

  let contextType = "GERAL";

  // 2. Mapeamentos semânticos inteligentes específicos
  const mappings: [RegExp, string, string][] = [
    // Cristo Redentor & Monumentos
    [/cristo\s+redentor/gi, "Christ the Redeemer statue atop Corcovado mountain in Rio de Janeiro", "MONUMENT"],
    [/torre\s+eiffel/gi, "Eiffel Tower in Paris", "MONUMENT"],
    [/est[áa]tua\s+da\s+liberdade/gi, "Statue of Liberty in New York Harbor", "MONUMENT"],

    // Aviação & Veículos
    [/avi[aã]o\s+passando\s+perto/gi, "commercial jet airliner airplane flying close by in the sky with vapor trails", "VEHICLE"],
    [/avi[aã]o\s+de\s+ca[çc]a/gi, "military fighter jet aircraft flying through clouds", "VEHICLE"],
    [/avi[aã]o/gi, "modern airplane aircraft flying through the sky", "VEHICLE"],
    [/helic[oó]ptero/gi, "modern helicopter flying in the sky", "VEHICLE"],
    [/carro\s+esportivo/gi, "sleek aerodynamic luxury sports supercar", "VEHICLE"],
    [/carro/gi, "luxury modern automobile", "VEHICLE"],
    [/moto/gi, "custom modern motorcycle", "VEHICLE"],

    // Sagrado & Bíblico
    [/jesus\s+(e\s+seus\s+)?disc[ií]pulos/gi, "Jesus Christ standing majestically with his twelve disciples apostles", "SACRED"],
    [/jesus\s+cristo/gi, "Jesus Christ with compassionate serene expression in classical robes", "SACRED"],
    [/jesus/gi, "Jesus Christ with divine radiant aura", "SACRED"],
    [/disc[ií]pulos|ap[oó]stolos/gi, "biblical disciples and apostles", "SACRED"],
    [/anjo/gi, "magnificent celestial angel with grand feathered wings", "SACRED"],
    [/igreja/gi, "historic grand cathedral church with stained glass windows", "SACRED"],

    // Alimentos & Bebidas
    [/hamb[uú]rguer/gi, "gourmet artisan burger with juicy grilled patty, melting cheddar cheese and fresh crisp lettuce", "FOOD"],
    [/pizza/gi, "freshly baked artisan Italian wood-fired pizza with melted bubbling mozzarella", "FOOD"],
    [/caf[eé]/gi, "steaming artisan espresso cup with rich crema and latte art", "FOOD"],
    [/a[çc]a[íi]/gi, "delicious acai bowl with fresh banana slices, granola and berries", "FOOD"],

    // Natureza & Paisagem
    [/p[oô]r\s+do\s+sol/gi, "breathtaking golden hour sunset with vibrant orange and purple sky", "LANDSCAPE"],
    [/nascer\s+do\s+sol/gi, "crisp early morning golden sunrise", "LANDSCAPE"],
    [/praia/gi, "tropical white sand beach with crystal clear turquoise ocean waters and palm trees", "LANDSCAPE"],
    [/montanha/gi, "majestic snow-capped mountain peaks touching dramatic clouds", "LANDSCAPE"],
    [/floresta/gi, "mystical lush green forest with volumetric sunbeams filtering through tall trees", "LANDSCAPE"],

    // Animais
    [/le[aã]o/gi, "majestic African lion with magnificent golden mane and intense gaze", "ANIMAL"],
    [/cavalo/gi, "powerful wild horse galloping freely", "ANIMAL"],
    [/lobo/gi, "noble wild wolf in pristine nature", "ANIMAL"],
    [/águia|aguia/gi, "majestic bald eagle soaring through the sky", "ANIMAL"],

    // Cidades & Arquitetura
    [/cidade\s+do\s+rio\s+de\s+janeiro/gi, "Rio de Janeiro dramatic landscape with Guanabara Bay and Sugarloaf Mountain", "MONUMENT"],
    [/cidade|metr[oó]pole/gi, "futuristic bustling modern cityscape skyline with skyscrapers", "CITY"],
  ];

  let englishSubject = text;
  for (const [pattern, replacement, ctx] of mappings) {
    if (pattern.test(englishSubject)) {
      englishSubject = englishSubject.replace(pattern, replacement);
      if (contextType === "GERAL") contextType = ctx;
    }
  }

  // Remove conjunções em português restantes (preservando Rio de Janeiro)
  englishSubject = englishSubject
    .replace(/,\s*e\s+/gi, ", ")
    .replace(/\s+e\s+/gi, ", ")
    .replace(/\s+com\s+/gi, ", with ")
    .replace(/\s+passando\s+perto\s+/gi, " flying close by ")
    .replace(/\s+passando\s+/gi, " flying passing by ")
    .replace(/\s+perto\s+de\s+/gi, " close to ")
    .replace(/\s+perto\s+/gi, " close by ")
    .trim();

  return { englishSubject, contextType };
}

export function buildProfessionalPrompt(
  userInput: string,
  options?: PromptEngineOptions
): StructuredPromptDetails {
  const input = userInput.trim();
  const category = options?.category || "GERAL";
  const aspectRatio = options?.aspectRatio || "1:1";
  const styleOverride = options?.styleOverride;

  const { englishSubject, contextType } = translateToArtisticEnglish(input);

  // Parâmetros adaptativos conforme o tipo de assunto detectado
  let objetivo = "Geração de imagem em altíssima definição com máxima fidelidade ao assunto solicitado.";
  let publico = "Audiência exigente, apreciadores de arte digital e comunicação visual de impacto.";
  let estilo = styleOverride || "Fotografia ultra-realista 8K, iluminação cinematográfica de alta fidelidade.";
  let cenario = "Cenário panorâmico aberto e autêntico ao tema com perspectiva dinâmica e atmosfera realista.";
  let iluminacao = "Luz natural cinematográfica de golden hour com sombras suaves e contraste refinado.";
  let composicao = "Composição equilibrada em grande escala com objeto principal em destaque majestoso.";
  let cores = "Gradientes naturais ricos, saturação precisa e tons cinematográficos vibrantes.";
  let camera = "Lente grande-angular panorâmica 24-70mm, perspectiva aérea ampla e foco nítido.";
  let qualidade = "Masterpiece, 8k resolution, photorealistic, ultra-detailed textures, ray tracing, sharp focus.";
  let formato = aspectRatio === "16:9" ? "16:9 widescreen" : aspectRatio === "9:16" ? "9:16 vertical" : aspectRatio === "4:5" ? "4:5 retrato" : "1:1 quadrado";
  let negativePrompt = "blurry, low quality, distorted, watermark, deformed, bad anatomy, text errors, amateurish, grainy, pixelated";

  let masterPromptSubject = englishSubject;

  // Ajustes de contexto específicos
  if (contextType === "MONUMENT") {
    objetivo = "Capturar o monumento em escala monumental com elementos aéreos e paisagem autêntica.";
    cenario = "Cenário real icônico com relevo topográfico dramático, montanhas e céu dinâmico.";
    camera = "Fotografia aérea com lente cinematográfica panorâmica, perspectiva épica de helicóptero/drone.";
    iluminacao = "Luz do dia dramática com nuvens volumétricas no horizonte e atmosfera vívida.";
    masterPromptSubject = `${englishSubject}, iconic landmark panorama, breathtaking aerial drone view, majestic atmosphere`;
  } else if (contextType === "SACRED") {
    objetivo = "Criar obra sacra solene, reverente e de imensa beleza espiritual e artística.";
    estilo = "Pintura clássica renascentista contemporânea hiper-realista, solenidade e atmosfera sagrada.";
    cenario = "Cenário bíblico grandioso com atmosfera de paz celestial e horizonte sagrado.";
    iluminacao = "Raios de luz dourada divina descendo do céu (god rays), brilho celestial suave e caloroso.";
    camera = "Composição clássica atemporal com dignidade e grandiosidade solene.";
    masterPromptSubject = `${englishSubject}, serene divine light beams, holy majestic atmosphere, classical biblical art masterpiece`;
  } else if (contextType === "FOOD") {
    objetivo = "Fotografia gastronômica comercial apetitosa de alto impacto para restaurantes.";
    estilo = "Food photography profissional de revista gastronômica.";
    cenario = "Mesa rústica de restaurante gourmet com ingredientes frescos e apresentação impecável.";
    iluminacao = "Luz suave de estúdio culinário realçando texturas crocantes e queijo derretido.";
    camera = "Lente macro 50mm f/1.8 com profundidade de campo rasa e foco impecável no alimento.";
    masterPromptSubject = `${englishSubject}, gourmet food photography, freshly prepared, appetizing studio lighting`;
  } else if (contextType === "VEHICLE") {
    objetivo = "Registro dinâmico de veículo em movimento ou perspectiva de ação em alta velocidade.";
    cenario = "Céu aberto com nuvens e horizonte amplo, sensação real de voo e escala.";
    camera = "Lente teleobjetiva de ação com rastreamento dinâmico e nitidez cirúrgica.";
    iluminacao = "Reflexos metálicos solares brilhantes na fuselagem/lataria com céu límpido.";
    masterPromptSubject = `${englishSubject}, dynamic action perspective, crisp mechanical details, vivid clear blue sky`;
  }

  // Master Prompt limpo e conciso em inglês direto para o motor de difusão neural
  const masterPrompt = `${masterPromptSubject}, cinematic lighting, photorealistic 8k, ultra-detailed textures, highly detailed, dramatic composition, masterpiece, professional photography`;

  return {
    objetivo,
    publico,
    estilo,
    cenario,
    iluminacao,
    composicao,
    cores,
    camera,
    qualidade,
    formato,
    negativePrompt,
    masterPrompt,
  };
}
