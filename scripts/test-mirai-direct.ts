async function testKey() {
  const key = 'sk-z5G1R5volTvyYJVoIk01A5LKIYysFFcr3fRmOJ9y0F8BklFI';
  const baseUrl = 'https://api.miraiapi.com/v1';
  console.log('Testing Mirai API Key on', baseUrl);
  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    const latency = Date.now() - start;
    console.log(`HTTP STATUS: ${res.status} ${res.statusText} (${latency}ms)`);
    const data = await res.json();
    console.log('MODELS DATA:');
    if (data.data && Array.isArray(data.data)) {
      console.log(`Found ${data.data.length} models:`);
      data.data.forEach((m: any) => console.log(` - ${m.id}`));
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('FETCH ERROR:', err);
  }
}
testKey();

