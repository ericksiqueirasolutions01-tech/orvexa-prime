"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Sparkles,
  Paperclip,
  Trash2,
  Cpu,
  Bot,
  User,
  PlusCircle,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  Zap,
  ChevronDown,
  ChevronRight,
  Code2,
  PenTool,
  Search,
  TrendingUp,
  Shield,
  Layers,
  Download,
  Copy,
  Check,
  Tag,
  Palette,
  GraduationCap,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelBadge?: string;
  intentBadge?: string;
  isFallback?: boolean;
  attachedFileNames?: string[];
  imageUrl?: string;
  isPriceAdjustment?: boolean;
  targetPrice?: string;
}

interface ModelItem {
  id: string;
  name: string;
  tag: string;
  desc: string;
  isPrime?: boolean;
  badge?: string;
}

function InteractivePriceCard({
  initialPrice = "12,99",
  productImageUrl,
}: {
  initialPrice?: string;
  productImageUrl?: string;
}) {
  const [price, setPrice] = useState(initialPrice);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 900;
    canvas.height = 900;

    const drawContent = (img?: HTMLImageElement) => {
      ctx.clearRect(0, 0, 900, 900);

      if (img) {
        ctx.fillStyle = "#0A0E1A";
        ctx.fillRect(0, 0, 900, 900);
        ctx.drawImage(img, 0, 0, 900, 900);
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 900, 900);
        bgGrad.addColorStop(0, "#080E1C");
        bgGrad.addColorStop(0.5, "#0D1B2A");
        bgGrad.addColorStop(1, "#040812");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 900, 900);

        ctx.strokeStyle = "rgba(6, 182, 212, 0.1)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 900; i += 45) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 900);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(900, i);
          ctx.stroke();
        }
      }

      // Top corner badge: PREÇO NOVO
      ctx.fillStyle = "#DC2626";
      ctx.beginPath();
      ctx.roundRect(40, 40, 240, 50, 12);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🔥 PREÇO NOVO", 160, 74);

      // Bottom banner overlay with glassmorphism gradient
      const banner = ctx.createLinearGradient(0, 580, 0, 900);
      banner.addColorStop(0, "rgba(10, 14, 26, 0.88)");
      banner.addColorStop(1, "rgba(5, 8, 16, 0.98)");
      ctx.fillStyle = banner;
      ctx.fillRect(0, 580, 900, 320);

      // Border line on top of banner
      ctx.strokeStyle = "rgba(34, 211, 238, 0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 580);
      ctx.lineTo(900, 580);
      ctx.stroke();

      // Mini category tag
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.roundRect(40, 605, 230, 36, 8);
      ctx.fill();
      ctx.fillStyle = "#020617";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VALOR AJUSTADO", 155, 630);

      // Label
      ctx.fillStyle = "#94A3B8";
      ctx.font = "18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("PREÇO PROMOCIONAL ATUALIZADO", 40, 675);

      // Big Price: R$ 12,99
      ctx.fillStyle = "#22D3EE";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("R$", 40, 750);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 86px sans-serif";
      ctx.fillText(price, 120, 765);

      // Conditions
      ctx.fillStyle = "#4ADE80";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("✓ À VISTA NO PIX OU CARTÃO • PRONTA ENTREGA", 40, 825);

      // Watermark
      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      ctx.font = "14px monospace";
      ctx.fillText("AUTORIZADO VIA ORVEXA PRIME DIGITAL", 40, 865);

      // Barcode simulation on right
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(640, 700, 220, 85);
      ctx.fillStyle = "#000000";
      let bx = 655;
      const bars = [4, 2, 5, 2, 6, 3, 2, 4, 3, 5, 2, 4, 6, 2, 4, 2, 5, 3, 4];
      for (const b of bars) {
        ctx.fillRect(bx, 712, b, 50);
        bx += b + 5;
      }
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("7891299002026", 750, 776);
    };

    if (productImageUrl) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => drawContent(img);
      img.onerror = () => drawContent();
      img.src = productImageUrl;
    } else {
      drawContent();
    }
  }, [price, productImageUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `etiqueta-preco-${price.replace(/[^0-9]/g, "") || "1299"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopy = () => {
    const text = `🔥 *OFERTA EXCLUSIVA ORVEXA PRIME!* 🔥\n\nGaranta agora mesmo por apenas *R$ ${price}*!\n\n💳 Condição: À vista no Pix ou Cartão\n📦 Disponível para pronta entrega!\n\n📲 Me chame no WhatsApp para garantir o seu antes que encerre o lote!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mt-4 p-4 rounded-2xl bg-[#080D1A] border border-cyan-500/40 shadow-neon-glow max-w-xl">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Arte & Etiqueta de Preço Gerada (R$ {price})
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
          ● Ajuste Concluído
        </span>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-auto max-h-72 object-contain" />
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap pl-1">Ajustar Preço: R$</span>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="flex-1 bg-slate-950 border border-cyan-500/40 rounded-lg px-2.5 py-1 text-sm font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
            placeholder="Ex: 12,99"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-neon-glow transition-all"
          >
            <Download className="w-4 h-4" />
            Baixar Imagem com Preço Atualizado (PNG)
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            {copied ? "Copiado!" : "Copiar Legenda Comercial"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const agentParam = searchParams.get("agent");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelPreference, setModelPreference] = useState("orvexa-prime");
  const [activeAgent, setActiveAgent] = useState<string | null>(agentParam || null);
  const [attachedFiles, setAttachedFiles] = useState<
    { name: string; size: string; content?: string; imageUrl?: string }[]
  >([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Dropdown States
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Catálogo Completo de Modelos de Elite
  const modelCategories: { group: string; models: ModelItem[] }[] = [
    {
      group: "ROTEADOR INTELIGENTE",
      models: [
        {
          id: "orvexa-prime",
          name: "ORVEXA PRIME",
          tag: "Auto-Router Semântico",
          desc: "Roteia automaticamente para a melhor IA conforme a intenção do seu comando.",
          isPrime: true,
          badge: "MOTOR AUTOMÁTICO",
        },
      ],
    },
    {
      group: "OPENAI / CODEX",
      models: [
        {
          id: "gpt-5.6-sol",
          name: "GPT-5.6 Sol (Codex)",
          tag: "Engenharia & Raciocínio",
          desc: "Modelo carro-chefe para código, arquitetura de software e matemática.",
          badge: "RECOMENDADO P/ DEV",
        },
        {
          id: "gpt-6-astra",
          name: "GPT-6 Astra",
          tag: "Next-Gen Multi-Agent",
          desc: "Arquitetura avançada de próxima geração com visão conceitual ampla.",
          badge: "NOVA GERAÇÃO",
        },
        {
          id: "gpt-5.6-terra",
          name: "GPT-5.6 Terra",
          tag: "Alta Eficiência & Escala",
          desc: "Execução veloz para operações com grande volume de dados.",
          badge: "ALTA VELOCIDADE",
        },
        {
          id: "gpt-5.6-luna",
          name: "GPT-5.6 Luna",
          tag: "Respostas Rápidas",
          desc: "Consultas instantâneas e chats cotidianos com baixo custo.",
          badge: "LEVE",
        },
        {
          id: "gpt-4o",
          name: "GPT-4o",
          tag: "Padrão Multimodal",
          desc: "Modelo clássico de alta qualidade para texto e visão.",
          badge: "MULTIMODAL",
        },
      ],
    },
    {
      group: "ANTHROPIC / FABLE & CLAUDE",
      models: [
        {
          id: "claude-fable-5.1",
          name: "Claude Fable 5.1",
          tag: "Storytelling & Criatividade",
          desc: "Capacidade incomparável de redação persuasiva, ficção e artigos.",
          badge: "FABLE 5.1",
        },
        {
          id: "claude-fable-5",
          name: "Claude Fable 5",
          tag: "Raciocínio Conceitual",
          desc: "Narrativas executivas e argumentações profundas.",
          badge: "FABLE 5",
        },
        {
          id: "claude-sonnet-5",
          name: "Claude Sonnet 5",
          tag: "Planilhas & Análise Corporativa",
          desc: "Especialista em Excel/CSV, finanças, tabelas e conciliação de dados.",
          badge: "ANÁLISE DE DADOS",
        },
        {
          id: "claude-opus-5",
          name: "Claude Opus 5",
          tag: "Pesquisa Profunda & Filosofia",
          desc: "Máxima densidade intelectual, papers científicos e estratégia.",
          badge: "OPUS 5",
        },
        {
          id: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
          tag: "Redação & Síntese",
          desc: "Referência em clareza textual e síntese executiva.",
          badge: "SONNET 3.5",
        },
      ],
    },
    {
      group: "GOOGLE AI",
      models: [
        {
          id: "gemini-3.8",
          name: "Gemini 3.8 Ultra",
          tag: "Raciocínio Quântico & Multimodal 2M+",
          desc: "Modelo flagship de última geração do Google para raciocínio complexo, análise de documentos e imagens.",
          badge: "GEMINI 3.8",
        },
        {
          id: "gemini-3.8-pro",
          name: "Gemini 3.8 Pro",
          tag: "Velocidade & Precisão Cognitiva",
          desc: "Processamento veloz com enorme janela de contexto para grandes bases de conhecimento.",
          badge: "GEMINI 3.8 PRO",
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          tag: "Contexto Extenso (1M+)",
          desc: "Análise profunda com gigantesca janela de contexto multimodal.",
          badge: "GOOGLE",
        },
      ],
    },
  ];

  const allModelsFlat = modelCategories.flatMap((g) => g.models);
  const activeModelObj = allModelsFlat.find((m) => m.id === modelPreference) || allModelsFlat[0];

  // Suíte Completa de Agentes Especialistas
  const agentsList = [
    {
      id: "orvexa-quantum",
      name: "ORVEXA QUANTUM",
      modelId: "gemini-3.8",
      modelName: "Gemini 3.8 Ultra",
      role: "Multimodal & Big Data Cognitivo",
      desc: "Análise quântica de grandes documentos, dados multimodais e visão computacional.",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40",
      icon: Layers,
    },
    {
      id: "orvexa-dev",
      name: "ORVEXA DEV",
      modelId: "gpt-5.6-sol",
      modelName: "GPT-5.6 Sol (Codex)",
      role: "Engenharia de Software & Código",
      desc: "Arquitetura limpa, algoritmos, depuração e refatoração de código.",
      color: "text-cyan-400 border-cyan-500/30 bg-cyan-950/40",
      icon: Code2,
    },
    {
      id: "orvexa-design",
      name: "ORVEXA DESIGN",
      modelId: "claude-sonnet-5",
      modelName: "Claude Sonnet 5",
      role: "UI/UX & Design Systems",
      desc: "Paletas harmônicas, componentes modernos e conformidade de contraste WCAG AAA.",
      color: "text-purple-400 border-purple-500/30 bg-purple-950/40",
      icon: Palette,
    },
    {
      id: "orvexa-estudos",
      name: "ORVEXA ESTUDOS",
      modelId: "gemini-3.8",
      modelName: "Gemini 3.8 Ultra",
      role: "Síntese Didática & Feynman",
      desc: "Aprendizado acelerado, repetição espaçada e método Feynman para temas complexos.",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40",
      icon: GraduationCap,
    },
    {
      id: "orvexa-fable",
      name: "ORVEXA FABLE",
      modelId: "claude-fable-5.1",
      modelName: "Claude Fable 5.1",
      role: "Storytelling, Copy & Narrativas",
      desc: "Copywriting de alta conversão, roteiros hipnóticos e artigos densos.",
      color: "text-purple-400 border-purple-500/30 bg-purple-950/40",
      icon: PenTool,
    },
    {
      id: "orvexa-astra",
      name: "ORVEXA ASTRA",
      modelId: "gpt-6-astra",
      modelName: "GPT-6 Astra",
      role: "Estratégia C-Level & Inovação",
      desc: "Visão futurista, disrupção digital e planos estratégicos corporativos.",
      color: "text-amber-400 border-amber-500/30 bg-amber-950/40",
      icon: Sparkles,
    },
    {
      id: "orvexa-research",
      name: "ORVEXA RESEARCH",
      modelId: "claude-opus-5",
      modelName: "Claude Opus 5",
      role: "Pesquisa Profunda & Metodologia",
      desc: "Investigações acadêmicas minuciosas e revisão de literatura científica.",
      color: "text-blue-400 border-blue-500/30 bg-blue-950/40",
      icon: Search,
    },
    {
      id: "orvexa-marketing",
      name: "ORVEXA MARKETING",
      modelId: "claude-sonnet-5",
      modelName: "Claude Sonnet 5",
      role: "Growth & Campanhas de Escala",
      desc: "Métricas CAC/LTV, funis de tração e campanhas de escala de tráfego.",
      color: "text-pink-400 border-pink-500/30 bg-pink-950/40",
      icon: TrendingUp,
    },
    {
      id: "orvexa-juridico",
      name: "ORVEXA JURÍDICO",
      modelId: "claude-sonnet-5",
      modelName: "Claude Sonnet 5",
      role: "Compliance, LGPD & Contratos",
      desc: "Análise contratual minuciosa, termos de serviço e auditoria jurídica.",
      color: "text-yellow-400 border-yellow-500/30 bg-yellow-950/40",
      icon: Shield,
    },
  ];

  const activeAgentObj = agentsList.find((a) => a.id === activeAgent);

  useEffect(() => {
    // Initial greeting message
    const initialGreeting: ChatMessage = {
      id: "initial-0",
      role: "assistant",
      content: activeAgentObj
        ? `Olá! Sou o **${activeAgentObj.name}** (equipado com **${activeAgentObj.modelName}**). ${activeAgentObj.desc} Como posso acelerar seus projetos corporativos hoje?`
        : `Olá! Bem-vindo ao Chat Corporativo da **ORVEXA PRIME DIGITAL**. Todas as minhas respostas são processadas com criptografia ponta a ponta via **AI Gateway**. Selecione qualquer IA de ponta (como **GPT-5.6 Sol**, **Claude Fable 5.1**, **GPT-6 Astra**) ou use o **ORVEXA PRIME ENGINE**!`,
      modelBadge: activeAgentObj ? activeAgentObj.modelName : activeModelObj.name,
      intentBadge: "AI GATEWAY READY",
    };
    setMessages([initialGreeting]);
  }, [activeAgent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    for (const file of fileList) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let extractedContent = "";

      if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp" || ext === "gif") {
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setAttachedFiles((prev) => [
              ...prev,
              {
                name: file.name,
                size: `${(file.size / 1024).toFixed(1)} KB`,
                content: `[Imagem comercial anexada: ${file.name} - Tamanho: ${(file.size / 1024).toFixed(1)} KB]`,
                imageUrl: dataUrl,
              },
            ]);
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(file);
        });
        continue;
      } else if (ext === "xlsx" || ext === "xls") {
        try {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array" });
          let sheetData = "";
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            if (csv && csv.trim()) {
              sheetData += `\n--- PLANILHA: ${sheetName} ---\n${csv.trim().slice(0, 35000)}\n`;
            }
          }
          extractedContent = sheetData;
        } catch (err: any) {
          console.error("Erro ao ler planilha:", err);
          extractedContent = `[Erro na leitura da planilha: ${err.message}]`;
        }
      } else if (
        ext === "csv" ||
        ext === "txt" ||
        ext === "json" ||
        ext === "md" ||
        ext === "xml" ||
        ext === "log"
      ) {
        try {
          const text = await file.text();
          extractedContent = text.slice(0, 35000);
        } catch (err: any) {
          console.error("Erro ao ler arquivo texto:", err);
        }
      } else {
        extractedContent = `[Arquivo binário anexado: ${file.name} - Tamanho: ${(file.size / 1024).toFixed(1)} KB]`;
      }

      setAttachedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          content: extractedContent,
        },
      ]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || loading) return;

    setErrorBanner(null);

    let promptText = input.trim();
    const currentFiles = [...attachedFiles];
    const fileNames = currentFiles.map((f) => f.name);

    // Recupera a imagem atual ou de mensagens anteriores no histórico
    const firstImg = currentFiles.find((f) => f.imageUrl);
    const prevImageMsg = [...messages].reverse().find((m) => m.imageUrl);
    const activeImageUrl = firstImg?.imageUrl || prevImageMsg?.imageUrl;

    const fullNormalized = `${promptText} ${input}`.toLowerCase();
    const hasPriceTrigger =
      fullNormalized.includes("12, 99") ||
      fullNormalized.includes("12,99") ||
      fullNormalized.includes("12.99") ||
      fullNormalized.includes("preço") ||
      fullNormalized.includes("preco") ||
      fullNormalized.includes("etiqueta") ||
      fullNormalized.includes("alterar") ||
      fullNormalized.includes("imagem é minha");

    let detectedPrice = "12,99";
    const priceMatch = promptText.match(/\b\d+([.,]\d{2})\b/) || input.match(/\b\d+([.,]\d{2})\b/);
    if (priceMatch) {
      detectedPrice = priceMatch[0].replace(".", ",");
    }

    if (currentFiles.length > 0) {
      const filesExtracted = currentFiles
        .map((f) => {
          if (f.content) {
            return `### DOCUMENTO / IMAGEM ANEXADA: ${f.name} (${f.size})\n\`\`\`\n${f.content}\n\`\`\``;
          }
          return `[Arquivo Anexado: ${f.name} (${f.size})]`;
        })
        .join("\n\n");

      promptText = `${filesExtracted}\n\n[INSTRUÇÃO DO USUÁRIO]:\n${promptText || "Por favor, analise minuciosamente os dados contidos neste documento/imagem. Se for um pedido de ajuste de preço, realize o ajuste imediatamente com padrão comercial de excelência."}`;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim() || (currentFiles.length > 0 ? "Analise detalhadamente o documento anexado acima." : ""),
      attachedFileNames: fileNames.length > 0 ? fileNames : undefined,
      imageUrl: activeImageUrl,
      isPriceAdjustment: hasPriceTrigger,
      targetPrice: detectedPrice,
    };

    const outgoingApiMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: promptText },
    ];

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setAttachedFiles([]);
    setLoading(true);

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      modelBadge: "Processando AI Gateway...",
      imageUrl: activeImageUrl,
      isPriceAdjustment: hasPriceTrigger,
      targetPrice: detectedPrice,
    };
    setMessages((prev) => [...prev, initialAssistantMsg]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: outgoingApiMessages,
          conversationId,
          modelPreference,
          agentId: activeAgent,
          hasFiles: currentFiles.length > 0,
        }),
      });

      if (!response.ok) {
        setConversationId(null);
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro HTTP ${response.status}`);
      }

      // Lê headers customizados do Gateway
      const resolvedModel = response.headers.get("x-orvexa-model") || "ORVEXA AI";
      const resolvedIntent = response.headers.get("x-orvexa-intent") || "GERAL";
      const isFallback = response.headers.get("x-orvexa-key-status") === "fallback";
      const returnedConvId = response.headers.get("x-orvexa-conversation-id");
      if (returnedConvId) setConversationId(returnedConvId);

      // Leitura de Streaming SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          streamedText += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: streamedText,
                    modelBadge: resolvedModel,
                    intentBadge: resolvedIntent,
                    isFallback,
                    imageUrl: activeImageUrl,
                    isPriceAdjustment: hasPriceTrigger,
                    targetPrice: detectedPrice,
                  }
                : m
            )
          );
        }
      }
    } catch (err: any) {
      console.error("Erro no chat:", err);
      setErrorBanner(err.message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `⚠️ Não foi possível obter resposta: ${err.message}`,
                modelBadge: "Falha de Conexão",
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#080C14] rounded-2xl border border-cyan-500/20 overflow-hidden relative shadow-2xl">
      {/* Top Bar: Seletores de Modelo de Elite e Agentes Especialistas */}
      <div className="bg-[#0D1322] border-b border-cyan-500/20 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shrink-0 relative z-30">
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor Dropdown de Modelo de Elite */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setModelDropdownOpen(!modelDropdownOpen);
                setAgentDropdownOpen(false);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                activeModelObj.isPrime
                  ? "bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : "bg-slate-900 text-white border-slate-700 hover:border-cyan-500/40"
              }`}
            >
              {activeModelObj.isPrime ? (
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
              ) : activeModelObj.id.includes("claude") ? (
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              ) : activeModelObj.id.includes("gpt") ? (
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Layers className="w-3.5 h-3.5 text-blue-400" />
              )}
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[9px] text-slate-400 font-mono">IA ATIVA</span>
                <span className="text-xs font-bold text-white">{activeModelObj.name}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 ml-1 transition-transform ${
                  modelDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Menu Dropdown de Modelos */}
            {modelDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 max-h-[75vh] overflow-y-auto rounded-2xl bg-[#0B101B] border border-cyan-500/30 shadow-2xl p-2.5 z-50 divide-y divide-slate-800/60 backdrop-blur-xl">
                {modelCategories.map((cat, idx) => (
                  <div key={idx} className="py-2 first:pt-0 last:pb-0">
                    <span className="px-2 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase block mb-1.5">
                      {cat.group}
                    </span>
                    <div className="space-y-1">
                      {cat.models.map((mod) => (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => {
                            setModelPreference(mod.id);
                            setModelDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2 rounded-xl transition-all flex items-start justify-between gap-2 ${
                            modelPreference === mod.id
                              ? "bg-cyan-950/70 border border-cyan-500/40 text-white"
                              : "hover:bg-slate-900/80 text-slate-300 hover:text-white"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">{mod.name}</span>
                              {mod.badge && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                    mod.isPrime
                                      ? "bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-black"
                                      : "bg-slate-800 text-cyan-300 border border-cyan-500/20"
                                  }`}
                                >
                                  {mod.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{mod.desc}</p>
                          </div>
                          {modelPreference === mod.id && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-1" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botão Dropdown de Agentes Especialistas */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setAgentDropdownOpen(!agentDropdownOpen);
                setModelDropdownOpen(false);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                activeAgent
                  ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:border-emerald-500/40"
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[9px] text-slate-400 font-mono">AGENTE</span>
                <span className="text-xs font-bold">
                  {activeAgentObj ? activeAgentObj.name : "Agentes Especialistas"}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 ml-1 transition-transform ${
                  agentDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Menu Dropdown de Agentes */}
            {agentDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 max-h-[75vh] overflow-y-auto rounded-2xl bg-[#0B101B] border border-emerald-500/30 shadow-2xl p-2.5 z-50 space-y-1.5 backdrop-blur-xl">
                <div className="px-2 pb-1 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono uppercase font-bold text-emerald-400">
                    {agentsList.length} Agentes Especialistas Prontos
                  </span>
                  {activeAgent && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAgent(null);
                        setAgentDropdownOpen(false);
                      }}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Remover Agente
                    </button>
                  )}
                </div>
                {agentsList.map((ag) => {
                  const IconComp = ag.icon;
                  const isSelected = activeAgent === ag.id;
                  return (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() => {
                        setActiveAgent(ag.id);
                        setModelPreference(ag.modelId);
                        setAgentDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "bg-emerald-950/60 border border-emerald-500/40 text-white"
                          : "hover:bg-slate-900/80 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${ag.color}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{ag.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {ag.modelName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{ag.desc}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tag de Agente Ativo com botão de remoção */}
          {activeAgentObj && (
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <span>{activeAgentObj.name}</span>
              <button
                type="button"
                onClick={() => setActiveAgent(null)}
                className="hover:text-red-400 font-bold ml-1 text-sm leading-none"
                title="Desativar especialista"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Botão Nova Conversa */}
        <button
          type="button"
          onClick={() => {
            setConversationId(null);
            setMessages([
              {
                id: `reset-${Date.now()}`,
                role: "assistant",
                content: `Nova conversa iniciada. Modelo ativo: **${activeModelObj.name}**${
                  activeAgentObj ? ` com o agente **${activeAgentObj.name}**` : ""
                }. Envie sua pergunta ou selecione outro modelo/agente!`,
                modelBadge: activeAgentObj ? activeAgentObj.modelName : activeModelObj.name,
              },
            ]);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Nova Conversa</span>
        </button>
      </div>

      {errorBanner && (
        <div className="p-3 bg-red-950/80 border-b border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-cyan-500/30 shrink-0 mt-1 shadow-neon-cyan">
                <Image src="/logo.jpg" alt="ORVEXA AI" fill className="object-cover" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-cyan-600/30 to-blue-700/30 border border-cyan-500/30 text-white rounded-br-none shadow-md"
                  : "bg-[#0D1322] border border-slate-800 text-slate-200 rounded-bl-none shadow-lg"
              }`}
            >
              {/* Badges de Diagnóstico do Gateway */}
              {msg.role === "assistant" && (msg.modelBadge || msg.intentBadge) && (
                <div className="flex flex-wrap items-center gap-2 mb-3 pb-2 border-b border-slate-800/80 text-[10px] font-mono">
                  {msg.modelBadge && (
                    <span className="px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-cyan-400" />
                      {msg.modelBadge}
                    </span>
                  )}
                  {msg.intentBadge && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-500/20">
                      Intenção: {msg.intentBadge}
                    </span>
                  )}
                  {msg.isFallback !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                        msg.isFallback
                          ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                          : "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                      }`}
                    >
                      {msg.isFallback ? "Modo Contingência (Sem Chave Oficial Ativa)" : "● API Conectada ao Vivo"}
                    </span>
                  )}
                </div>
              )}

              {/* Preview da Imagem Anexada pelo Usuário */}
              {msg.role === "user" && msg.imageUrl && (
                <div className="mb-3 rounded-xl overflow-hidden border border-cyan-500/30 max-w-xs shadow-md bg-slate-900">
                  <img src={msg.imageUrl} alt="Imagem original enviada" className="w-full h-auto object-cover max-h-52" />
                  <div className="px-2.5 py-1 bg-slate-950/90 text-[10px] text-cyan-300 font-mono flex items-center justify-between border-t border-slate-800">
                    <span>Imagem original do produto</span>
                  </div>
                </div>
              )}

              {/* Badges de Arquivos Anexados pelo Usuário */}
              {msg.role === "user" && msg.attachedFileNames && msg.attachedFileNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5 pb-2 border-b border-cyan-500/20">
                  {msg.attachedFileNames.map((fileName, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-400/40 text-[11px] font-mono text-cyan-200"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      {fileName}
                    </span>
                  ))}
                </div>
              )}

              {/* Mensagem Formatada com Suporte a Imagens Geradas */}
              <div className="whitespace-pre-wrap font-sans break-words space-y-3">
                {msg.content ? (
                  msg.content.split(/(!\[.*?\]\(https?:\/\/.*?\))/g).map((part, pIdx) => {
                    const imgMatch = part.match(/!\[(.*?)\]\((https?:\/\/.*?)\)/);
                    if (imgMatch) {
                      const [, alt, src] = imgMatch;
                      return (
                        <div key={pIdx} className="my-3 rounded-2xl overflow-hidden border border-cyan-500/40 shadow-neon-glow max-w-md bg-slate-950">
                          <img src={src} alt={alt || "Imagem Gerada"} className="w-full h-auto object-cover max-h-96" />
                          <div className="p-2.5 bg-slate-950 text-[11px] text-cyan-300 font-medium flex items-center justify-between border-t border-slate-800">
                            <span>🎨 {alt || "Imagem Gerada por IA"}</span>
                            <a href={src} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 font-bold underline">
                              Abrir em Alta Resolução ↗
                            </a>
                          </div>
                        </div>
                      );
                    }
                    return <span key={pIdx}>{part}</span>;
                  })
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-cyan-400 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                    Gerando resposta via AI Gateway...
                  </span>
                )}
              </div>

              {/* Arte Promocional e Etiqueta Interativa com Preço Atualizado */}
              {msg.role === "assistant" && (msg.isPriceAdjustment || msg.content.includes("12,99") || msg.content.includes("12, 99") || msg.content.includes("12.99")) && (
                <InteractivePriceCard
                  initialPrice={msg.targetPrice || "12,99"}
                  productImageUrl={msg.imageUrl}
                />
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box & Files */}
      <div className="p-3 sm:p-4 bg-[#0D1322] border-t border-cyan-500/20 shrink-0">
        {/* Chips de Arquivos Anexados */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2.5">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 text-xs text-cyan-300"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="font-mono">{file.name}</span>
                <span className="text-[10px] text-slate-500">({file.size})</span>
                <button
                  onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="hover:text-red-400 font-bold ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          {/* Botão de Upload de Arquivos */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Anexar arquivos (PDF, DOCX, XLSX, Imagens)"
            className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-all shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Textarea */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeAgentObj
                ? `Pergunte ao ${activeAgentObj.name}... (Enter para enviar)`
                : "Digite seu comando para o ORVEXA PRIME... (Shift+Enter para quebra de linha)"
            }
            rows={1}
            className="flex-1 max-h-32 min-h-[44px] py-2.5 px-4 bg-slate-900/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 resize-none transition-all"
          />

          {/* Botão Enviar */}
          <button
            type="submit"
            disabled={(!input.trim() && attachedFiles.length === 0) || loading}
            className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold shadow-neon-glow transition-all disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center text-xs text-cyan-400">Carregando Chat ORVEXA...</div>}>
      <ChatContent />
    </Suspense>
  );
}

