import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    // Start at 10 VUs immediately
    { duration: '0s', target: 10 },
    // Ramp 10 -> 100 over 1 minute
    { duration: '1m', target: 100 },
    // Hold 100 for 2 minutes
    { duration: '2m', target: 100 },
    // Spike to 500 instantly and hold 30s
    { duration: '0s', target: 500 },
    { duration: '30s', target: 500 },
    // Ramp down to 0 over 30 seconds
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // 95th percentile response time must be < 1s
    http_req_duration: ['p(95)<1000'],
    // Error rate must be < 2%
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = 'http://host.docker.internal:3000';
const MOVIE_IDS = [1, 2, 3, 4, 5];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  // 1) Visit homepage
  http.get(`${BASE_URL}/`, { tags: { name: 'GET /' } });

  // 2) Browse a random movie
  const movieId = pickRandom(MOVIE_IDS);
  http.get(`${BASE_URL}/movie/${movieId}`, { tags: { name: 'GET /movie/:id' } });

  // 3) Submit a rating
  const ratingPayload = JSON.stringify({
    movieId: movieId,
    rating: Math.floor(Math.random() * 101),
    userId: 'test-user',
  });
  http.post(`${BASE_URL}/api/rating`, ratingPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /api/rating' },
  });

  // 4) Sleep for 1 second
  sleep(1);
}


