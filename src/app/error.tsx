// src/app/error.tsx
"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ORVEXA Global Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[#0B101E] border border-rose-500/30 shadow-2xl text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-950/60 border border-rose-700/60 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/50">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-xl font-black text-white">Instabilidade Temporária</h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Ocorreu uma falha inesperada no processamento da página. Nossa equipe de engenharia já
            recebeu o log deste evento.
          </p>
          {error.digest && (
            <div className="mt-3 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-500">
              ID do Incidente: {error.digest}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-neon-cyan transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Início</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
