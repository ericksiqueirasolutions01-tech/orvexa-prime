"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({
  className = "",
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { isDark, setTheme } = useTheme();

  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      onClick={toggle}
      type="button"
      title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className={`relative inline-flex items-center gap-2 p-2 rounded-xl border transition-all duration-300 ${
        isDark
          ? "bg-slate-900/80 border-cyan-500/20 text-cyan-300 hover:bg-slate-800 hover:border-cyan-500/40 hover:shadow-neon-cyan"
          : "bg-white border-slate-200 text-amber-600 hover:bg-slate-100 hover:border-amber-300 shadow-sm"
      } ${className}`}
      aria-label="Alternar tema claro/escuro"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-cyan-400 transition-transform duration-300 rotate-0" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 rotate-0" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-semibold select-none">
          {isDark ? "Modo Escuro" : "Modo Claro"}
        </span>
      )}
    </button>
  );
}

