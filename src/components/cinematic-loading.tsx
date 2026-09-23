"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight, RotateCcw, Volume2, VolumeX, Shield, Play } from "lucide-react";

interface CinematicLoadingProps {
  onComplete?: () => void;
  autoRedirectUrl?: string;
  autoRedirectDelayMs?: number;
  showNavigationControls?: boolean;
}

export function CinematicLoading({
  onComplete,
  autoRedirectUrl = "/dashboard/chat",
  autoRedirectDelayMs = 2000,
  showNavigationControls = true,
}: CinematicLoadingProps) {
  // Cenas: 1 (Origem), 2 (Claude), 3 (GPT), 4 (Fusão), 5 (Logo ORVEXA), 6 (Manifesto & Final)
  const [scene, setScene] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);

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
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-4">
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

        {/* CENA 2: ENTRADA CLAUDE (Laranja/Dourado) */}
        {scene === 2 && (
          <div className="absolute left-6 md:left-24 max-w-xs text-left space-y-2 animate-in slide-in-from-left duration-700">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_#F59E0B]"></span>
              <span className="font-mono text-xs uppercase tracking-wider text-amber-300 font-bold">
                Anthropic Claude
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-amber-100 tracking-tight">
              Inteligência, Síntese &amp; Raciocínio Profundo
            </h2>
            <p className="text-xs text-amber-200/70 font-sans leading-relaxed">
              Interpretação documental de alta precisão e processamento semântico contextual.
            </p>
          </div>
        )}

        {/* CENA 3: ENTRADA GPT (Verde/Turquesa) */}
        {scene === 3 && (
          <div className="absolute right-6 md:right-24 max-w-xs text-right space-y-2 animate-in slide-in-from-right duration-700">
            <div className="flex items-center justify-end gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-300 font-bold">
                OpenAI GPT-4o &amp; Codex
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#06B6D4]"></span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-cyan-100 tracking-tight">
              Engenharia Lógica &amp; Computação Algorítmica
            </h2>
            <p className="text-xs text-cyan-200/70 font-sans leading-relaxed">
              Arquitetura de código, modelagem matemática e execução técnica de ponta.
            </p>
          </div>
        )}

        {/* CENA 4: FUSÃO CENTRAL */}
        {scene === 4 && (
          <div className="space-y-4 animate-in zoom-in-75 duration-700">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              {/* Anel de Plasma */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400 animate-spin duration-1000"></div>
              <div className="absolute inset-2 rounded-full border-2 border-amber-400 animate-spin duration-700 [animation-direction:reverse]"></div>
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500/40 via-cyan-400/40 to-white/60 blur-md animate-pulse"></div>
              <Sparkles className="w-8 h-8 text-white relative z-10 animate-bounce" />
            </div>
            <div className="font-mono text-xs font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-cyan-300">
              Convergência das Maiores Inteligências em Andamento...
            </div>
          </div>
        )}

        {/* CENA 5 & 6: REVELAÇÃO DA LOGO E MANIFESTO */}
        {scene >= 5 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in zoom-in-95 duration-1000">
            {/* Logo Materializada com Auréola Holográfica */}
            <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full p-1 bg-gradient-to-tr from-amber-500 via-cyan-400 to-emerald-400 shadow-[0_0_50px_rgba(0,210,255,0.4)]">
              <div className="w-full h-full rounded-full overflow-hidden relative bg-[#070B14]">
                <Image src="/logo.jpg" alt="ORVEXA Prime Logo" fill className="object-cover" priority />
              </div>
            </div>

            {/* Nome da Marca */}
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-3">
                ORVEXA <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">PRIME</span>
              </h1>
              <div className="inline-block px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] uppercase tracking-widest">
                AI Orchestration Architecture
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

