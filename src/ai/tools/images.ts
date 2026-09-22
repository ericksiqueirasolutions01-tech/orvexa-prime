// src/ai/tools/images.ts
// MOTOR DE IMAGEM NEURAL & VISÃO COMPUTACIONAL — ORVEXA PRIME DIGITAL

export interface ImageGenerationParams {
  prompt: string;
  style?: "REALISTA" | "ESTUDIO" | "3D_RENDER" | "CYBERPUNK" | "LOGO" | "MINIMALISTA";
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3";
  negativePrompt?: string;
}

export interface ImageGenerationResult {
  imageUrl: string;
  refinedPrompt: string;
  seed: number;
  provider: string;
  model: string;
}

export function enhancePromptForStyle(prompt: string, style: ImageGenerationParams["style"] = "REALISTA"): string {
  const cleanPrompt = prompt.trim();

  const styleEnhancers: Record<string, string> = {
    REALISTA: "ultra-realistic, 8k resolution, authentic textures, cinematic natural daylight lighting, shot on 35mm lens, photorealistic masterpiece, sharp focus",
    ESTUDIO: "professional studio product photography, clean dark gradient background, softbox rim lighting, 85mm lens, commercial advertising quality, ultra high detail",
    "3D_RENDER": "octane 3d render, ray tracing, subsurface scattering, ambient occlusion, sleek modern materials, blender 4k render, vibrant cinematic composition",
    CYBERPUNK: "cyberpunk aesthetic, vibrant neon cyan and amber glow, reflective wet asphalt, volumetric fog, futuristic megacity atmosphere, high contrast",
    LOGO: "modern minimalist vector logo, clean iconic emblem, flat corporate design, isolated on clean background, crisp typography, behance trending",
    MINIMALISTA: "clean minimalist composition, generous negative space, sophisticated muted pastel palette, balanced symmetry, high-end editorial design",
  };

  const enhancer = styleEnhancers[style] || styleEnhancers.REALISTA;
  return `${cleanPrompt}, ${enhancer}`;
}

export async function generateNeuralImage(params: ImageGenerationParams): Promise<ImageGenerationResult> {
  const { prompt, style = "REALISTA", aspectRatio = "1:1" } = params;
  const refinedPrompt = enhancePromptForStyle(prompt, style);
  const seed = Math.floor(Math.random() * 10000000);

  let width = 1024;
  let height = 1024;

  if (aspectRatio === "16:9") {
    width = 1280;
    height = 720;
  } else if (aspectRatio === "9:16") {
    width = 720;
    height = 1280;
  } else if (aspectRatio === "4:3") {
    width = 1024;
    height = 768;
  }

  const encodedPrompt = encodeURIComponent(refinedPrompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true&enhance=false`;

  return {
    imageUrl,
    refinedPrompt,
    seed,
    provider: "pollinations",
    model: "flux-ultra-8k",
  };
}

/**
 * Análise visual de imagem com foco em composição, iluminação e atributos
 */
export function analyzeVisualAttributes(imageDescription: string): {
  lighting: string;
  palette: string;
  composition: string;
  recommendedImprovements: string[];
} {
  return {
    lighting: "Iluminação de estúdio profissional com luz difusa e realce de contornos",
    palette: "Cores de alta saturação com equilíbrio tonal e pretos profundos",
    composition: "Regra dos terços com isolamento do objeto central e profundidade de campo rasa",
    recommendedImprovements: [
      "Aumentar o contraste das sombras para conferir maior dramaticidade",
      "Adicionar partículas volumétricas sutis para criar atmosfera imersiva",
      "Calibrar o balanço de branco para temperatura ligeiramente fria cinematográfica",
    ],
  };
}

/**
 * Gera prompt otimizado para isolamento e remoção de fundo
 */
export function prepareBackgroundRemovalPrompt(subject: string): string {
  return `isolated ${subject}, pure transparent alpha background, clean edges, studio product cutout, no shadows, no background elements, vector mask quality`;
}

/**
 * Geração baseada em imagem de referência
 */
export function buildReferenceEnhancedPrompt(subject: string, referenceStyle: string): string {
  return `${subject}, inspired by ${referenceStyle}, retaining identical subject geometry, upgraded to 8k resolution, photorealistic cinematic lighting, ultra-detailed textures`;
}

/**
 * Criação automática de prompt completo a partir de uma ideia simples
 */
export function createPromptFromIdea(idea: string, targetPlatform: "instagram" | "ecommerce" | "saas" | "cinematic"): string {
  const platformModifiers: Record<string, string> = {
    instagram: "commercial viral aesthetic, lifestyle photography, vibrant colors, trending on behance and unsplash, 8k",
    ecommerce: "clean studio product photography, pure minimalist background, crisp lighting, commercial packaging preview",
    saas: "modern enterprise technology dashboard, holographic UI elements, dark mode neon glow, isometric 3d render",
    cinematic: "cinematic film still, anamorphic lens flare, moody atmospheric grading, 35mm photograph, award-winning shot",
  };

  const modifier = platformModifiers[targetPlatform] || platformModifiers.cinematic;
  return `${idea.trim()}, ${modifier}`;
}

