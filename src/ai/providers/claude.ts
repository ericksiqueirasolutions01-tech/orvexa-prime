// src/ai/providers/claude.ts
// PROVEDOR ANTHROPIC CLAUDE (OFICIAL & MIRAI API) — ORVEXA PRIME DIGITAL

import { callOpenAiStream } from "./openai";

export interface ClaudeMessagePayload {
  role: "user" | "assistant";
  content: string;
}

export async function callClaudeStream(params: {
  apiKey: string;
  modelIdentifier: string;
  messages: Array<{ role: string; content: string }>;
  customBaseUrl?: string | null;
  systemPrompt?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const { apiKey, modelIdentifier, messages, customBaseUrl, systemPrompt } = params;

  const isMirai = customBaseUrl?.includes("miraiapi") || false;

  // Se estiver utilizando o proxy Mirai API, este expõe o endpoint padrão OpenAI (/v1/chat/completions)
  if (isMirai) {
    const validClaudeMiraiModels = [
      "claude-sonnet-5",
      "claude-opus-5",
      "claude-opus-4.8",
      "claude-fable-5.1",
      "claude-fable-5",
    ];

    let targetModel = modelIdentifier;
    if (!validClaudeMiraiModels.includes(targetModel)) {
      targetModel = "claude-sonnet-5";
    }

    const formattedMessages = messages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    return callOpenAiStream({
      apiKey,
      modelIdentifier: targetModel,
      messages: formattedMessages,
      customBaseUrl,
      systemPrompt,
    });
  }

  // Anthropic API Oficial (/v1/messages)
  let endpoint = "https://api.anthropic.com/v1/messages";
  if (customBaseUrl) {
    const trimmed = customBaseUrl.trim().replace(/\/+$/, "");
    endpoint = trimmed.endsWith("/messages")
      ? trimmed
      : trimmed.endsWith("/v1")
      ? `${trimmed}/messages`
      : `${trimmed}/v1/messages`;
  }

  const formattedMessages: ClaudeMessagePayload[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelIdentifier,
      messages: formattedMessages,
      system: systemPrompt || undefined,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    const error: any = new Error(`Anthropic API error (${response.status}): ${errText}`);
    error.status = response.status;
    throw error;
  }

  return createAnthropicTransformStream(response.body!);
}

function createAnthropicTransformStream(rawStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
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
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  controller.enqueue(encoder.encode(parsed.delta.text));
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

