async function testModel(model: string, stream: boolean) {
  const key = 'sk-z5G1R5volTvyYJVoIk01A5LKIYysFFcr3fRmOJ9y0F8BklFI';
  const baseUrl = 'https://api.miraiapi.com/v1';
  console.log(`\nTesting ${model} (stream: ${stream})...`);
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
        temperature: 0.2,
        max_tokens: 50,
        stream
      })
    });
    const latency = Date.now() - start;
    const contentType = res.headers.get('content-type') || '';
    if (stream && res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let output = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
        if (output.length > 500) break;
      }
      console.log(`Status: ${res.status} (${latency}ms) [${contentType}]`);
      console.log(`Stream snippet: ${output.slice(0, 300)}`);
    } else {
      const text = await res.text();
      console.log(`Status: ${res.status} (${latency}ms) [${contentType}]`);
      console.log(`Response: ${text.slice(0, 300)}`);
    }
  } catch (err: any) {
    console.error(`Error ${model}:`, err.message);
  }
}

async function run() {
  const models = ['gpt-5.6-sol', 'gpt-6-astra', 'gpt-6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'];
  for (const m of models) {
    await testModel(m, true);
  }
}

run();

