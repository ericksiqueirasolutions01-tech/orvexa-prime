async function streamFull(model: string) {
  const key = 'sk-z5G1R5volTvyYJVoIk01A5LKIYysFFcr3fRmOJ9y0F8BklFI';
  const baseUrl = 'https://api.miraiapi.com/v1';
  console.log(`\n========================================`);
  console.log(`Streaming full response for ${model}...`);
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: 'Olá ORVEXA, responda apenas: SISTEMA ONLINE' }
        ],
        temperature: 0.1,
        stream: true
      })
    });
    if (!res.ok || !res.body) {
      console.log(`HTTP ${res.status}: ${await res.text()}`);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
            }
          } catch {}
        }
      }
    }
    const latency = Date.now() - start;
    console.log(`Finished in ${latency}ms`);
    console.log(`Model ${model} Full Answer: "${fullContent.trim()}"`);
  } catch (err: any) {
    console.error(`Error:`, err.message);
  }
}

async function run() {
  await streamFull('gpt-5.6-luna');
  await streamFull('gpt-5.6-terra');
  await streamFull('gpt-6-sol');
  await streamFull('gpt-5.6-sol');
}

run();

