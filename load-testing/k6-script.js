import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const reportCreated = new Counter('reports_created');
const reportsFetched = new Counter('reports_fetched');
const errorRate = new Rate('error_rate');
const createDuration = new Trend('create_duration');
const listDuration = new Trend('list_duration');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';

// Load test scenarios for demonstrating auto-scaling
export const options = {
  scenarios: {
    // Scenario 1: Gradual ramp-up to trigger scaling
    scaling_demo: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },   // Warm up
        { duration: '1m', target: 100 },   // Ramp up - should trigger scaling
        { duration: '2m', target: 200 },   // Peak load - more scaling
        { duration: '1m', target: 200 },   // Sustain peak
        { duration: '1m', target: 50 },    // Ramp down
        { duration: '1m', target: 10 },    // Cool down - should scale down
        { duration: '30s', target: 0 },    // Stop
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],      // 95% of requests < 500ms
    http_req_failed: ['rate<0.05'],        // Error rate < 5%
    'create_duration': ['p(95)<1000'],     // Report creation < 1s
    'list_duration': ['p(95)<300'],        // List reports < 300ms
  },
};

// Report categories for random selection
const categories = ['crime', 'cleanliness', 'health', 'infrastructure', 'other'];
const visibilities = ['public', 'private', 'anonymous'];

// Generate random report data
function generateReportData() {
  const category = categories[Math.floor(Math.random() * categories.length)];
  const visibility = visibilities[Math.floor(Math.random() * visibilities.length)];

  return {
    title: `Load Test Report - ${category} - ${Date.now()}`,
    description: `This is an automated load test report for category ${category}. Generated at ${new Date().toISOString()} to demonstrate auto-scaling capabilities of the Citizen Report distributed system.`,
    category: category,
    visibility: visibility,
    location: {
      lat: -6.8915 + (Math.random() * 0.1 - 0.05),
      lng: 107.6107 + (Math.random() * 0.1 - 0.05),
      address: `Test Location ${Math.floor(Math.random() * 100)}`,
    },
  };
}

// Main test function
export default function () {
  group('Report Submission Flow', function () {
    // Create a new report
    const reportData = generateReportData();

    const createStart = Date.now();
    const createResponse = http.post(
      `${BASE_URL}/api/reports`,
      JSON.stringify(reportData),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        tags: { name: 'CreateReport' },
      }
    );
    const createEnd = Date.now();

    const createSuccess = check(createResponse, {
      'create: status is 201': (r) => r.status === 201,
      'create: has report id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.id;
        } catch {
          return false;
        }
      },
      'create: response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    if (createSuccess) {
      reportCreated.add(1);
      createDuration.add(createEnd - createStart);
    } else {
      errorRate.add(1);
    }

    sleep(0.5);
  });

  group('Report Listing', function () {
    // List reports with pagination
    const listStart = Date.now();
    const listResponse = http.get(
      `${BASE_URL}/api/reports?page=1&limit=10`,
      {
        tags: { name: 'ListReports' },
      }
    );
    const listEnd = Date.now();

    const listSuccess = check(listResponse, {
      'list: status is 200': (r) => r.status === 200,
      'list: returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && Array.isArray(body.data);
        } catch {
          return false;
        }
      },
      'list: response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (listSuccess) {
      reportsFetched.add(1);
      listDuration.add(listEnd - listStart);
    } else {
      errorRate.add(1);
    }

    sleep(0.5);
  });

  // Random sleep between iterations (simulate real user behavior)
  sleep(Math.random() * 2);
}

// Setup function - runs once before the test
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  console.log('This test will demonstrate auto-scaling behavior');

  // Verify service is reachable
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`Service not healthy: ${healthCheck.status}`);
  }

  console.log('Service health check passed');
  return { startTime: new Date().toISOString() };
}

// Teardown function - runs once after the test
export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
  console.log(`Finished at: ${new Date().toISOString()}`);
}

// Summary handler - custom output
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}

// Text summary helper
function textSummary(data, options) {
  const lines = [];
  lines.push('');
  lines.push('='.repeat(60));
  lines.push('CITIZEN REPORT LOAD TEST SUMMARY');
  lines.push('='.repeat(60));
  lines.push('');

  if (data.metrics.http_reqs) {
    lines.push(`Total Requests: ${data.metrics.http_reqs.values.count}`);
    lines.push(`Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s`);
  }

  if (data.metrics.http_req_duration) {
    lines.push('');
    lines.push('Response Times:');
    lines.push(`  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
    lines.push(`  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
    lines.push(`  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms`);
  }

  if (data.metrics.reports_created) {
    lines.push('');
    lines.push(`Reports Created: ${data.metrics.reports_created.values.count}`);
  }

  if (data.metrics.http_req_failed) {
    lines.push(`Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}
