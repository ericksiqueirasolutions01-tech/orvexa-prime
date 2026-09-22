"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Sliders,
  Download,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Layers,
  Zap,
  Tag,
  Type,
  Sun,
  Eye,
  Camera,
  Film,
  Palette,
  Maximize2,
  RotateCcw,
} from "lucide-react";

export default function ImageStudioPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "editor" | "gallery">("generate");

  // Geração
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<"POST" | "BANNER" | "LOGO" | "THUMBNAIL" | "MOCKUP" | "GERAL">("GERAL");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:5">("1:1");
  const [style, setStyle] = useState("Foto Realista 8K");
  const [generating, setGenerating] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedDetails, setEnhancedDetails] = useState<any | null>(null);

  // Imagem ativa para o Editor
  const [currentImage, setCurrentImage] = useState<any | null>(null);

  // Editor / Canvas State
  const [priceTag, setPriceTag] = useState("R$ 12,99");
  const [showPriceTag, setShowPriceTag] = useState(true);
  const [promoBadge, setPromoBadge] = useState("OFERTA ESPECIAL");
  const [showPromoBadge, setShowPromoBadge] = useState(true);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [neonGlow, setNeonGlow] = useState(false);

  // Histórico
  const [gallery, setGallery] = useState<any[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [copied, setCopied] = useState(false);

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchGallery = async () => {
    try {
      setLoadingGallery(true);
      const res = await fetch("/api/ai/image-studio/history");
      const data = await res.json();
      if (res.ok && data.images) {
        setGallery(data.images);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  // Aciona o Prompt Engine para transformar prompt simples em profissional
  const handleTurbinePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    try {
      const res = await fetch("/api/ai/prompt-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          category,
          aspectRatio,
          styleOverride: style,
        }),
      });
      const data = await res.json();
      if (res.ok && data.structured) {
        setEnhancedDetails(data.structured);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEnhancing(false);
    }
  };

  // Executa a geração de imagem
  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/image-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          refinedPrompt: enhancedDetails?.masterPrompt || undefined,
          category,
          style,
          aspectRatio,
        }),
      });
      const data = await res.json();
      if (res.ok && data.image) {
        setCurrentImage(data.image);
        setActiveTab("editor");
        fetchGallery();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // Exclusão de imagem da galeria
  const handleDeleteImage = async (id: string) => {
    if (!confirm("Deseja remover esta imagem da galeria?")) return;
    try {
      await fetch(`/api/ai/image-studio/history?id=${id}`, { method: "DELETE" });
      setGallery((prev) => prev.filter((img) => img.id !== id));
      if (currentImage?.id === id) setCurrentImage(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Renderização do Canvas e Download
  const handleDownload = () => {
    if (!currentImage) return;

    // Se for data:image/svg+xml, faz download direto
    if (currentImage.imageUrl.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = currentImage.imageUrl;
      a.download = `orvexa-studio-${Date.now()}.svg`;
      a.click();
      return;
    }

    const a = document.createElement("a");
    a.href = currentImage.imageUrl;
    a.target = "_blank";
    a.download = `orvexa-studio-${Date.now()}.png`;
    a.click();
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            ORVEXA IMAGE STUDIO • PROMPT ENGINE & DESIGN
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Estúdio de Criação & Edição de Imagens
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Geração de imagens de alta resolução, posts promocionais, logos e thumbnails.
            Equipado com o <strong>Prompt Engine</strong> para transformar pedidos simples em composições cinematográficas.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab("generate")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "generate"
                ? "bg-cyan-500 text-slate-950 shadow-neon-glow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Criar Imagem
          </button>
          <button
            onClick={() => setActiveTab("editor")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "editor"
                ? "bg-cyan-500 text-slate-950 shadow-neon-glow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Editor Visual
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "gallery"
                ? "bg-cyan-500 text-slate-950 shadow-neon-glow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Galeria ({gallery.length})
          </button>
        </div>
      </div>

      {/* ABA 1: GERADOR & PROMPT ENGINE */}
      {activeTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Esquerda: Controles e Input */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl space-y-5">
              <div>
                <label className="block text-xs font-bold text-white mb-2 flex items-center justify-between">
                  <span>Descreva a Imagem que Deseja Criar</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Prompt Direto</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Ex: Hambúrguer artesanal suculento com queijo cheddar derretido, bacon crocante, iluminação de estúdio escuro e preço 12,99..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full p-4 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none transition-colors"
                />
              </div>

              {/* Botão Turbinar Prompt */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleTurbinePrompt}
                  disabled={enhancing || !prompt.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600/30 to-cyan-600/30 hover:from-purple-600/40 hover:to-cyan-600/40 border border-purple-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 text-purple-400 ${enhancing ? "animate-spin" : ""}`} />
                  {enhancing ? "Estruturando com Prompt Engine..." : "⚡ Turbinar com Prompt Engine (11 Parâmetros)"}
                </button>

                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={generating || !prompt.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs shadow-neon-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Wand2 className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                  {generating ? "Gerando Imagem Ultra HD..." : "Gerar Imagem Agora"}
                </button>
              </div>

              {/* Configurações Rápidas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                {/* Formato / Aspect Ratio */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">Formato / Proporção</label>
                  <select
                    value={aspectRatio}
                    onChange={(e: any) => setAspectRatio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="1:1">1:1 (Quadrado • Feed)</option>
                    <option value="16:9">16:9 (Widescreen • Banner/YouTube)</option>
                    <option value="9:16">9:16 (Vertical • Stories/Reels)</option>
                    <option value="4:5">4:5 (Retrato • Instagram)</option>
                  </select>
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">Finalidade</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="GERAL">Geral / Comercial</option>
                    <option value="POST">Post Promocional</option>
                    <option value="BANNER">Banner Publicitário</option>
                    <option value="LOGO">Logo & Marca</option>
                    <option value="THUMBNAIL">Thumbnail YouTube</option>
                    <option value="MOCKUP">Mockup de Produto</option>
                  </select>
                </div>

                {/* Estilo */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">Estilo Visual</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Foto Realista 8K">Foto Realista 8K</option>
                    <option value="3D Octane Render">Render 3D Octane</option>
                    <option value="Cyberpunk Neon">Cyberpunk Neon</option>
                    <option value="Logo Minimalista">Logo Minimalista Vetorial</option>
                    <option value="Arte Publicitária">Arte Publicitária Comercial</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Visualização dos 11 Parâmetros do Prompt Engine */}
            {enhancedDetails && (
              <div className="p-6 rounded-2xl bg-gradient-to-b from-purple-950/30 to-[#0A0E1A] border border-purple-500/30 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-purple-300">
                      Prompt Estruturado pelo Engine (11 Parâmetros Cinematográficos)
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyPrompt(enhancedDetails.masterPrompt)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copiado!" : "Copiar Master Prompt"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Objetivo</span>
                    <span className="text-slate-200">{enhancedDetails.objetivo}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Público</span>
                    <span className="text-slate-200">{enhancedDetails.publico}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Iluminação</span>
                    <span className="text-slate-200">{enhancedDetails.iluminacao}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Composição & Câmera</span>
                    <span className="text-slate-200">{enhancedDetails.camera}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 sm:col-span-2">
                    <span className="text-[10px] text-red-400 block uppercase font-bold">Negative Prompt</span>
                    <span className="text-slate-400 font-mono text-[11px]">{enhancedDetails.negativePrompt}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Preview Rápido & Recentes */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                Preview em Tempo Real
              </h3>

              {currentImage ? (
                <div className="space-y-3">
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-cyan-500/30 shadow-lg group">
                    <img
                      src={currentImage.imageUrl}
                      alt={currentImage.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                      <p className="text-[11px] text-white font-medium line-clamp-2">{currentImage.prompt}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("editor")}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-neon-glow transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Abrir no Editor Visual
                  </button>
                </div>
              ) : (
                <div className="aspect-square w-full rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                  <Wand2 className="w-8 h-8 mb-2 opacity-40 text-cyan-400" />
                  <span className="text-xs font-medium">Nenhuma imagem gerada nesta sessão</span>
                  <span className="text-[10px] mt-1">Preencha o prompt ao lado para criar</span>
                </div>
              )}
            </div>

            {/* Presets de 1 Clique */}
            <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ideias Rápidas</h3>
              <div className="space-y-2">
                {[
                  {
                    title: "Etiqueta Hambúrguer R$ 12,99",
                    text: "Hambúrguer artesanal gourmet suculento com etiqueta promocional destacando preço R$ 12,99 em estúdio",
                    cat: "POST",
                  },
                  {
                    title: "Banner Tecnologia SaaS",
                    text: "Banner 16:9 futurista de inteligência artificial com neon ciano e linhas de código holográficas",
                    cat: "BANNER",
                  },
                  {
                    title: "Logo Vetorial Moderna",
                    text: "Logo minimalista e moderna em formato geométrico com contraste luxuoso preto e ciano",
                    cat: "LOGO",
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(item.text);
                      setCategory(item.cat as any);
                    }}
                    className="w-full p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-left text-xs transition-colors group"
                  >
                    <div className="font-semibold text-slate-300 group-hover:text-cyan-300">{item.title}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{item.text}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: EDITOR VISUAL / CANVAS INTERATIVO */}
      {activeTab === "editor" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Canvas Preview */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl flex flex-col items-center justify-center min-h-[500px]">
            {currentImage ? (
              <div className="relative max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/30 group">
                <img
                  src={currentImage.imageUrl}
                  alt={currentImage.prompt}
                  style={{
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) ${
                      neonGlow ? "drop-shadow(0 0 25px rgba(0,240,255,0.6))" : ""
                    }`,
                  }}
                  className="w-full h-auto object-cover transition-all"
                />

                {/* Overlay Interativo: Selo de Preço */}
                {showPriceTag && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-red-600 to-amber-500 text-white font-black px-4 py-2 rounded-xl shadow-2xl border-2 border-white flex flex-col items-center animate-bounce">
                    <span className="text-[9px] uppercase tracking-wider">Apenas</span>
                    <span className="text-xl leading-none">{priceTag}</span>
                  </div>
                )}

                {/* Overlay Interativo: Badge Promocional */}
                {showPromoBadge && (
                  <div className="absolute bottom-4 left-4 bg-slate-950/90 text-cyan-300 font-extrabold px-3 py-1.5 rounded-lg border border-cyan-500/40 text-xs tracking-wider shadow-lg flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    {promoBadge}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-500 space-y-3 py-20">
                <ImageIcon className="w-12 h-12 mx-auto opacity-40 text-cyan-400" />
                <p className="text-sm">Nenhuma imagem selecionada para edição.</p>
                <button
                  onClick={() => setActiveTab("generate")}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs shadow-neon-glow"
                >
                  Gerar Primeira Imagem
                </button>
              </div>
            )}
          </div>

          {/* Painel de Controles do Editor */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl space-y-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Ajuste de Preços & Overlays
              </h3>

              {/* Controle do Preço */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Etiqueta de Preço</span>
                  <input
                    type="checkbox"
                    checked={showPriceTag}
                    onChange={(e) => setShowPriceTag(e.target.checked)}
                    className="rounded accent-cyan-500 cursor-pointer"
                  />
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={priceTag}
                    onChange={(e) => setPriceTag(e.target.value)}
                    disabled={!showPriceTag}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Controle do Badge Promocional */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Selo Promocional</span>
                  <input
                    type="checkbox"
                    checked={showPromoBadge}
                    onChange={(e) => setShowPromoBadge(e.target.checked)}
                    className="rounded accent-cyan-500 cursor-pointer"
                  />
                </label>
                <div className="relative">
                  <Type className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={promoBadge}
                    onChange={(e) => setPromoBadge(e.target.value)}
                    disabled={!showPromoBadge}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Filtros Visuais */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
                  Filtros & Correção de Cor
                </h4>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Brilho</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Contraste</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Saturação</span>
                    <span>{saturate}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={saturate}
                    onChange={(e) => setSaturate(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-300 font-medium">Efeito Neon Glow 8K</span>
                  <input
                    type="checkbox"
                    checked={neonGlow}
                    onChange={(e) => setNeonGlow(e.target.checked)}
                    className="rounded accent-cyan-500 cursor-pointer w-4 h-4"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!currentImage}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs shadow-neon-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Baixar Imagem em Alta Resolução
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBrightness(100);
                    setContrast(100);
                    setSaturate(100);
                    setNeonGlow(false);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: GALERIA DE HISTÓRICO */}
      {activeTab === "gallery" && (
        <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Histórico de Criações Salvas ({gallery.length})</h2>
              <p className="text-xs text-slate-400 mt-0.5">Todas as imagens geradas pela sua conta ficam persistidas no banco.</p>
            </div>
            <button
              onClick={fetchGallery}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingGallery ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </div>

          {loadingGallery ? (
            <div className="text-center py-20 text-xs text-slate-500">Carregando galeria...</div>
          ) : gallery.length === 0 ? (
            <div className="text-center py-20 text-xs text-slate-500 space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto opacity-30 text-cyan-400" />
              <p>Nenhuma imagem gerada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((img) => (
                <div
                  key={img.id}
                  className="group relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                >
                  <div className="aspect-square w-full relative overflow-hidden">
                    <img
                      src={img.imageUrl}
                      alt={img.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-xs text-white font-medium line-clamp-2">{img.prompt}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{img.dimensions}</span>
                      <span>{new Date(img.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          setCurrentImage(img);
                          setActiveTab("editor");
                        }}
                        className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <Sliders className="w-3 h-3" /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
