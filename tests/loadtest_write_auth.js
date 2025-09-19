import http from 'k6/http';
import { sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // ramp up
    { duration: '30s', target: 50 },  // hold
  ],
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  const headers = {
    'Content-Type': 'application/json'
  };

  const payload = {
    movieId: uuidv4(),
    userId: uuidv4(),
    acting: Math.floor(Math.random() * 101),
    story: Math.floor(Math.random() * 101),
    direction: Math.floor(Math.random() * 101),
    visuals: Math.floor(Math.random() * 101),
    sound: Math.floor(Math.random() * 101)
  };

  const res = http.post(
    `${BASE_URL}/api/test/ratings`,
    JSON.stringify(payload),
    { headers, tags: { name: 'POST /api/test/ratings' } }
  );

  if (res.status !== 200) {
    console.log(`Request failed: ${res.status} - ${res.body}`);
  }

  sleep(1);
}
