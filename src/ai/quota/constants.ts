// src/ai/quota/constants.ts
// CONSTANTES & CONFIGURAÇÕES DOS PROVEDORES NO AI QUOTA MANAGER — ORVEXA PRIME

export interface QuotaProviderConfig {
  slug: string;
  name: string;
  category: "MIRAI" | "OPENAI_OFFICIAL" | "ANTHROPIC" | "GOOGLE" | "OPENROUTER" | "AZURE";
  defaultBaseUrl: string;
  avatar: string;
  color: string;
  accentHex: string;
  hasDirectBalanceApi: boolean;
  balanceEndpoint?: string;
  defaultModels: string[];
  pricing: {
    inputPer1kUsd: number;
    outputPer1kUsd: number;
  };
}

export const QUOTA_SUPPORTED_PROVIDERS: Record<string, QuotaProviderConfig> = {
  mirai: {
    slug: "mirai",
    name: "Mirai API",
    category: "MIRAI",
    defaultBaseUrl: "https://api.miraiapi.com/v1",
    avatar: "🔮",
    color: "from-purple-500/20 to-indigo-600/20 border-purple-500/30 text-purple-300",
    accentHex: "#A855F7",
    hasDirectBalanceApi: true,
    balanceEndpoint: "/dashboard/billing/credit_grants",
    defaultModels: ["mirai-gpt-4o", "mirai-claude-3.5", "mirai-deepseek-v3"],
    pricing: {
      inputPer1kUsd: 0.0015,
      outputPer1kUsd: 0.006,
    },
  },
  openai: {
    slug: "openai",
    name: "OpenAI Oficial",
    category: "OPENAI_OFFICIAL",
    defaultBaseUrl: "https://api.openai.com/v1",
    avatar: "⚡",
    color: "from-emerald-500/20 to-teal-600/20 border-emerald-500/30 text-emerald-300",
    accentHex: "#10B981",
    hasDirectBalanceApi: false, // Quota calculada via ai_usage_logs
    defaultModels: ["gpt-4o", "gpt-4o-mini", "gpt-5.6-sol", "o1-preview"],
    pricing: {
      inputPer1kUsd: 0.0025,
      outputPer1kUsd: 0.01,
    },
  },
  anthropic: {
    slug: "anthropic",
    name: "Anthropic Claude",
    category: "ANTHROPIC",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    avatar: "🧠",
    color: "from-amber-500/20 to-orange-600/20 border-amber-500/30 text-amber-300",
    accentHex: "#F59E0B",
    hasDirectBalanceApi: false, // Quota calculada via ai_usage_logs
    defaultModels: ["claude-3-5-sonnet", "claude-sonnet-5", "claude-3-opus", "claude-3-5-haiku"],
    pricing: {
      inputPer1kUsd: 0.003,
      outputPer1kUsd: 0.015,
    },
  },
  google: {
    slug: "google",
    name: "Google Gemini",
    category: "GOOGLE",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    avatar: "🌐",
    color: "from-blue-500/20 to-cyan-600/20 border-blue-500/30 text-blue-300",
    accentHex: "#3B82F6",
    hasDirectBalanceApi: false, // Quota calculada via ai_usage_logs
    defaultModels: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-3-flash-preview"],
    pricing: {
      inputPer1kUsd: 0.00125,
      outputPer1kUsd: 0.005,
    },
  },
  openrouter: {
    slug: "openrouter",
    name: "OpenRouter",
    category: "OPENROUTER",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    avatar: "🚀",
    color: "from-cyan-500/20 to-sky-600/20 border-cyan-500/30 text-cyan-300",
    accentHex: "#06B6D4",
    hasDirectBalanceApi: true,
    balanceEndpoint: "https://openrouter.ai/api/v1/auth/key",
    defaultModels: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "meta-llama/llama-3.3-70b"],
    pricing: {
      inputPer1kUsd: 0.002,
      outputPer1kUsd: 0.008,
    },
  },
  azure: {
    slug: "azure",
    name: "Azure OpenAI",
    category: "AZURE",
    defaultBaseUrl: "https://{resource}.openai.azure.com",
    avatar: "🔷",
    color: "from-sky-500/20 to-indigo-600/20 border-sky-500/30 text-sky-300",
    accentHex: "#0284C7",
    hasDirectBalanceApi: false, // Quota calculada via ai_usage_logs
    defaultModels: ["azure-gpt-4o", "azure-gpt-35-turbo"],
    pricing: {
      inputPer1kUsd: 0.0025,
      outputPer1kUsd: 0.01,
    },
  },
};

export const USD_TO_BRL_RATE = 5.65;

