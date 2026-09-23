// src/ai/keys/constants.ts
// DEFINIÇÃO DOS PROVEDORES SUPORTADOS PARA CONTRATOS E CHAVES

export interface KeyProviderConfig {
  slug: string;
  name: string;
  avatar: string;
  category: "OPENAI" | "ANTHROPIC" | "GOOGLE" | "GATEWAY";
  defaultBaseUrl?: string;
  primaryModel: string;
}

export const SUPPORTED_KEY_PROVIDERS: KeyProviderConfig[] = [
  {
    slug: "openai",
    name: "OpenAI Oficial",
    avatar: "🟢",
    category: "OPENAI",
    primaryModel: "gpt-4o",
  },
  {
    slug: "mirai",
    name: "Mirai API",
    avatar: "⚡",
    category: "GATEWAY",
    defaultBaseUrl: "https://api.mirai.orvexa.digital/v1",
    primaryModel: "gpt-5.6-sol",
  },
  {
    slug: "anthropic",
    name: "Anthropic Claude",
    avatar: "🟣",
    category: "ANTHROPIC",
    primaryModel: "claude-3-5-sonnet-20241022",
  },
  {
    slug: "google",
    name: "Google Gemini",
    avatar: "🔵",
    category: "GOOGLE",
    primaryModel: "gemini-3-flash-preview",
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    avatar: "🔀",
    category: "GATEWAY",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    primaryModel: "openai/gpt-4o-mini",
  },
  {
    slug: "azure",
    name: "Azure OpenAI",
    avatar: "☁️",
    category: "GATEWAY",
    primaryModel: "gpt-4o-azure",
  },
];

