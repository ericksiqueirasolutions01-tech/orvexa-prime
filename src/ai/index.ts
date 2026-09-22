// src/ai/index.ts
// AI CORE ENGINE — ORVEXA PRIME DIGITAL
// Ponto de entrada unificado para Gateway, Provedores, Modelos, Ferramentas e Memória

export * from "./gateway/router";
export * from "./gateway/intent-detector";
export * from "./gateway/fallback";

export * from "./providers/manager";
export * from "./providers/openai";
export * from "./providers/claude";
export * from "./providers/google";

export * from "./models/registry";

export * from "./tools/files";
export * from "./tools/images";
export * from "./tools/code";

export * from "./memory/user-memory";
