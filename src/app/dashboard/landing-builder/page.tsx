// src/app/dashboard/landing-builder/page.tsx
// CRIADOR DE LANDING PAGE DE ALTA CONVERSÃO — ORVEXA PRIME (TEMA CLARO & INTUITIVO)

"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Globe,
  Copy,
  Check,
  Download,
  Smartphone,
  Monitor,
  ExternalLink,
  ArrowRight,
  Code,
  Eye,
  CheckCircle2,
  RefreshCw,
  Zap,
} from "lucide-react";

export default function LandingBuilderPage() {
  const [niche, setNiche] = useState("SaaS B2B & Software");
  const [businessName, setBusinessName] = useState("NexusFlow");
  const [valueProposition, setValueProposition] = useState(
    "Automatize processos operacionais e aumente a produtividade da sua equipe em até 3x."
  );
  const [primaryColor, setPrimaryColor] = useState("#0284C7");
  const [secondaryColor, setSecondaryColor] = useState("#0D9488");
  const [ctaText, setCtaText] = useState("Agendar Demonstração Gratuita");
  const [whatsappNumber, setWhatsappNumber] = useState("5511999998888");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "copy">("preview");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const presetNiches = [
    "SaaS B2B & Software",
    "Clínica Médica & Odontologia",
    "Advocacia & Jurídico",
    "Consultoria Empresarial",
    "E-commerce & Varejo",
    "Infoproduto & Cursos",
  ];

  const colorPalettes = [
    { name: "Azul Corporativo", primary: "#0284C7", secondary: "#0D9488" },
    { name: "Esmeralda Growth", primary: "#059669", secondary: "#0284C7" },
    { name: "Roxo Tech", primary: "#7C3AED", secondary: "#EC4899" },
    { name: "Laranja Conversão", primary: "#EA580C", secondary: "#D97706" },
    { name: "Dark Moderno", primary: "#0F172A", secondary: "#3B82F6" },
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!businessName.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/landing-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          businessName,
          valueProposition,
          primaryColor,
          secondaryColor,
          ctaText,
          whatsappNumber,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data);
      } else {
        alert(data.error || "Ocorreu um erro ao gerar a landing page.");
      }
    } catch (err: any) {
      alert("Falha de conexão: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!result?.html) return;
    navigator.clipboard.writeText(result.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadHtml = () => {
    if (!result?.html) return;
    const blob = new Blob([result.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${businessName.toLowerCase().replace(/\s+/g, "-")}-landing-page.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Criador de Landing Page
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Páginas de Alta Conversão em Segundos
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Insira os dados do seu produto ou negócio e deixe a inteligência artificial gerar copy
            persuasiva, estrutura completa e código responsivo pronto para publicação.
          </p>
        </div>

        <Link
          href="/dashboard/chat"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-sm transition-all self-start md:self-auto"
        >
          ← Voltar ao Chat
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulário de Configuração (Esquerda) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-600" />
            Definições do Projeto
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Nicho */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Segmento / Nicho
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {presetNiches.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNiche(n)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      niche === n
                        ? "bg-cyan-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ou digite um nicho específico..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
                required
              />
            </div>

            {/* Nome da Empresa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome da Empresa / Produto
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ex: NexusFlow, Clínica Sorriso, etc."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all font-semibold"
                required
              />
            </div>

            {/* Proposta de Valor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Proposta de Valor / Transformação
              </label>
              <textarea
                value={valueProposition}
                onChange={(e) => setValueProposition(e.target.value)}
                rows={3}
                placeholder="Qual o maior benefício ou dor que você resolve para o cliente?"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all leading-relaxed"
                required
              />
            </div>

            {/* Cores */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Paleta de Cores
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {colorPalettes.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(p.primary);
                      setSecondaryColor(p.secondary);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                      primaryColor === p.primary
                        ? "border-cyan-600 bg-cyan-50 text-cyan-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: p.primary }}
                    />
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-600">Primária: {primaryColor}</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-600">Secundária: {secondaryColor}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Texto do Botão de Ação (CTA)
              </label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="Ex: Quero Minha Proposta, Falar no WhatsApp"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
                required
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                WhatsApp com DDD (Opcional)
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Ex: 5511999998888"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all font-mono"
              />
            </div>

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.99] transition-all shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>A IA está estruturando sua Landing Page...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Gerar Landing Page Agora</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Área de Visualização e Código (Direita) */}
        <div className="lg:col-span-7 space-y-4">
          {result ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* Barra Superior de Ações */}
              <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
                {/* Abas */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "preview"
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-600" />
                    Preview Visual
                  </button>
                  <button
                    onClick={() => setActiveTab("code")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "code"
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Code className="w-3.5 h-3.5 text-cyan-600" />
                    Código HTML
                  </button>
                </div>

                {/* Alternador Desktop / Mobile (quando no preview) */}
                {activeTab === "preview" && (
                  <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg">
                    <button
                      onClick={() => setViewport("desktop")}
                      className={`p-1.5 rounded-md transition-all ${
                        viewport === "desktop" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      }`}
                      title="Visualização Desktop"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewport("mobile")}
                      className={`p-1.5 rounded-md transition-all ${
                        viewport === "mobile" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      }`}
                      title="Visualização Mobile"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all shadow-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar HTML</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadHtml}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar .html</span>
                  </button>
                </div>
              </div>

              {/* Conteúdo da Aba */}
              {activeTab === "preview" ? (
                <div className="p-4 bg-slate-100 flex items-center justify-center min-h-[640px]">
                  <div
                    className={`bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden transition-all duration-300 ${
                      viewport === "mobile" ? "w-[375px] h-[640px]" : "w-full h-[640px]"
                    }`}
                  >
                    <iframe
                      ref={iframeRef}
                      srcDoc={result.html}
                      title="Preview da Landing Page"
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs overflow-auto max-h-[640px] leading-relaxed">
                  <pre>{result.html}</pre>
                </div>
              )}
            </div>
          ) : (
            /* Estado Inicial Vazio */
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[480px] space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Sua Landing Page aparecerá aqui
              </h3>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                Preencha os campos ao lado com as informações do seu negócio e clique em{" "}
                <span className="font-semibold text-slate-700">"Gerar Landing Page Agora"</span>.
                A IA cuidará de toda a copy, layout e código para você.
              </p>
              <div className="pt-2 flex items-center gap-6 text-[11px] font-medium text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Pronta para Vender
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Responsiva (Mobile & Desktop)
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Exportação com 1 Clique
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

