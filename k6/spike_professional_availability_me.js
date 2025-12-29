import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 1 },
    { duration: "10s", target: 15 }, // spike vus = 3x load vus
    { duration: "10s", target: 1 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<40"], // 50ms as it is a simple get request
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = 'http://host.docker.internal:8080';

export function setup() {
  const payload = JSON.stringify({
    username: "alice_miller",
    password: "secret123",
  });

  const params = { headers: { "Content-Type": "application/json" } };

  const res = http.post(`${BASE_URL}/api/login`, payload, params);

  check(res, { "login succeeded": (r) => r.status === 200 });

  return { token: res.body };
}

export default function (data) {
  const params = {
    headers: {
      Authorization: `Bearer ${data.token}`,
    },
  };

  const res = http.get(
    `${BASE_URL}/api/availability/professional/me`,
    params
  );

  check(res, {
    "status is 200": (r) => r.status === 200,
  });
}
