"use client";

import { useEffect, useState, useRef } from "react";
import {
  Globe,
  Sparkles,
  ShoppingBag,
  Stethoscope,
  Utensils,
  Flame,
  Scale,
  PawPrint,
  Zap,
  Eye,
  Code,
  Download,
  Copy,
  Check,
  Smartphone,
  Tablet,
  Monitor,
  Search,
  Save,
  Trash2,
  Share2,
  RefreshCw,
  Palette,
  CheckCircle2,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { SITE_TEMPLATES, COLOR_PRESETS, GeneratedSite } from "@/lib/site-builder";

export default function SiteBuilderPage() {
  // Configuração Inicial
  const [selectedSegment, setSelectedSegment] = useState<string>("loja");
  const [siteName, setSiteName] = useState("Nexus Tech Store");
  const [siteObjective, setSiteObjective] = useState("Vender eletrônicos premium com pedidos diretos pelo WhatsApp");
  const [whatsappNumber, setWhatsappNumber] = useState("5511999998888");
  const [primaryColor, setPrimaryColor] = useState("#06B6D4");
  const [secondaryColor, setSecondaryColor] = useState("#10B981");
  const [bgColor, setBgColor] = useState("#080C14");

  // Estado de Geração e Workspace
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState("");
  const [generatedSite, setGeneratedSite] = useState<GeneratedSite | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "editor" | "code" | "seo" | "saved">("preview");
  const [deviceViewport, setDeviceViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copiedCode, setCopiedCode] = useState(false);

  // Projetos Salvos
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [savingProject, setSavingProject] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editor Rápido de Conteúdo
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editCtaText, setEditCtaText] = useState("");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Carrega projetos salvos ao inicializar
  useEffect(() => {
    fetchSavedProjects();
  }, []);

  const fetchSavedProjects = async () => {
    try {
      const res = await fetch("/api/ai/site-builder/projects");
      if (res.ok) {
        const data = await res.json();
        setSavedProjects(data.projects || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Seleciona um template e aplica presets
  const handleSelectTemplate = (slug: string) => {
    setSelectedSegment(slug);
    const tmpl = SITE_TEMPLATES.find((t) => t.slug === slug);
    if (tmpl) {
      setPrimaryColor(tmpl.defaultColors.primary);
      setSecondaryColor(tmpl.defaultColors.secondary);
      setBgColor(tmpl.defaultColors.bg);

      if (slug === "loja") {
        setSiteName("Nexus Commerce");
        setSiteObjective("Vender produtos tecnológicos com entrega rápida e checkout via WhatsApp");
      } else if (slug === "clinica") {
        setSiteName("Clínica São Rafael");
        setSiteObjective("Agendar consultas médicas preventivas e exames com médicos especialistas");
      } else if (slug === "restaurante") {
        setSiteName("Bistrô Paris Gourmet");
        setSiteObjective("Cardápio digital apetitoso, reserva de mesas e pedidos pelo WhatsApp");
      } else if (slug === "igreja") {
        setSiteName("Comunidade da Graça");
        setSiteObjective("Divulgar horários de cultos, acolher novas famílias e receber doações");
      } else if (slug === "advogado") {
        setSiteName("Silva & Associados Advocacia");
        setSiteObjective("Atendimento jurídico corporativo e consultoria confidencial");
      } else if (slug === "petshop") {
        setSiteName("AuAu Pet Spa & Vet");
        setSiteObjective("Banho e tosa com amor, hotel pet e consultas veterinárias rápidas");
      } else if (slug === "landing") {
        setSiteName("Orvexa Pro Accelerator");
        setSiteObjective("Capturar leads qualificados e vender mentoria de alta performance");
      }
    }
  };

  // Aplica preset de cores
  const handleSelectPreset = (p: typeof COLOR_PRESETS[0]) => {
    setPrimaryColor(p.primary);
    setSecondaryColor(p.secondary);
    setBgColor(p.bg);
  };

  // Geração do Site
  const handleGenerateSite = async () => {
    setGenerating(true);
    setGenStep("Analisando segmento e objetivos comerciais...");

    setTimeout(() => {
      setGenStep("Estruturando seções responsivas e blocos semânticos...");
    }, 700);

    setTimeout(() => {
      setGenStep("Configurando metadados SEO, OpenGraph e Schema.org...");
    }, 1400);

    setTimeout(() => {
      setGenStep("Finalizando estilização Tailwind e scripts interativos...");
    }, 2100);

    try {
      const res = await fetch("/api/ai/site-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment: selectedSegment,
          name: siteName,
          primaryColor,
          secondaryColor,
          bgColor,
          objective: siteObjective,
          whatsapp: whatsappNumber,
        }),
      });

      const data = await res.json();
      if (data.success && data.site) {
        setGeneratedSite(data.site);
        setEditTitle(data.site.title);
        const heroBlock = data.site.blocks.find((b: any) => b.type === "hero");
        if (heroBlock) {
          setEditSubtitle(heroBlock.subtitle || "");
          setEditCtaText(heroBlock.ctaText || "");
        }
        setActiveTab("preview");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
      setGenStep("");
    }
  };

  // Atualização Rápida no Editor
  const handleApplyQuickEdits = () => {
    if (!generatedSite) return;

    let updatedHtml = generatedSite.html;
    if (editTitle) {
      updatedHtml = updatedHtml.replace(
        new RegExp(`<span class="font-extrabold text-xl tracking-tight text-white">.*?</span>`, "g"),
        `<span class="font-extrabold text-xl tracking-tight text-white">${editTitle}</span>`
      );
    }
    if (editSubtitle) {
      updatedHtml = updatedHtml.replace(
        new RegExp(`<p class="text-lg text-slate-300 mb-8 leading-relaxed">.*?</p>`, "g"),
        `<p class="text-lg text-slate-300 mb-8 leading-relaxed">${editSubtitle}</p>`
      );
    }
    if (editCtaText) {
      updatedHtml = updatedHtml.replace(
        new RegExp(`<a href=".*?" target="_blank" rel="noopener noreferrer" class="px-8 py-4 rounded-xl bg-gradient-to-r.*?>(.*?)<svg`, "g"),
        (match, p1) => match.replace(p1, `${editCtaText} `)
      );
    }

    setGeneratedSite({
      ...generatedSite,
      html: updatedHtml,
    });
    setActiveTab("preview");
  };

  // Salvar no Banco de Dados
  const handleSaveProject = async () => {
    if (!generatedSite) return;
    setSavingProject(true);
    try {
      const res = await fetch("/api/ai/site-builder/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: siteName,
          segment: selectedSegment,
          description: siteObjective,
          layoutData: generatedSite,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchSavedProjects();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProject(false);
    }
  };

  // Download do index.html
  const handleDownloadHtml = () => {
    if (!generatedSite) return;
    const blob = new Blob([generatedSite.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `index-${siteName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copiar Código HTML
  const handleCopyHtml = () => {
    if (!generatedSite) return;
    navigator.clipboard.writeText(generatedSite.html);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Excluir Projeto
  const handleDeleteProject = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este site?")) return;
    try {
      const res = await fetch(`/api/ai/site-builder/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSavedProjects();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Ícone por slug
  const getSegmentIcon = (slug: string) => {
    switch (slug) {
      case "loja": return ShoppingBag;
      case "clinica": return Stethoscope;
      case "restaurante": return Utensils;
      case "igreja": return Flame;
      case "advogado": return Scale;
      case "petshop": return PawPrint;
      case "landing": default: return Zap;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0D1322] via-[#091528] to-[#0A1A22] border border-cyan-500/25 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              ORVEXA SITE BUILDER — GATE 5
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Criador Automático de Sites Profissionais
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Gere sites completos, responsivos, com textos de alta conversão, código Tailwind CSS e pacote SEO avançado para 7 segmentos comerciais com 1 clique.
            </p>
          </div>

          {generatedSite && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveProject}
                disabled={savingProject}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center gap-2"
              >
                {saveSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4 text-cyan-400" />}
                {saveSuccess ? "Salvo no Banco!" : savingProject ? "Salvando..." : "Salvar Projeto"}
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-neon-glow transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar index.html
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid Principal: Painel de Criação + Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUNA ESQUERDA: Configuração & Templates (4 colunas) */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Escolha do Segmento / Template */}
          <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                1. Escolha o Segmento
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                7 TEMPLATES
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {SITE_TEMPLATES.map((tmpl) => {
                const IconComponent = getSegmentIcon(tmpl.slug);
                const isSelected = selectedSegment === tmpl.slug;
                return (
                  <button
                    key={tmpl.slug}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.slug)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                      isSelected
                        ? "bg-cyan-950/40 border-cyan-500 text-white shadow-neon-cyan/20 shadow-md"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850"
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isSelected ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">{tmpl.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {tmpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{tmpl.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Informações do Negócio & Cores */}
          <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              2. Dados & Estilo Visual
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nome do Negócio</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                  placeholder="Ex: Nexus Store, Clínica Bella..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">WhatsApp de Vendas</label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="Ex: 5511999998888"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Objetivo Comercial</label>
                <textarea
                  rows={2}
                  value={siteObjective}
                  onChange={(e) => setSiteObjective(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 resize-none"
                  placeholder="Ex: Atrair clientes locais, agendar consultas..."
                />
              </div>

              {/* Presets de Cores */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Paleta Harmônica</span>
                  <span className="text-[10px] text-slate-400 font-mono">PRESETS</span>
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {COLOR_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.primary }} />
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.secondary }} />
                      </div>
                      <span className="text-[10px] text-slate-300 font-medium truncate block">{p.name}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Cor Primária</span>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs font-mono text-slate-200">{primaryColor}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Cor Secundária</span>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs font-mono text-slate-200">{secondaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão de Geração */}
            <button
              type="button"
              onClick={handleGenerateSite}
              disabled={generating}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-400 hover:opacity-90 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-neon-glow transition-all"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gerando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Site Completo com IA
                </>
              )}
            </button>

            {generating && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-center animate-pulse">
                <span className="text-xs text-cyan-300 font-mono">{genStep}</span>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Workspace Interativo & Preview (8 colunas) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Navegação de Abas do Workspace */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#0D1322] border border-slate-800">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "preview"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Eye className="w-4 h-4" />
                Preview Interativo
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "editor"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Palette className="w-4 h-4" />
                Editor Rápido
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("code")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "code"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Code className="w-4 h-4" />
                Código HTML
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("seo")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "seo"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Search className="w-4 h-4" />
                Diagnóstico SEO
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("saved")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "saved"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Save className="w-4 h-4" />
                Salvos ({savedProjects.length})
              </button>
            </div>

            {/* Alternador de Viewport (Desktop / Tablet / Mobile) */}
            {activeTab === "preview" && (
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeviceViewport("desktop")}
                  className={`p-1.5 rounded-lg transition-all ${
                    deviceViewport === "desktop" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                  title="Visualização Desktop (100%)"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceViewport("tablet")}
                  className={`p-1.5 rounded-lg transition-all ${
                    deviceViewport === "tablet" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                  title="Visualização Tablet (768px)"
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceViewport("mobile")}
                  className={`p-1.5 rounded-lg transition-all ${
                    deviceViewport === "mobile" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                  title="Visualização Mobile (375px)"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* CONTEÚDO DA ABA: 1. PREVIEW INTERATIVO */}
          {activeTab === "preview" && (
            <div className="p-4 rounded-3xl bg-[#0D1322] border border-slate-800 flex flex-col items-center min-h-[620px]">
              {generatedSite ? (
                <div
                  className={`transition-all duration-300 w-full overflow-hidden rounded-2xl border border-slate-800 bg-white ${
                    deviceViewport === "desktop"
                      ? "w-full h-[620px]"
                      : deviceViewport === "tablet"
                      ? "w-[768px] h-[620px] shadow-2xl"
                      : "w-[375px] h-[620px] shadow-2xl border-4 border-slate-700"
                  }`}
                >
                  <iframe
                    ref={iframeRef}
                    srcDoc={generatedSite.html}
                    title="Live Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              ) : (
                <div className="w-full h-[620px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-neon-cyan">
                    <Globe className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Nenhum site gerado ainda</h3>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                    Selecione um segmento à esquerda, configure as informações do seu negócio e clique em{" "}
                    <strong className="text-cyan-400">"Gerar Site Completo com IA"</strong> para visualizar o preview interativo aqui.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateSite}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-bold text-xs shadow-neon-glow"
                  >
                    Gerar Demonstração Agora
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CONTEÚDO DA ABA: 2. EDITOR RÁPIDO */}
          {activeTab === "editor" && (
            <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Editor Rápido de Conteúdo</h3>
                <p className="text-xs text-slate-400">
                  Faça ajustes finos em títulos, textos e chamadas. As alterações são sincronizadas no preview e código.
                </p>
              </div>

              {generatedSite ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Nome / Logo da Marca</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Subtítulo da Seção Hero</label>
                    <textarea
                      rows={3}
                      value={editSubtitle}
                      onChange={(e) => setEditSubtitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Texto do Botão Principal (CTA)</label>
                    <input
                      type="text"
                      value={editCtaText}
                      onChange={(e) => setEditCtaText(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyQuickEdits}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-bold text-xs shadow-neon-glow"
                  >
                    Aplicar Alterações no Preview
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Gere um site primeiro para poder editá-lo.</p>
              )}
            </div>
          )}

          {/* CONTEÚDO DA ABA: 3. CÓDIGO HTML */}
          {activeTab === "code" && (
            <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Código Fonte Autossuficiente</h3>
                  <p className="text-xs text-slate-400">HTML5 + Tailwind CSS completo. Salve como index.html e publique onde quiser.</p>
                </div>

                {generatedSite && (
                  <button
                    type="button"
                    onClick={handleCopyHtml}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                    {copiedCode ? "Copiado!" : "Copiar Código"}
                  </button>
                )}
              </div>

              {generatedSite ? (
                <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-[500px]">
                  <code>{generatedSite.html}</code>
                </pre>
              ) : (
                <p className="text-xs text-slate-500">Nenhum código gerado ainda.</p>
              )}
            </div>
          )}

          {/* CONTEÚDO DA ABA: 4. DIAGNÓSTICO SEO */}
          {activeTab === "seo" && (
            <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Pacote & Auditoria de SEO</h3>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    PONTUAÇÃO: 98/100
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Otimização para os motores de busca Google, Bing e indexadores com Schema.org JSON-LD estruturado.
                </p>
              </div>

              {generatedSite ? (
                <div className="space-y-5">
                  {/* Google Search Snippet Simulation */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                      Preview no Google Search
                    </span>
                    <div className="text-xs text-slate-400 font-mono mb-1">https://orvexa.digital › {generatedSite.segment}</div>
                    <div className="text-base font-semibold text-blue-400 hover:underline cursor-pointer mb-1">
                      {generatedSite.seo.title}
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed">
                      {generatedSite.seo.description}
                    </div>
                  </div>

                  {/* Metadados Detalhados */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">Meta Title</span>
                      <div className="text-xs text-white font-medium">{generatedSite.seo.title}</div>
                      <span className="text-[10px] text-cyan-400 block mt-1">{generatedSite.seo.title.length} caracteres (Ideal: &lt; 60)</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">Palavras-chave (Keywords)</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {generatedSite.seo.keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Schema.org Structured Data */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1.5">Schema.org JSON-LD (Rich Snippet)</span>
                    <pre className="p-3 rounded-lg bg-slate-950 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                      {JSON.stringify(JSON.parse(generatedSite.seo.schemaJson), null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Gere um site para visualizar o pacote SEO.</p>
              )}
            </div>
          )}

          {/* CONTEÚDO DA ABA: 5. PROJETOS SALVOS */}
          {activeTab === "saved" && (
            <div className="p-6 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Meus Sites Salvos</h3>
                <p className="text-xs text-slate-400">Projetos persistidos no banco de dados para reabrir, editar ou publicar.</p>
              </div>

              {savedProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedProjects.map((p) => {
                    let parsedData: any = null;
                    try {
                      parsedData = typeof p.layoutData === "string" ? JSON.parse(p.layoutData) : p.layoutData;
                    } catch (e) {}

                    return (
                      <div key={p.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 text-[10px] font-bold border border-cyan-500/30">
                            {p.segment}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-white">{p.name}</h4>
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{p.description}</p>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (parsedData?.html) {
                                setGeneratedSite(parsedData);
                                setSiteName(p.name);
                                setSelectedSegment(p.segment.toLowerCase());
                                setActiveTab("preview");
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 text-xs font-bold transition-all"
                          >
                            Abrir no Preview
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProject(p.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Excluir Site"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  Você ainda não salvou nenhum projeto. Gere um site e clique em "Salvar Projeto".
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

