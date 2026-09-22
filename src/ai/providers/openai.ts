// src/ai/providers/openai.ts
// PROVEDOR OPENAI & CODEX (MIRAI API / OFICIAL) — ORVEXA PRIME DIGITAL

export interface ChatMessagePayload {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function callOpenAiStream(params: {
  apiKey: string;
  modelIdentifier: string;
  messages: ChatMessagePayload[];
  customBaseUrl?: string | null;
  systemPrompt?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const { apiKey, modelIdentifier, messages, customBaseUrl, systemPrompt } = params;

  let endpoint = "https://api.openai.com/v1/chat/completions";
  if (customBaseUrl) {
    const trimmed = customBaseUrl.trim().replace(/\/+$/, "");
    endpoint = trimmed.endsWith("/chat/completions")
      ? trimmed
      : trimmed.endsWith("/v1")
      ? `${trimmed}/chat/completions`
      : `${trimmed}/v1/chat/completions`;
  }

  const formattedMessages: ChatMessagePayload[] = [];
  if (systemPrompt) {
    formattedMessages.push({ role: "system", content: systemPrompt });
  }
  formattedMessages.push(...messages);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelIdentifier,
      messages: formattedMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    const error: any = new Error(`OpenAI/Codex API error (${endpoint}): ${response.status} ${errText}`);
    error.status = response.status;
    throw error;
  }

  return createOpenAiTransformStream(response.body!);
}

function createOpenAiTransformStream(rawStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
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
              if (dataStr === "[DONE]") return;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(encoder.encode(delta));
                }
              } catch {
                // Ignore partial chunks
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
