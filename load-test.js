import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  vus: 50, // 50 virtual users
  duration: '1m', // Run for 1 minute
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.1'], // HTTP errors should be less than 10%
    errors: ['rate<0.1'], // Custom error rate should be less than 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testActors = ['actor1', 'actor2', 'actor3', 'actor4', 'actor5'];
const testMovies = ['movie1', 'movie2', 'movie3', 'movie4', 'movie5'];
const testUsers = [
  { email: 'test1@example.com', password: 'testpass123' },
  { email: 'test2@example.com', password: 'testpass123' },
  { email: 'test3@example.com', password: 'testpass123' },
];

function getRandomRating() {
  return Math.floor(Math.random() * 101); // 0-100
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export default function () {
  // Test 1: Fetch ratings (read-heavy)
  const ratingsResponse = http.get(`${BASE_URL}/api/ratings`);
  const ratingsSuccess = check(ratingsResponse, {
    'ratings fetch status is 200': (r) => r.status === 200,
    'ratings fetch response time < 500ms': (r) => r.timings.duration < 500,
    'ratings response has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) && data.length >= 0;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!ratingsSuccess);

  // Test 2: Fetch actors (read-heavy)
  const actorsResponse = http.get(`${BASE_URL}/api/actors`);
  const actorsSuccess = check(actorsResponse, {
    'actors fetch status is 200': (r) => r.status === 200,
    'actors fetch response time < 500ms': (r) => r.timings.duration < 500,
    'actors response has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) && data.length >= 0;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!actorsSuccess);

  // Test 3: Fetch movies (read-heavy)
  const moviesResponse = http.get(`${BASE_URL}/api/movies`);
  const moviesSuccess = check(moviesResponse, {
    'movies fetch status is 200': (r) => r.status === 200,
    'movies fetch response time < 500ms': (r) => r.timings.duration < 500,
    'movies response has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) && data.length >= 0;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!moviesSuccess);

  // Test 4: Search endpoint
  const searchQuery = ['Tom', 'John', 'Brad', 'Leo', 'Ryan'][Math.floor(Math.random() * 5)];
  const searchResponse = http.get(`${BASE_URL}/api/search?q=${searchQuery}`);
  const searchSuccess = check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 1000ms': (r) => r.timings.duration < 1000,
    'search response has structure': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.hasOwnProperty('actors') && data.hasOwnProperty('movies');
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!searchSuccess);

  // Test 5: Performance suggestions (cached endpoint)
  const suggestionsResponse = http.get(`${BASE_URL}/api/suggestions/performances`);
  const suggestionsSuccess = check(suggestionsResponse, {
    'suggestions status is 200': (r) => r.status === 200,
    'suggestions response time < 2000ms': (r) => r.timings.duration < 2000,
    'suggestions response has items': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.hasOwnProperty('items') && Array.isArray(data.items);
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!suggestionsSuccess);

  // Test 6: Rate limiting test - guest rating submission (should be rate limited)
  const guestRatingPayload = {
    actorId: getRandomItem(testActors),
    movieId: getRandomItem(testMovies),
    emotionalRangeDepth: getRandomRating(),
    characterBelievability: getRandomRating(),
    technicalSkill: getRandomRating(),
    screenPresence: getRandomRating(),
    chemistryInteraction: getRandomRating(),
    comment: 'Load test comment',
    recaptchaToken: 'test-token',
  };

  const guestRatingResponse = http.post(
    `${BASE_URL}/api/ratings/guest`,
    JSON.stringify(guestRatingPayload),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  // Guest ratings should either succeed or be rate limited (429)
  const guestRatingSuccess = check(guestRatingResponse, {
    'guest rating status is 200 or 429 or 403': (r) => 
      r.status === 200 || r.status === 429 || r.status === 403, // 403 for recaptcha failure
    'guest rating response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!guestRatingSuccess);

  // Test 7: Rate limiting test - signup (should be rate limited)
  const signupPayload = {
    email: `loadtest${Math.random()}@example.com`,
    password: 'testpass123',
  };

  const signupResponse = http.post(
    `${BASE_URL}/api/auth/signup`,
    JSON.stringify(signupPayload),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  // Signup should either succeed, fail validation, or be rate limited
  const signupSuccess = check(signupResponse, {
    'signup status is 200, 400, or 429': (r) => 
      r.status === 200 || r.status === 400 || r.status === 429,
    'signup response time < 3000ms': (r) => r.timings.duration < 3000,
  });
  errorRate.add(!signupSuccess);

  // Small delay between iterations to simulate real user behavior
  sleep(0.5 + Math.random() * 1.5); // 0.5-2 second delay
}

export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: `
    ===== LOAD TEST SUMMARY =====
    Total requests: ${data.metrics.http_reqs.values.count}
    Failed requests: ${data.metrics.http_req_failed.values.rate * 100}%
    Average response time: ${data.metrics.http_req_duration.values.avg}ms
    95th percentile response time: ${data.metrics.http_req_duration.values['p(95)']}ms
    Max response time: ${data.metrics.http_req_duration.values.max}ms
    
    VUs: ${data.options.vus}
    Duration: ${data.options.duration}
    
    ===== THRESHOLDS =====
    ${Object.entries(data.metrics)
      .filter(([_, metric]) => metric.thresholds)
      .map(([name, metric]) => {
        const thresholds = Object.entries(metric.thresholds);
        return thresholds.map(([threshold, result]) => 
          `${name} ${threshold}: ${result.ok ? '✓ PASS' : '✗ FAIL'}`
        ).join('\n');
      })
      .join('\n')}
    ==============================
    `,
  };
}
