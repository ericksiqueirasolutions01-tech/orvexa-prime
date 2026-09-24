async function testChatRaw() {
  const key = 'sk-z5G1R5volTvyYJVoIk01A5LKIYysFFcr3fRmOJ9y0F8BklFI';
  const baseUrl = 'https://api.miraiapi.com/v1';
  console.log('Testing Chat Completion RAW on', baseUrl);
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
        max_tokens: 50
      })
    });
    const latency = Date.now() - start;
    console.log(`HTTP STATUS: ${res.status} ${res.statusText} (${latency}ms)`);
    console.log('HEADERS:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('RAW RESPONSE (first 1000 chars):');
    console.log(text.slice(0, 1000));
  } catch (err) {
    console.error('FETCH ERROR:', err);
  }
}
testChatRaw();

