"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight, RotateCcw, Volume2, VolumeX, Shield, Play } from "lucide-react";

// Ícone Oficial Stylized Anthropic Claude
function ClaudeIcon({ className = "w-6 h-6", glow = false }: { className?: string; glow?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={`${className} ${glow ? "drop-shadow-[0_0_14px_rgba(245,158,11,0.85)]" : ""}`}
    >
      <defs>
        <linearGradient id="claudeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <g fill="url(#claudeGrad)">
        <rect x="43" y="10" width="14" height="80" rx="7" />
        <rect x="43" y="10" width="14" height="80" rx="7" transform="rotate(90 50 50)" />
        <rect x="43" y="10" width="14" height="80" rx="7" transform="rotate(45 50 50)" />
        <rect x="43" y="10" width="14" height="80" rx="7" transform="rotate(135 50 50)" />
      </g>
    </svg>
  );
}

// Ícone Oficial OpenAI GPT-4o
function OpenAIIcon({ className = "w-6 h-6", glow = false }: { className?: string; glow?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} ${glow ? "drop-shadow-[0_0_14px_rgba(6,182,212,0.85)]" : ""}`}
    >
      <defs>
        <linearGradient id="openaiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <path
        d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1685a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4022-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.407 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813v6.7227zm1.145-2.0728l2.5485-1.4678 2.5485 1.4678v2.9356l-2.5485 1.4678-2.5485-1.4678z"
        fill="url(#openaiGrad)"
      />
    </svg>
  );
}

interface CinematicLoadingProps {
  onComplete?: () => void;
  autoRedirectUrl?: string;
  autoRedirectDelayMs?: number;
  showNavigationControls?: boolean;
  defaultVisualMode?: "cinematic" | "subtle";
}

export function CinematicLoading({
  onComplete,
  autoRedirectUrl = "/dashboard/chat",
  autoRedirectDelayMs = 2000,
  showNavigationControls = true,
  defaultVisualMode = "cinematic",
}: CinematicLoadingProps) {
  // Cenas: 1 (Origem), 2 (Claude), 3 (GPT), 4 (Fusão), 5 (Logo ORVEXA), 6 (Manifesto & Final)
  const [scene, setScene] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  // Opção A: Símbolos discretos | Opção B: Símbolos cinematográficos com auréolas (Recomendada)
  const [visualMode, setVisualMode] = useState<"cinematic" | "subtle">(defaultVisualMode);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Inicializa o som ambiente futurista opcional (Web Audio API nativo, sem arquivos externos)
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  const playSynthesizedTone = (freq: number, type: OscillatorType, duration: number, gainValue = 0.05) => {
    if (!soundEnabled || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  // Linha do tempo das 6 cenas
  useEffect(() => {
    // Cena 1 -> Cena 2: Claude entra aos 2.8s
    const t1 = setTimeout(() => {
      setScene(2);
      playSynthesizedTone(220, "sine", 2.0, 0.04);
    }, 2800);

    // Cena 2 -> Cena 3: GPT entra aos 5.4s
    const t2 = setTimeout(() => {
      setScene(3);
      playSynthesizedTone(330, "sine", 2.0, 0.04);
    }, 5400);

    // Cena 3 -> Cena 4: Fusão central aos 8.0s
    const t3 = setTimeout(() => {
      setScene(4);
      playSynthesizedTone(440, "triangle", 3.0, 0.08);
      setTimeout(() => playSynthesizedTone(880, "sine", 1.5, 0.05), 300);
    }, 8000);

    // Cena 4 -> Cena 5: Logo ORVEXA aos 10.5s
    const t4 = setTimeout(() => {
      setScene(5);
      playSynthesizedTone(523.25, "sine", 2.5, 0.06); // C5
    }, 10500);

    // Cena 5 -> Cena 6: Manifesto final aos 13.0s
    const t5 = setTimeout(() => {
      setScene(6);
      setCompleted(true);
      playSynthesizedTone(659.25, "sine", 3.0, 0.05); // E5
      if (onComplete) onComplete();
    }, 13000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  // Motor de renderização gráfica em Canvas (Partículas & Ondas de Energia)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Estrutura de partículas
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
      life: number;
      maxLife: number;
      type: "ambient" | "claude" | "gpt" | "fusion" | "logo";
    }

    const particles: Particle[] = [];

    // Gerador de partículas ambientais (Cena 1)
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        color: "#00D2FF",
        life: 0,
        maxLife: 1000,
        type: "ambient",
      });
    }

    let time = 0;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // -------------------------------------------------------------
      // CENA 2: Efluxo de Energia Claude (Laranja / Âmbar pela Esquerda)
      // -------------------------------------------------------------
      if (scene >= 2 && scene <= 4) {
        const streamProgress = Math.min(1, (scene === 2 ? (time - 2.8) / 2.6 : 1));
        const headX = (scene === 4 ? centerX : width * 0.1 + (centerX - width * 0.1) * streamProgress);
        const headY = centerY + Math.sin(time * 3) * 35;

        // Adiciona partículas douradas de fogo tecnológico
        if (particles.length < 350) {
          for (let i = 0; i < 4; i++) {
            particles.push({
              x: width * 0.05 + Math.random() * 30,
              y: headY + (Math.random() - 0.5) * 60,
              vx: Math.random() * 4 + 3,
              vy: (Math.random() - 0.5) * 2,
              size: Math.random() * 3 + 1,
              alpha: Math.random() * 0.8 + 0.2,
              color: Math.random() > 0.4 ? "#F59E0B" : "#EA580C",
              life: 0,
              maxLife: 80,
              type: "claude",
            });
          }
        }

        // Desenha rastro de energia fluida dourada
        const grad = ctx.createLinearGradient(0, centerY, headX, headY);
        grad.addColorStop(0, "rgba(245, 158, 11, 0.05)");
        grad.addColorStop(0.5, "rgba(245, 158, 11, 0.35)");
        grad.addColorStop(1, "rgba(251, 191, 36, 0.85)");

        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.bezierCurveTo(headX * 0.4, centerY - 60, headX * 0.7, headY + 60, headX, headY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 6;
        ctx.shadowColor = "#F59E0B";
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // -------------------------------------------------------------
      // CENA 3: Efluxo de Energia GPT (Verde / Turquesa pela Direita)
      // -------------------------------------------------------------
      if (scene >= 3 && scene <= 4) {
        const streamProgress = Math.min(1, (scene === 3 ? (time - 5.4) / 2.6 : 1));
        const headX = (scene === 4 ? centerX : width * 0.9 - (width * 0.9 - centerX) * streamProgress);
        const headY = centerY + Math.cos(time * 3.5) * 35;

        // Adiciona partículas digitais turquesa
        if (particles.length < 500) {
          for (let i = 0; i < 4; i++) {
            particles.push({
              x: width * 0.95 - Math.random() * 30,
              y: headY + (Math.random() - 0.5) * 60,
              vx: -(Math.random() * 4 + 3),
              vy: (Math.random() - 0.5) * 2,
              size: Math.random() * 3 + 1,
              alpha: Math.random() * 0.8 + 0.2,
              color: Math.random() > 0.4 ? "#06B6D4" : "#10B981",
              life: 0,
              maxLife: 80,
              type: "gpt",
            });
          }
        }

        // Desenha rastro de circuito digital turquesa
        const grad = ctx.createLinearGradient(width, centerY, headX, headY);
        grad.addColorStop(0, "rgba(6, 182, 212, 0.05)");
        grad.addColorStop(0.5, "rgba(6, 182, 212, 0.35)");
        grad.addColorStop(1, "rgba(0, 245, 212, 0.85)");

        ctx.beginPath();
        ctx.moveTo(width, centerY);
        ctx.bezierCurveTo(width - (width - headX) * 0.4, centerY + 60, width - (width - headX) * 0.7, headY - 60, headX, headY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 6;
        ctx.shadowColor = "#06B6D4";
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // -------------------------------------------------------------
      // CENA 4: Fusão Central & Ondas de Choque
      // -------------------------------------------------------------
      if (scene === 4) {
        // Ondas de choque radiais
        const waveRadius = ((time * 70) % 220) + 20;
        const waveAlpha = Math.max(0, 1 - waveRadius / 240);

        ctx.beginPath();
        ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 210, 255, ${waveAlpha * 0.7})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, waveRadius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 158, 11, ${waveAlpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Explosão de faíscas da fusão
        if (particles.length < 650) {
          for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            particles.push({
              x: centerX,
              y: centerY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * 3 + 1,
              alpha: 1,
              color: Math.random() > 0.5 ? "#FFFFFF" : Math.random() > 0.5 ? "#00D2FF" : "#F59E0B",
              life: 0,
              maxLife: 60,
              type: "fusion",
            });
          }
        }
      }

      // -------------------------------------------------------------
      // CENA 5 & 6: Vórtice Suave e Aura da Logo ORVEXA
      // -------------------------------------------------------------
      if (scene >= 5) {
        const haloRadius = 130 + Math.sin(time * 2) * 8;
        const haloGrad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, haloRadius);
        haloGrad.addColorStop(0, "rgba(0, 210, 255, 0.2)");
        haloGrad.addColorStop(0.6, "rgba(245, 158, 11, 0.12)");
        haloGrad.addColorStop(1, "rgba(7, 11, 20, 0)");

        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, haloRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Atualiza e renderiza todas as partículas
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Atração magnética para o centro na Cena 4
        if (scene === 4 && (p.type === "claude" || p.type === "gpt")) {
          p.vx += (centerX - p.x) * 0.02;
          p.vy += (centerY - p.y) * 0.02;
        }

        // Desenho
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (1 - p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Remoção
        if (p.life >= p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          if (p.type === "ambient") {
            p.x = Math.random() * width;
            p.y = Math.random() * height;
            p.life = 0;
          } else {
            particles.splice(i, 1);
          }
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [scene]);

  // Função para reiniciar a animação
  const handleReplay = () => {
    setScene(1);
    setCompleted(false);
  };

  // Função para pular animação
  const handleSkip = () => {
    if (onComplete) {
      onComplete();
      return;
    }
    setScene(6);
    setCompleted(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#050811] text-white flex flex-col justify-between select-none">
      {/* Canvas de Alta Resolução */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Gradientes de Profundidade */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#050811]/60 to-[#03050C] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(12,74,110,0.15),transparent_70%)] pointer-events-none" />

      {/* Top Bar: Selo Institucional e Controles */}
      <header className="relative z-20 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-cyan-500/40 shadow-neon-cyan relative">
            <Image src="/logo.jpg" alt="ORVEXA Logo" fill className="object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold tracking-widest text-cyan-400">ORVEXA PRIME</span>
            <span className="text-[10px] text-slate-400 tracking-wider">PLATAFORMA MULTI-IA</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de Opções Visuais A / B */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-sans">
            <button
              onClick={() => setVisualMode("subtle")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                visualMode === "subtle"
                  ? "bg-slate-800 text-amber-300 font-semibold shadow-inner"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Opção A: Símbolos menores e discretos"
            >
              Opção A
            </button>
            <button
              onClick={() => setVisualMode("cinematic")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                visualMode === "cinematic"
                  ? "bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-emerald-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Opção B: Símbolos mais visíveis e cinematográficos (Recomendada)"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Opção B</span>
            </button>
          </div>

          {/* Controle de Som */}
          <button
            onClick={() => {
              initAudio();
              setSoundEnabled(!soundEnabled);
            }}
            className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-all text-xs flex items-center gap-1.5"
            title={soundEnabled ? "Desativar áudio ambiente" : "Ativar áudio ambiente"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline text-[11px] font-mono">{soundEnabled ? "Áudio Ativo" : "Som Mudo"}</span>
          </button>

          {/* Pular Introdução */}
          {!completed && (
            <button
              onClick={handleSkip}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
            >
              Pular Introdução
            </button>
          )}
        </div>
      </header>

      {/* ÁREA CENTRAL: O PALCO DAS 6 CENAS */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-4 w-full max-w-5xl mx-auto">
        {/* CENA 1: ORIGEM */}
        {scene === 1 && (
          <div className="space-y-4 animate-in fade-in duration-1000">
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border border-cyan-500/20 p-2 shadow-2xl relative">
              <div className="w-full h-full rounded-full overflow-hidden relative">
                <Image src="/logo.jpg" alt="ORVEXA Prime" fill className="object-cover opacity-80" />
              </div>
            </div>
            <div className="font-mono text-xs uppercase tracking-widest text-cyan-400/80 animate-pulse">
              Iniciando Protocolo de Fusão Neural...
            </div>
          </div>
        )}

        {/* CENAS 2, 3 e 4: AS INTELIGÊNCIAS SEPARADAS E DEPOIS CONVERGINDO */}
        {scene >= 2 && scene <= 4 && (
          <div className="relative w-full flex items-center justify-center min-h-[320px]">
            {/* CLAUDE (Anthropic) - Laranja/Dourado */}
            <div
              className={`absolute transition-all duration-1000 ease-in-out flex flex-col items-center text-center z-20 ${
                scene === 2
                  ? "-translate-x-24 sm:-translate-x-44 md:-translate-x-64 opacity-100 scale-100"
                  : scene === 3
                  ? "-translate-x-24 sm:-translate-x-44 md:-translate-x-64 opacity-100 scale-100"
                  : "translate-x-0 opacity-70 scale-90" // Cena 4: converge para o centro
              }`}
            >
              {visualMode === "cinematic" ? (
                /* OPÇÃO B: Cinematográfica, volumétrica e impactante */
                <div className="relative flex flex-col items-center space-y-3">
                  {/* Auréola & Plasma Dourado */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 via-orange-500/20 to-amber-600/30 rounded-full blur-xl animate-pulse pointer-events-none" />

                  {/* Orbe Estelar Claude */}
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl p-0.5 bg-gradient-to-tr from-amber-500 via-orange-400 to-amber-200 shadow-[0_0_35px_rgba(245,158,11,0.5)] flex items-center justify-center">
                    <div className="w-full h-full rounded-[22px] bg-[#0E0B07]/90 backdrop-blur-xl border border-amber-400/40 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-1 rounded-2xl border border-amber-400/20 border-dashed animate-spin [animation-duration:12s]" />
                      <ClaudeIcon className="w-10 h-10 md:w-12 md:h-12 text-amber-400" glow />
                    </div>
                  </div>

                  {/* Identificação Tipográfica */}
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 font-mono text-[10px] tracking-wider uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      Anthropic
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-amber-100 tracking-tight">
                      Claude 3.5 Sonnet
                    </h3>
                    <p className="text-[11px] text-amber-200/70 font-sans max-w-[180px]">
                      Inteligência &amp; Síntese Profunda
                    </p>
                  </div>
                </div>
              ) : (
                /* OPÇÃO A: Símbolo menor e discreto */
                <div className="flex flex-col items-center space-y-2 p-3 rounded-2xl bg-slate-900/80 border border-amber-500/30 shadow-lg backdrop-blur-md">
                  <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <ClaudeIcon className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-300 font-mono">Claude 3.5</div>
                    <div className="text-[10px] text-slate-400">Anthropic</div>
                  </div>
                </div>
              )}
            </div>

            {/* CENTRO: Conector de Convergência & Anel de Plasma */}
            {scene === 4 ? (
              <div className="relative z-30 flex flex-col items-center space-y-3 animate-in zoom-in-50 duration-700">
                <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400 animate-spin [animation-duration:3s]" />
                  <div className="absolute inset-1 rounded-full border-2 border-amber-400 animate-spin [animation-duration:2s] [animation-direction:reverse]" />
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500/50 via-white/70 to-cyan-400/50 blur-lg animate-pulse" />
                  <Sparkles className="w-10 h-10 text-white relative z-10 animate-bounce" />
                </div>
                <div className="font-mono text-xs font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-cyan-300 drop-shadow">
                  Fusão Central: Claude + GPT Convergindo...
                </div>
              </div>
            ) : scene === 3 ? (
              /* Indicador de Tensão Central durante a Cena 3 */
              <div className="hidden sm:flex flex-col items-center space-y-2 animate-in fade-in duration-700 z-10">
                <div className="flex items-center gap-3 text-slate-500 text-xs font-mono">
                  <span className="w-12 h-px bg-gradient-to-r from-amber-500/60 to-transparent" />
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-[10px] uppercase tracking-widest">
                    Convergência em Andamento
                  </span>
                  <span className="w-12 h-px bg-gradient-to-l from-cyan-500/60 to-transparent" />
                </div>
              </div>
            ) : null}

            {/* GPT (OpenAI) - Verde/Turquesa */}
            <div
              className={`absolute transition-all duration-1000 ease-in-out flex flex-col items-center text-center z-20 ${
                scene === 2
                  ? "translate-x-32 opacity-0 pointer-events-none" // Na cena 2 ainda não entrou
                  : scene === 3
                  ? "translate-x-24 sm:translate-x-44 md:translate-x-64 opacity-100 scale-100 animate-in slide-in-from-right duration-700"
                  : "translate-x-0 opacity-70 scale-90" // Cena 4: converge para o centro
              }`}
            >
              {visualMode === "cinematic" ? (
                /* OPÇÃO B: Cinematográfica, volumétrica e impactante */
                <div className="relative flex flex-col items-center space-y-3">
                  {/* Auréola & Plasma Turquesa */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 via-emerald-500/20 to-teal-600/30 rounded-full blur-xl animate-pulse pointer-events-none" />

                  {/* Orbe Estelar GPT */}
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl p-0.5 bg-gradient-to-tr from-emerald-400 via-cyan-400 to-teal-200 shadow-[0_0_35px_rgba(6,182,212,0.5)] flex items-center justify-center">
                    <div className="w-full h-full rounded-[22px] bg-[#051114]/90 backdrop-blur-xl border border-cyan-400/40 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-1 rounded-2xl border border-cyan-400/20 border-dashed animate-spin [animation-duration:12s]" />
                      <OpenAIIcon className="w-10 h-10 md:w-12 md:h-12 text-cyan-400" glow />
                    </div>
                  </div>

                  {/* Identificação Tipográfica */}
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] tracking-wider uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      OpenAI
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-cyan-100 tracking-tight">
                      GPT-4o &amp; Codex
                    </h3>
                    <p className="text-[11px] text-cyan-200/70 font-sans max-w-[180px]">
                      Engenharia Lógica &amp; Algoritmos
                    </p>
                  </div>
                </div>
              ) : (
                /* OPÇÃO A: Símbolo menor e discreto */
                <div className="flex flex-col items-center space-y-2 p-3 rounded-2xl bg-slate-900/80 border border-cyan-500/30 shadow-lg backdrop-blur-md">
                  <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <OpenAIIcon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-cyan-300 font-mono">GPT-4o</div>
                    <div className="text-[10px] text-slate-400">OpenAI</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CENA 5 & 6: REVELAÇÃO DA LOGO E MANIFESTO */}
        {scene >= 5 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in zoom-in-95 duration-1000">
            {/* Logo Materializada com Auréola Holográfica Dourada + Turquesa */}
            <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full p-1 bg-gradient-to-tr from-amber-500 via-cyan-400 to-emerald-400 shadow-[0_0_60px_rgba(6,182,212,0.5)]">
              <div className="w-full h-full rounded-full overflow-hidden relative bg-[#070B14]">
                <Image src="/logo.jpg" alt="ORVEXA Prime Logo" fill className="object-cover" priority />
              </div>
            </div>

            {/* Nome da Marca e Fórmula de Unificação */}
            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-3">
                ORVEXA <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-cyan-300 to-emerald-400">PRIME</span>
              </h1>

              {/* FÓRMULA DE UNIFICAÇÃO: CLAUDE + GPT = ORVEXA */}
              <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-inner text-xs font-mono">
                <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <ClaudeIcon className="w-3.5 h-3.5" />
                  Claude 3.5
                </span>
                <span className="text-slate-500 font-bold">+</span>
                <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <OpenAIIcon className="w-3.5 h-3.5" />
                  GPT-4o
                </span>
                <span className="text-slate-500 font-bold">➔</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-cyan-300 font-bold">
                  ORVEXA PRIME
                </span>
              </div>
            </div>

            {/* CENA 6: Manifesto Institucional Elegante */}
            {scene >= 6 && (
              <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <blockquote className="text-xl md:text-2xl font-light text-slate-200 tracking-wide font-sans italic">
                  &ldquo;Todas as inteligências. Uma única experiência.&rdquo;
                </blockquote>

                <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                  OpenAI, Claude e Gemini orquestrados pelo Smart AI Router com observabilidade de custos, memória contextual e agentes especialistas.
                </p>

                {/* Botões de Ação */}
                {showNavigationControls && (
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                    {onComplete ? (
                      <button
                        onClick={onComplete}
                        className="px-6 py-3 rounded-xl font-bold text-sm text-black bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:brightness-110 shadow-neon-cyan flex items-center gap-2 transition-all hover:scale-105"
                      >
                        <span>Acessar Plataforma</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <Link
                        href={autoRedirectUrl}
                        className="px-6 py-3 rounded-xl font-bold text-sm text-black bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:brightness-110 shadow-neon-cyan flex items-center gap-2 transition-all hover:scale-105"
                      >
                        <span>Acessar Plataforma</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}

                    <button
                      onClick={handleReplay}
                      className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:text-white flex items-center gap-2 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Repetir Abertura</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Indicadores de Etapas */}
      <footer className="relative z-20 px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-cyan-500/60" />
          <span>ORVEXA PRIME DIGITAL © 2026</span>
        </div>

        {/* Indicadores das 6 Cenas */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                scene === step
                  ? "w-8 bg-cyan-400 shadow-[0_0_8px_#00D2FF]"
                  : scene > step
                  ? "w-3 bg-emerald-500/60"
                  : "w-2 bg-slate-800"
              }`}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}

