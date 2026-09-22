"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string, action?: { label: string; onClick: () => void }) => string;
  info: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const duration = toast.durationMs ?? 5000;

      setToasts((prev) => [...prev, { ...toast, id }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => addToast({ type: "success", title, message }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string, action?: { label: string; onClick: () => void }) =>
      addToast({ type: "error", title, message, durationMs: 7000, action }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => addToast({ type: "info", title, message }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => addToast({ type: "warning", title, message }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}

      {/* Floating Toasts Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const typeStyles = {
            success: {
              border: "border-emerald-500/40",
              bg: "bg-slate-900/95 text-slate-100",
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
              glow: "shadow-[0_4px_20px_rgba(16,185,129,0.25)]",
            },
            error: {
              border: "border-red-500/50",
              bg: "bg-slate-900/95 text-slate-100",
              icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />,
              glow: "shadow-[0_4px_20px_rgba(239,68,68,0.25)]",
            },
            warning: {
              border: "border-amber-500/50",
              bg: "bg-slate-900/95 text-slate-100",
              icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
              glow: "shadow-[0_4px_20px_rgba(245,158,11,0.25)]",
            },
            info: {
              border: "border-cyan-500/50",
              bg: "bg-slate-900/95 text-slate-100",
              icon: <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />,
              glow: "shadow-[0_4px_20px_rgba(0,210,255,0.25)]",
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl p-3.5 border backdrop-blur-xl ${typeStyles.border} ${typeStyles.bg} ${typeStyles.glow} animate-slideUp flex items-start gap-3 transition-all duration-300`}
            >
              {typeStyles.icon}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white leading-tight">{toast.title}</div>
                {toast.message && (
                  <div className="text-[11px] text-slate-300 mt-1 leading-snug break-words">
                    {toast.message}
                  </div>
                )}
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      removeToast(toast.id);
                    }}
                    className="mt-2 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0"
                aria-label="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser utilizado dentro de um ToastProvider");
  }
  return context;
}

