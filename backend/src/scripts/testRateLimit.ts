// Simple script to test the IP-based rate limiter.

/**
 * Simple script to test the IP-based rate limiter.
 * Usage: npx tsx src/scripts/testRateLimit.ts
 * 
 * Pre-requisites:
 * 1. Set SCRAPE_LIMIT_PER_IP=1 in backend/.env
 * 2. Ensure WHITELIST_IPS does not include 127.0.0.1 in backend/.env
 * 3. Ensure the backend server is running (npm run dev)
 */

async function testRateLimit() {
  const url = 'http://localhost:3001/api/scrape';
  const payload = {
    url: 'https://www.nike.com/t/air-max-270-mens-shoes-K9BTZ7',
    brand: 'nike'
  };

  console.log('--- Starting Rate Limit Test ---');
  
  // First Request - Should pass (if limit >= 1)
  try {
    console.log('Request 1: Sending...');
    const res1 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Request 1: Status', res1.status);
    if (!res1.ok) {
      const data = await res1.json();
      console.log('Response Error:', data);
    }
  } catch (error: any) {
    console.error('Request 1: Network Error', error.message);
  }

  // Second Request - Should be rate limited (if limit = 1)
  try {
    console.log('\nRequest 2: Sending...');
    const res2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Request 2: Status', res2.status);
    if (res2.status === 429) {
      const data = await res2.json();
      console.log('Request 2: Correctly rate limited (429 Too Many Requests)');
      console.log('Response Message:', data);
    } else if (!res2.ok) {
      const data = await res2.json();
      console.log('Request 2: Failed with status', res2.status, data);
    } else {
      console.log('Request 2: Unexpected Success!', res2.status);
    }
  } catch (error: any) {
    console.error('Request 2: Network Error', error.message);
  }

  console.log('\n--- Rate Limit Test Complete ---');
}

testRateLimit();
