async function testChatStream() {
  const key = 'sk-z5G1R5volTvyYJVoIk01A5LKIYysFFcr3fRmOJ9y0F8BklFI';
  const baseUrl = 'https://api.miraiapi.com/v1';
  console.log('Testing Chat Completion STREAMING on', baseUrl);
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        messages: [
          { role: 'user', content: 'Olá ORVEXA, responda somente: SISTEMA ONLINE' }
        ],
        temperature: 0.1,
        stream: true
      })
    });
    console.log(`HTTP STATUS: ${res.status} ${res.statusText}`);
    console.log('HEADERS:', Object.fromEntries(res.headers.entries()));
    if (!res.body) {
      console.log('No body');
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let fullText = '';
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        process.stdout.write(chunk);
        fullText += chunk;
      }
    }
    console.log('\n--- FINISHED IN', Date.now() - start, 'ms ---');
  } catch (err) {
    console.error('STREAM ERROR:', err);
  }
}
testChatStream();

