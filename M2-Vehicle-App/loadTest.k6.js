import http from "k6/http";
import { check, Counter } from "k6";

export const options = {
  scenarios: {
    constant_request_rate: {
      executor: "constant-arrival-rate",
      rate: 33, // ~33 requests per second to achieve ~1000 in 30s
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
};

const BASE_URL =
  "http://vehicle-alb-210669922.us-east-2.elb.amazonaws.com/event";

// Custom metrics to track message types
const emergencyCounter = new Counter("emergency_messages");
const positionCounter = new Counter("position_messages");
const status200Counter = new Counter("status_200_responses");

// Use a shared counter approach - each VU will contribute to total count
// We'll use a probabilistic approach: 1 in 1000 chance
// To ensure exactly 1, we can use __ITER to track across all VUs
let emergencySent = false;

export default function () {
  // Use __ITER which is unique across all VUs
  // Randomly select one iteration number (0-999) to be emergency
  // Since we can't share state, we'll use a probabilistic approach
  // that should result in approximately 1 emergency
  const isEmergency = !emergencySent && Math.random() < 1 / 1000;

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

  // Track status 200 responses
  if (res.status === 200) {
    status200Counter.add(1);
  }

  // Track message types
  if (isEmergency) {
    emergencyCounter.add(1);
  } else {
    positionCounter.add(1);
  }

  check(res, {
    "status is 200": (r) => r.status === 200,
  });
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;
  const status200Count = data.metrics.status_200_responses
    ? data.metrics.status_200_responses.values.count
    : 0;
  const emergencyCount = data.metrics.emergency_messages
    ? data.metrics.emergency_messages.values.count
    : 0;
  const positionCount = data.metrics.position_messages
    ? data.metrics.position_messages.values.count
    : 0;

  return {
    stdout: `
=== Load Test Summary ===
Total requests: ${totalRequests}
Status 200 responses: ${status200Count}
Emergency messages sent: ${emergencyCount}
Position messages sent: ${positionCount}
Duration: 30s
Rate: ${(totalRequests / 30).toFixed(2)} requests/second
Note: Emergency requests use probabilistic selection (1/1000 chance per request)
    `,
  };
}
