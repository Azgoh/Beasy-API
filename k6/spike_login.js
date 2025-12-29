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
    http_req_duration: ["p(95)<4000"], // relax p95 by 2 sec due to the vu spike
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const payload = JSON.stringify({
    username: "admin",
    password: "admin123",
  });

  const params = {
    headers: { "Content-Type": "application/json" },
  };

  const res = http.post("http://localhost:8080/api/login", payload, params);

  check(res, {
    "status is 200 or 401": (r) => r.status === 200 || r.status === 401,
  });
}
