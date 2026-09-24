// src/app/api/ai/landing-builder/route.ts
// CRIADOR DE LANDING PAGE DE ALTA CONVERSÃO — ORVEXA PRIME

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { AIProviderService } from "@/ai/services/provider.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const {
      niche = "Geral",
      businessName = "Minha Empresa",
      valueProposition = "Soluções inteligentes para acelerar seus resultados",
      primaryColor = "#0284C7",
      secondaryColor = "#0D9488",
      ctaText = "Quero Começar Agora",
      whatsappNumber = "",
    } = body;

    // 1. Localiza a chave de API ativa
    const activeKey = await prisma.apiKey.findFirst({
      where: { status: "ACTIVE" },
      include: { provider: true },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    if (!activeKey) {
      return NextResponse.json(
        { error: "Nenhuma IA configurada pelo administrador. Cadastre uma chave em /admin/api-keys." },
        { status: 503 }
      );
    }

    const apiKey = decryptApiKey(activeKey.encryptedKey, activeKey.iv, activeKey.authTag);
    const baseUrl = await AIProviderService.resolveOpenAiBaseUrl(
      activeKey.customBaseUrl,
      activeKey.provider?.slug
    );

    // Modelo de produção padrão (gpt-6-sol ou gpt-5.6-sol)
    const modelToUse = "gpt-6-sol";

    const systemPrompt = `Você é um Diretor de Copywriting e Especialista em Landing Pages de Altíssima Conversão da ORVEXA PRIME.
Sua missão é gerar os textos persuasivos e a estrutura completa de uma Landing Page moderna, elegante, limpa e focada em conversão para o negócio informado.
Você DEVE responder EXCLUSIVAMENTE em formato JSON VÁLIDO sem blocos markdown extras (sem \`\`\`json).`;

    const userPrompt = `Gere os dados de copy e estrutura para a seguinte empresa:
- Nicho: ${niche}
- Nome da Empresa/Produto: ${businessName}
- Proposta de Valor: ${valueProposition}
- Cor Primária: ${primaryColor}
- Cor Secundária: ${secondaryColor}
- CTA Principal: ${ctaText}
- WhatsApp: ${whatsappNumber || "Não informado"}

Retorne um objeto JSON com as seguintes chaves exatas:
{
  "headline": "Título cativante e de alto impacto",
  "subheadline": "Subtítulo explicativo com gancho persuasivo",
  "badge": "Microtexto de autoridade ou garantia",
  "problemTitle": "O problema enfrentado pelo cliente",
  "problemDescription": "Explicação empática da dor",
  "solutionTitle": "Como a ${businessName} resolve isso",
  "solutionDescription": "Explicação clara e atrativa da solução",
  "benefits": [
    {"icon": "Zap", "title": "Benefício 1", "description": "Detalhe persuasivo 1"},
    {"icon": "ShieldCheck", "title": "Benefício 2", "description": "Detalhe persuasivo 2"},
    {"icon": "TrendingUp", "title": "Benefício 3", "description": "Detalhe persuasivo 3"},
    {"icon": "Clock", "title": "Benefício 4", "description": "Detalhe persuasivo 4"}
  ],
  "testimonials": [
    {"name": "Carlos Silveira", "role": "Cliente Satisfeito", "text": "Depoimento convincente e realista", "rating": 5},
    {"name": "Mariana Fontes", "role": "Empresária", "text": "Depoimento convincente e realista", "rating": 5}
  ],
  "faq": [
    {"question": "Pergunta frequente 1?", "answer": "Resposta convincente e transparente 1"},
    {"question": "Pergunta frequente 2?", "answer": "Resposta convincente e transparente 2"},
    {"question": "Pergunta frequente 3?", "answer": "Resposta convincente e transparente 3"},
    {"question": "Pergunta frequente 4?", "answer": "Resposta convincente e transparente 4"}
  ],
  "ctaFinalHeadline": "Chamada final irresistível",
  "ctaFinalSubheadline": "Garantia ou incentivo de urgência",
  "ctaButton": "${ctaText}"
}`;

    // Chamada à API com streaming SSE (necessário para compatibilidade com Mirai e proxies com timeout)
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2500,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[LandingBuilder] Upstream error:", response.status, errText);
      throw new Error(`Falha no provedor de IA (${response.status}): ${errText.slice(0, 150)}`);
    }

    let rawContent = "";
    const reader = response.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      const deadline = Date.now() + 20000;
      while (true) {
        if (Date.now() > deadline) break;
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || line.startsWith(":")) continue; // Ignora PINGs e comentários
          if (line === "data: [DONE]" || line === "[DONE]") break;
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6).trim());
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) rawContent += delta;
            } catch {}
          }
        }
      }
    }

    // Limpa markdown se o modelo tiver incluído
    let cleanJson = rawContent.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanJson);
    } catch {
      // Fallback gracioso com valores de alta conversão
      parsedData = {
        headline: `${businessName}: A Solução Definitiva para ${niche}`,
        subheadline: valueProposition,
        badge: "Garantia de Satisfação & Qualidade Comprovada",
        problemTitle: "Cansado de perder tempo e resultados com soluções ineficazes?",
        problemDescription: `Sabemos o quanto é frustrante não alcançar o potencial máximo no seu segmento de ${niche}.`,
        solutionTitle: `Descubra a inovação da ${businessName}`,
        solutionDescription: `Criamos uma metodologia personalizada para você alcançar excelência com agilidade.`,
        benefits: [
          { icon: "Zap", title: "Velocidade & Eficiência", description: "Resultados visíveis nos primeiros dias de implementação." },
          { icon: "ShieldCheck", title: "Segurança Total", description: "Processos validados e garantia contratual completa." },
          { icon: "TrendingUp", title: "Crescimento Acelerado", description: "Aumente seu faturamento e sua autoridade de mercado." },
          { icon: "Clock", title: "Suporte Especializado", description: "Equipe disponível para tirar dúvidas e acelerar sua jornada." },
        ],
        testimonials: [
          { name: "Guilherme Santos", role: "Diretor Comercial", text: "Transformou completamente nossos resultados. Recomendo de olhos fechados!", rating: 5 },
          { name: "Luciana Costa", role: "Empreendedora", text: "Superou todas as nossas expectativas. Atendimento impecável!", rating: 5 },
        ],
        faq: [
          { question: "Como funciona a contratação?", answer: "Você clica no botão, conversa diretamente com nosso especialista e recebe uma proposta sob medida." },
          { question: "Qual o prazo de entrega/início?", answer: "Início imediato após o alinhamento inicial das suas necessidades." },
          { question: "Possui garantia?", answer: "Sim, oferecemos garantia total de satisfação ou ajustamos até você ficar 100% satisfeito." },
          { question: "Quais as formas de pagamento?", answer: "Aceitamos Pix, cartão de crédito parcelado e boleto bancário." },
        ],
        ctaFinalHeadline: `Pronto para transformar seus resultados com a ${businessName}?`,
        ctaFinalSubheadline: "Condições exclusivas por tempo limitado. Fale conosco agora mesmo!",
        ctaButton: ctaText,
      };
    }

    // Gera o código HTML completo e responsivo estilizado com Tailwind CSS CDN
    const generatedHtml = generateTailwindLandingHtml({
      data: parsedData,
      businessName,
      niche,
      primaryColor,
      secondaryColor,
      whatsappNumber,
    });

    return NextResponse.json({
      success: true,
      copy: parsedData,
      html: generatedHtml,
      modelUsed: modelToUse,
    });
  } catch (error: any) {
    console.error("[LandingBuilder POST Error]:", error);
    return NextResponse.json(
      { error: "Erro ao gerar Landing Page: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * Função utilitária que gera uma página HTML completa, responsiva, moderna e limpa com Tailwind CSS CDN
 */
function generateTailwindLandingHtml(params: {
  data: any;
  businessName: string;
  niche: string;
  primaryColor: string;
  secondaryColor: string;
  whatsappNumber: string;
}): string {
  const { data, businessName, primaryColor, secondaryColor, whatsappNumber } = params;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=Ol%C3%A1!%20Vim%20pela%20Landing%20Page%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es.`
    : "#contato";

  return `<!DOCTYPE html>
<html lang="pt-BR" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName} — ${data.headline}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .bg-primary { background-color: ${primaryColor}; }
    .text-primary { color: ${primaryColor}; }
    .border-primary { border-color: ${primaryColor}; }
    .bg-secondary { background-color: ${secondaryColor}; }
    .text-secondary { color: ${secondaryColor}; }
  </style>
</head>
<body class="bg-white text-slate-800 antialiased selection:bg-slate-900 selection:text-white">

  <!-- NAVBAR -->
  <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
    <div class="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
      <div class="font-extrabold text-2xl tracking-tight text-slate-900">
        ${businessName}
      </div>
      <nav class="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
        <a href="#beneficios" class="hover:text-slate-900 transition-colors">Benefícios</a>
        <a href="#depoimentos" class="hover:text-slate-900 transition-colors">Depoimentos</a>
        <a href="#faq" class="hover:text-slate-900 transition-colors">Dúvidas</a>
      </nav>
      <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer"
         class="px-5 py-2.5 rounded-full font-bold text-sm text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
         style="background-color: ${primaryColor};">
        ${data.ctaButton || "Falar com Especialista"}
      </a>
    </div>
  </header>

  <!-- HERO SECTION -->
  <section class="py-20 md:py-32 px-6 bg-gradient-to-b from-slate-50 to-white text-center">
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
        ✨ ${data.badge || "Exclusivo & Comprovado"}
      </div>
      <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.15]">
        ${data.headline}
      </h1>
      <p class="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
        ${data.subheadline}
      </p>
      <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer"
           class="w-full sm:w-auto px-8 py-4 rounded-full font-extrabold text-base text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
           style="background-color: ${primaryColor};">
          ${data.ctaButton} →
        </a>
      </div>
      <div class="pt-6 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
        <span>🔒 100% Seguro</span>
        <span>⚡ Atendimento Imediato</span>
        <span>⭐ Satisfação Garantida</span>
      </div>
    </div>
  </section>

  <!-- PROBLEMA & SOLUÇÃO -->
  <section class="py-20 px-6 bg-white border-t border-slate-100">
    <div class="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div class="p-8 rounded-3xl bg-red-50/50 border border-red-100 space-y-4">
        <span class="text-xs font-bold text-red-600 uppercase tracking-wider">O Desafio Comum</span>
        <h3 class="text-2xl font-bold text-slate-900">${data.problemTitle}</h3>
        <p class="text-slate-600 leading-relaxed">${data.problemDescription}</p>
      </div>
      <div class="p-8 rounded-3xl bg-emerald-50/50 border border-emerald-100 space-y-4">
        <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">A Nossa Resposta</span>
        <h3 class="text-2xl font-bold text-slate-900">${data.solutionTitle}</h3>
        <p class="text-slate-600 leading-relaxed">${data.solutionDescription}</p>
      </div>
    </div>
  </section>

  <!-- BENEFÍCIOS -->
  <section id="beneficios" class="py-24 px-6 bg-slate-50 border-t border-slate-100">
    <div class="max-w-6xl mx-auto space-y-16">
      <div class="text-center space-y-4">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Vantagens Exclusivas</span>
        <h2 class="text-3xl md:text-4xl font-extrabold text-slate-950">Por que escolher a ${businessName}?</h2>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        ${data.benefits
          .map(
            (b: any) => `
          <div class="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-white" style="background-color: ${primaryColor};">
              ✓
            </div>
            <h4 class="font-bold text-lg text-slate-900">${b.title}</h4>
            <p class="text-sm text-slate-600 leading-relaxed">${b.description}</p>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  </section>

  <!-- DEPOIMENTOS -->
  <section id="depoimentos" class="py-24 px-6 bg-white border-t border-slate-100">
    <div class="max-w-4xl mx-auto space-y-16">
      <div class="text-center space-y-4">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Prova Social</span>
        <h2 class="text-3xl md:text-4xl font-extrabold text-slate-950">O que nossos clientes dizem</h2>
      </div>
      <div class="grid md:grid-cols-2 gap-8">
        ${data.testimonials
          .map(
            (t: any) => `
          <div class="p-8 rounded-3xl bg-slate-50 border border-slate-200/70 space-y-4">
            <div class="text-amber-400 font-bold tracking-widest">★★★★★</div>
            <p class="text-slate-700 italic leading-relaxed">"${t.text}"</p>
            <div class="pt-2 border-t border-slate-200/50">
              <div class="font-bold text-slate-900">${t.name}</div>
              <div class="text-xs text-slate-500">${t.role}</div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section id="faq" class="py-24 px-6 bg-slate-50 border-t border-slate-100">
    <div class="max-w-3xl mx-auto space-y-12">
      <div class="text-center space-y-4">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Transparência</span>
        <h2 class="text-3xl md:text-4xl font-extrabold text-slate-950">Perguntas Frequentes</h2>
      </div>
      <div class="space-y-4">
        ${data.faq
          .map(
            (f: any) => `
          <details class="group p-6 rounded-2xl bg-white border border-slate-200/80 cursor-pointer">
            <summary class="font-bold text-slate-900 flex items-center justify-between">
              <span>${f.question}</span>
              <span class="text-xl transition-transform group-open:rotate-45">+</span>
            </summary>
            <p class="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
              ${f.answer}
            </p>
          </details>
        `
          )
          .join("")}
      </div>
    </div>
  </section>

  <!-- CTA FINAL -->
  <section class="py-24 px-6 bg-slate-950 text-white text-center">
    <div class="max-w-4xl mx-auto space-y-6">
      <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight">
        ${data.ctaFinalHeadline}
      </h2>
      <p class="text-slate-400 text-lg max-w-xl mx-auto">
        ${data.ctaFinalSubheadline}
      </p>
      <div class="pt-6">
        <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer"
           class="inline-block px-10 py-5 rounded-full font-black text-lg text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
           style="background-color: ${primaryColor};">
          ${data.ctaButton} →
        </a>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="py-10 px-6 bg-slate-900 text-slate-400 text-center text-xs border-t border-slate-800">
    <p>© ${new Date().getFullYear()} ${businessName}. Todos os direitos reservados.</p>
    <p class="mt-1 text-slate-600">Desenvolvido com tecnologia ORVEXA PRIME AI.</p>
  </footer>

</body>
</html>`;
}
