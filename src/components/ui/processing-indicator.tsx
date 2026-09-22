"use client";

import React from "react";
import { Sparkles, Cpu, Brain, CheckCircle2 } from "lucide-react";

export interface ProcessingStep {
  id: string;
  label: string;
  status: "waiting" | "active" | "completed";
}

export function ProcessingIndicator({
  modelName = "ORVEXA PRIME",
  currentStep = "Processando requisição de inteligência...",
  elapsedSeconds = 0,
  steps = [],
}: {
  modelName?: string;
  currentStep?: string;
  elapsedSeconds?: number;
  steps?: ProcessingStep[];
}) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0D1322] to-slate-900/90 border border-cyan-500/30 shadow-neon-glow space-y-3 animate-fadeIn">
      {/* Header with pulsing indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 relative" />
          </div>
          <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            {modelName}
          </span>
        </div>

        {elapsedSeconds > 0 && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
            {elapsedSeconds.toFixed(1)}s
          </span>
        )}
      </div>

      {/* Active step label */}
      <div className="text-xs text-cyan-200 font-medium flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
        <span>{currentStep}</span>
      </div>

      {/* Progress animation bar */}
      <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden relative">
        <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 w-full rounded-full animate-[progressIndeterminate_1.8s_ease-in-out_infinite]" />
      </div>

      {/* Sub-steps if provided */}
      {steps.length > 0 && (
        <div className="pt-1 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-1.5 text-[11px]">
              {step.status === "completed" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : step.status === "active" ? (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
              )}
              <span
                className={`truncate ${
                  step.status === "active"
                    ? "text-cyan-300 font-bold"
                    : step.status === "completed"
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

