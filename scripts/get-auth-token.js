const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com'; // Replace with your test user
const TEST_PASSWORD = 'testpassword';   // Replace with your test user password

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function getAuthToken() {
  try {
    console.log('🔐 Attempting to authenticate...');
    console.log('⚠️  Note: Your API requires reCAPTCHA for authentication');
    console.log('💡 For load testing, you have a few options:');
    console.log('');
    console.log('Option 1: Use NextAuth session (recommended)');
    console.log('   - Log in through your browser');
    console.log('   - Copy the session cookie from browser dev tools');
    console.log('   - Use it in your load test');
    console.log('');
    console.log('Option 2: Temporarily disable reCAPTCHA for testing');
    console.log('   - Comment out reCAPTCHA validation in your signin route');
    console.log('');
    console.log('Option 3: Create a test endpoint without auth');
    console.log('   - Add a /api/test endpoint that bypasses authentication');
    console.log('');
    
    // Try the signin endpoint to see the exact error
    const loginData = JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      recaptchaToken: 'test-token' // This will fail, but shows the error
    });
    
    const loginRes = await makeRequest(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);
    
    console.log(`📊 Login response status: ${loginRes.status}`);
    console.log('📄 Response body:', loginRes.body);
    
    // Check for session cookies
    const cookies = loginRes.headers['set-cookie'];
    if (cookies) {
      console.log('\n🍪 Found cookies:');
      cookies.forEach(cookie => {
        console.log(`  ${cookie}`);
      });
      
      // Extract session token
      const sessionCookie = cookies.find(c => 
        c.includes('next-auth.session-token') || 
        c.includes('__Secure-next-auth.session-token')
      );
      
      if (sessionCookie) {
        const token = sessionCookie.split(';')[0];
        console.log('\n✅ Session token found:');
        console.log(`   ${token}`);
        console.log('\n📝 Add this to your Artillery config:');
        console.log(`   headers:\n     Cookie: "${token}"`);
        return token;
      }
    }
    
    console.log('\n❌ Authentication failed due to reCAPTCHA requirement');
    console.log('💡 Quick fix for load testing:');
    console.log('   1. Open your browser and go to http://localhost:3000/auth/signin');
    console.log('   2. Log in with your test credentials');
    console.log('   3. Open browser dev tools → Application → Cookies');
    console.log('   4. Copy the "next-auth.session-token" value');
    console.log('   5. Use it in your load test headers');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
getAuthToken();
