/**
 * PROMPT ENGINE — ORVEXA PRIME DIGITAL
 * Transforma pedidos simples do usuário em prompts estruturados de altíssimo nível cinematográfico e comercial.
 * 
 * Estrutura de 11 parâmetros exigida pelo Prompt Mestre:
 * - objetivo
 * - público
 * - estilo
 * - cenário
 * - iluminação
 * - composição
 * - cores
 * - câmera
 * - qualidade
 * - formato
 * - negative prompt
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

export function buildProfessionalPrompt(
  userInput: string,
  options?: PromptEngineOptions
): StructuredPromptDetails {
  const input = userInput.trim();
  const category = options?.category || "GERAL";
  const aspectRatio = options?.aspectRatio || "1:1";
  const styleOverride = options?.styleOverride;

  let objetivo = "Criar um visual comercial atraente de altíssima conversão e impacto estético.";
  let publico = "Público executivo, consumidores exigentes e decisores comerciais.";
  let estilo = styleOverride || "Fotografia comercial ultra-realista 8k, iluminação cinematográfica de estúdio.";
  let cenario = "Cenário minimalista corporativo ou estúdio profissional com profundidade refinada e sombras suaves.";
  let iluminacao = "Softbox difusa com luz de borda (rim light) sutil, contraste suave e reflexos controlados.";
  let composicao = "Regra dos terços com objeto central em foco nítido, profundidade de campo rasa e bokeh elegante no fundo.";
  let cores = "Paleta moderna com contraste rico, saturação equilibrada e tons vibrantes elegantes.";
  let camera = "Capturado com Sony A7R V, lente Prime 85mm f/1.4, ISO 100, obturador rápido e foco cirúrgico.";
  let qualidade = "Masterpiece, ultra-detailed, photorealistic, 8k resolution, ray tracing, sharp details, Hasselblad color science.";
  let formato = aspectRatio === "16:9" ? "16:9 widescreen landscape" : aspectRatio === "9:16" ? "9:16 vertical story/reels" : aspectRatio === "4:5" ? "4:5 social feed" : "1:1 square";
  let negativePrompt = "blurry, low quality, distorted, watermark, deformed, extra fingers, text errors, oversaturated, amateur, grainy, pixelated, bad anatomy";

  // Ajustes de especialização conforme a categoria solicitada
  if (category === "LOGO") {
    objetivo = "Desenvolver uma identidade visual de marca icônica, memorável e moderna.";
    publico = "Clientes corporativos, investidores e mercado premium.";
    estilo = styleOverride || "Logo vetorial minimalista geométrico, design limpo estilo Apple/Nike, flat 2D com gradiente sutil.";
    cenario = "Fundo sólido limpo de alto contraste (fundo escuro luxo ou branco estúdio).";
    iluminacao = "Iluminação uniforme flat sem sombras duras, foco total na silhueta e geometria do símbolo.";
    composicao = "Centralizado com proporção áurea equilibrada e margens de respiro amplas.";
    cores = "Esquema monocromático premium com toques de ciano elétrico ou dourado champanhe.";
    camera = "Renderização vetorial vetorial pura, linhas vetoriais SVG perfeitas, anti-aliasing de nível suíço.";
    qualidade = "Vector masterpiece, sharp crisp edges, perfect symmetry, award-winning branding typography.";
    negativePrompt = "photorealistic, complex scene, photographic artifacts, clutter, noisy textures, blurry lines";
  } else if (category === "BANNER") {
    objetivo = "Geração de banner promocional de alto impacto para divulgação de ofertas, e-commerce ou campanhas.";
    publico = "Compradores online, clientes de varejo e seguidores em redes sociais.";
    estilo = styleOverride || "Arte publicitária moderna de alta conversão, composição dinâmica com espaço reservado para tipografia.";
    cenario = "Ambiente temático vibrante com elementos flutuantes sutis e atmosfera imersiva.";
    iluminacao = "Luz volumétrica dramática com iluminação de recorte neon acentuada.";
    composicao = "Composição assimétrica com espaço negativo estratégico na lateral para textos e ofertas.";
    cores = "Cores de alta energia e contraste, gradientes modernos e saturação equilibrada.";
    formato = "16:9 widescreen banner";
    qualidade = "Commercial advertising standard, 8k poster quality, ultra-sharp rendering.";
  } else if (category === "THUMBNAIL") {
    objetivo = "Criação de miniatura de altíssimo clique (CTR) para YouTube ou vídeos online.";
    publico = "Espectadores de plataformas digitais que buscam conteúdos dinâmicos e envolventes.";
    estilo = styleOverride || "Estilo thumbnail moderno de YouTube, expressões marcantes, elementos ampliados e contraste extremo.";
    cenario = "Cenário contextual dinâmico com iluminação de fundo vibrante.";
    iluminacao = "Key light intensa sobre o elemento principal com rim light colorida (azul/laranja/ciano).";
    composicao = "Close-up macro em primeiro plano, ângulos ligeiramente inclinados para transmitir dinamismo.";
    formato = "16:9 widescreen";
    qualidade = "Punchy contrast, crisp facial and object clarity, high-definition digital painting.";
  } else if (category === "MOCKUP") {
    objetivo = "Apresentar produto físico, embalagem ou aplicativo em contexto real de uso de luxo.";
    publico = "Compradores B2B, lojistas e consumidores de e-commerce.";
    estilo = styleOverride || "Mockup 3D realista renderizado em Octane Render com acabamento de material acetinado e texturas físicas.";
    cenario = "Pódio elegante de concreto arquitetônico ou madeira nobre com plantas desidratadas ao fundo.";
    iluminacao = "Luz natural difusa de janela lateral com sombras suaves e reflexos caústicos.";
    camera = "Macro 100mm f/2.8, foco perfeito nos detalhes do rótulo e textura da embalagem.";
    qualidade = "3D photorealistic product render, hyper-detailed textures, Octane 2026 rendering.";
  }

  // Se o usuário mencionou alimentos, eletrônicos, roupas ou cosméticos
  const lower = input.toLowerCase();
  if (lower.includes("hambúrguer") || lower.includes("comida") || lower.includes("lanche") || lower.includes("pizza") || lower.includes("prato")) {
    estilo = "Fotografia gastronômica comercial 8k, vapor quente sutil saindo do alimento, gotas de água frescas, textura apetitosa brilhante.";
    cenario = "Tábua de madeira nobre rústica com ingredientes frescos desfocados ao fundo.";
    iluminacao = "Luz suave de 45 graus realçando o brilho do queijo derretido e textura crocante.";
  } else if (lower.includes("carro") || lower.includes("veículo") || lower.includes("automóvel")) {
    estilo = "Fotografia automotiva comercial cinematográfica, pintura com acabamento espelhado e reflexos perfeitos.";
    cenario = "Estrada sinuosa moderna à beira-mar ou estúdio com piso reflexivo escuro.";
    iluminacao = "Linhas de luz reflexivas contornando a lataria do carro ao pôr do sol.";
  } else if (lower.includes("etiqueta") || lower.includes("preço") || lower.includes("promoção")) {
    estilo = "Card promocional de produto com selo de destaque para preço, tipografia comercial arrojada e estética de varejo premium.";
  }

  // Montagem do Master Prompt refinado
  const masterPrompt = `[THEME]: ${input}
[OBJECTIVE]: ${objetivo}
[STYLE]: ${estilo}
[ENVIRONMENT]: ${cenario}
[LIGHTING]: ${iluminacao}
[COMPOSITION]: ${composicao}
[COLOR PALETTE]: ${cores}
[CAMERA & SPECS]: ${camera}
[QUALITY]: ${qualidade}
[ASPECT RATIO]: ${formato}
[NEGATIVE PROMPT]: ${negativePrompt}`;

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
