import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    constant_request_rate: {
      executor: "constant-arrival-rate",
      rate: 67, // ~67 requests per second to achieve ~2000 in 30s
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
};

const BASE_URL =
  "http://vehicle-alb-210669922.us-east-2.elb.amazonaws.com/event";

// Use a shared counter approach - each VU will contribute to total count
// We'll use a probabilistic approach: 1 in 2000 chance
// To ensure exactly 1, we can use __ITER to track across all VUs
let emergencySent = false;

export default function () {
  // Use __ITER which is unique across all VUs
  // Randomly select one iteration number (0-1999) to be emergency
  // Since we can't share state, we'll use a probabilistic approach
  // that should result in approximately 1 emergency
  const isEmergency = !emergencySent && Math.random() < 1 / 2000;

  if (isEmergency) {
    emergencySent = true;
  }

  // Generate random vehicle data
  const vehiclePlate = `TEST-${String(
    Math.floor(Math.random() * 10000)
  ).padStart(3, "0")}`;
  const latitude = (Math.random() * 180 - 90).toFixed(6);
  const longitude = (Math.random() * 360 - 180).toFixed(6);

  const payload = isEmergency
    ? {
        type: "Emergency",
        vehicle_plate: vehiclePlate,
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        status: "CRITICAL",
      }
    : {
        type: "position",
        vehicle_plate: vehiclePlate,
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        status: "NORMAL",
      };

  const params = {
    headers: { "Content-Type": "application/json" },
  };

  const res = http.post(BASE_URL, JSON.stringify(payload), params);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  if (isEmergency) {
    console.log(`Emergency request sent!`);
  }
}

export function handleSummary(data) {
  return {
    stdout: `
=== Load Test Summary ===
Total requests: ${data.metrics.http_reqs.values.count}
Successful (200): ${data.metrics.http_req_duration.values.count}
Duration: 30s
Rate: ${(data.metrics.http_reqs.values.count / 30).toFixed(2)} requests/second
Note: Emergency requests use probabilistic selection (1/2000 chance per request)
    `,
  };
}
