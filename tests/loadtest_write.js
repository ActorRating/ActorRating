import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    // Start at 10 VUs immediately
    { duration: '0s', target: 10 },
    // Ramp 10 -> 50 over 30 seconds
    { duration: '30s', target: 50 },
    // Hold 50 for 1 minute
    { duration: '1m', target: 50 },
    // Spike to 200 instantly and hold 30s
    { duration: '0s', target: 200 },
    { duration: '30s', target: 200 },
    // Ramp down to 0 over 30 seconds
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // 95th percentile response time must be < 1.5s
    http_req_duration: ['p(95)<1500'],
    // Error rate must be < 5%
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = 'http://host.docker.internal:3000';
const MOVIE_IDS = [1, 2, 3, 4, 5];

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export default function () {
  const movieId = pickRandom(MOVIE_IDS);
  const payload = JSON.stringify({
    movieId: movieId,
    rating: Math.floor(Math.random() * 101),
    userId: 'test-user',
  });

  http.post(`${BASE_URL}/api/rating`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /api/rating' },
  });

  sleep(1);
}


