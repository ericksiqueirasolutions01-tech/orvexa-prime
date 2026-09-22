// src/ai/providers/google.ts
// PROVEDOR GOOGLE GEMINI (GOOGLE AI STUDIO NATIVO) — ORVEXA PRIME DIGITAL

import { normalizeModelIdentifier } from "../models/registry";

export async function callGoogleStream(params: {
  apiKey: string;
  modelIdentifier: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const { apiKey, modelIdentifier, messages, systemPrompt } = params;

  const normalized = normalizeModelIdentifier(modelIdentifier);

  const contents = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const candidateModels = [
    normalized,
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.6-flash",
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastError: any = null;

  for (const targetModel of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          generationConfig: { maxOutputTokens: 4096 },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        const error: any = new Error(`Gemini API error (${targetModel}): ${response.status} ${errText}`);
        error.status = response.status;
        lastError = error;

        // Se for 503 (alta demanda) ou 404 (modelo depreciado), tenta o próximo silenciosamente
        if (response.status === 503 || response.status === 404) {
          console.warn(`[AI Google] Modelo ${targetModel} indisponível (${response.status}), tentando modelo alternativo...`);
          continue;
        }
        throw error;
      }

      return createGeminiTransformStream(response.body!);
    } catch (err: any) {
      lastError = err;
      if (err.status === 503 || err.status === 404) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Google Gemini indisponível no momento.");
}

function createGeminiTransformStream(rawStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = rawStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(dataStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              } catch {
                // Ignore partial JSON
              }
            }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
}
