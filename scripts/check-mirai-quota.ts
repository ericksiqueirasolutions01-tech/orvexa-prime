async function checkQuotaEndpoints() {
  const key = 'sk-z5G1R5volTvyYJVoIk01A5LKIYysFFcr3fRmOJ9y0F8BklFI';
  const baseUrl = 'https://api.miraiapi.com';
  
  const endpoints = [
    '/v1/dashboard/billing/credit_grants',
    '/dashboard/billing/credit_grants',
    '/v1/dashboard/billing/subscription',
    '/dashboard/billing/subscription',
    '/v1/dashboard/billing/usage?start_date=2026-09-01&end_date=2026-09-30',
    '/dashboard/billing/usage?start_date=2026-09-01&end_date=2026-09-30',
    '/api/user/self',
    '/v1/user/balance',
    '/api/user/balance',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep}`, {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      });
      const text = await res.text();
      console.log(`Endpoint: ${ep} -> Status ${res.status}: ${text.slice(0, 200)}`);
    } catch (err: any) {
      console.log(`Endpoint: ${ep} -> Error: ${err.message}`);
    }
  }
}

checkQuotaEndpoints();

