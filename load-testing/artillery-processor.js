const { performance } = require('perf_hooks');

/**
 * Artillery.js custom processor for ASR Purchase Order System load testing
 * Provides custom metrics, data generation, and response validation
 */

// Performance tracking
const performanceMetrics = {
  requestCounts: new Map(),
  responseTimes: [],
  errorCounts: new Map(),
  customMetrics: new Map(),
};

/**
 * Generate realistic test data for PO creation
 */
function generatePOData(context, events, done) {
  // Generate realistic line items
  const itemCount = Math.floor(Math.random() * 5) + 1; // 1-5 items
  const lineItems = [];

  const sampleDescriptions = [
    'Office Supplies - Pens and Paper',
    'Construction Materials - Steel Beams',
    'Software License - Annual Subscription',
    'Equipment Rental - Excavator',
    'Professional Services - Consulting',
    'Maintenance Supplies - HVAC Parts',
    'Safety Equipment - Hard Hats and Vests',
    'Telecommunications - Phone Service',
    'Transportation - Delivery Service',
    'Utilities - Electrical Installation'
  ];

  const glAccounts = [
    { number: '6000', name: 'Cost of Goods Sold', taxable: false },
    { number: '6100', name: 'Materials and Supplies', taxable: true },
    { number: '6200', name: 'Equipment Rental', taxable: true },
    { number: '6300', name: 'Professional Services', taxable: false },
    { number: '6400', name: 'Utilities', taxable: true },
    { number: '6500', name: 'Maintenance and Repairs', taxable: true },
    { number: '7000', name: 'Operating Expenses', taxable: true },
    { number: '7100', name: 'Administrative Costs', taxable: false },
  ];

  for (let i = 0; i < itemCount; i++) {
    const glAccount = glAccounts[Math.floor(Math.random() * glAccounts.length)];
    const quantity = Math.floor(Math.random() * 100) + 1;
    const unitPrice = (Math.random() * 1000 + 10).toFixed(2);

    lineItems.push({
      description: sampleDescriptions[Math.floor(Math.random() * sampleDescriptions.length)],
      quantity: quantity.toString(),
      unit_price: unitPrice,
      total_amount: (quantity * parseFloat(unitPrice)).toFixed(2),
      gl_account_number: glAccount.number,
      gl_account_name: glAccount.name,
      is_taxable: glAccount.taxable,
      work_order_number: `WO-${Math.floor(Math.random() * 10000)}`,
      notes: `Load test item generated at ${new Date().toISOString()}`
    });
  }

  // Set variables for the test
  context.vars.lineItems = lineItems;
  context.vars.totalAmount = lineItems.reduce((sum, item) =>
    sum + parseFloat(item.total_amount), 0).toFixed(2);
  context.vars.requestId = `load-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return done();
}

/**
 * Generate realistic search and filter parameters for reports
 */
function generateReportParams(context, events, done) {
  const today = new Date();
  const startDates = [
    new Date(today.getFullYear(), 0, 1), // Start of year
    new Date(today.getFullYear(), today.getMonth() - 3, 1), // 3 months ago
    new Date(today.getFullYear(), today.getMonth() - 1, 1), // 1 month ago
    new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
  ];

  const startDate = startDates[Math.floor(Math.random() * startDates.length)];
  const endDate = new Date(Math.min(today.getTime(), startDate.getTime() + 90 * 24 * 60 * 60 * 1000));

  context.vars.reportStartDate = startDate.toISOString().split('T')[0];
  context.vars.reportEndDate = endDate.toISOString().split('T')[0];

  // Randomly include filters
  if (Math.random() < 0.3) {
    context.vars.divisionFilter = context.vars.divisionIds[Math.floor(Math.random() * context.vars.divisionIds.length)];
  }

  if (Math.random() < 0.2) {
    context.vars.minAmount = Math.floor(Math.random() * 1000);
  }

  return done();
}

/**
 * Validate dashboard response structure
 */
function validateDashboardResponse(requestParams, response, context, ee, next) {
  const startTime = performance.now();

  try {
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);

      // Validate required dashboard fields
      const requiredFields = ['summary', 'kpis', 'pendingApprovals'];
      const missingFields = requiredFields.filter(field => !data.hasOwnProperty(field));

      if (missingFields.length > 0) {
        ee.emit('counter', 'dashboard.validation.missing_fields', 1);
        console.error(`Dashboard validation failed: missing fields ${missingFields.join(', ')}`);
      } else {
        ee.emit('counter', 'dashboard.validation.success', 1);

        // Track KPI metrics
        if (data.kpis) {
          ee.emit('histogram', 'dashboard.kpi.pending_count', data.kpis.pendingApprovalCount || 0);
          ee.emit('histogram', 'dashboard.kpi.monthly_spend', data.kpis.currentMonthSpend || 0);
        }
      }
    } else if (response.statusCode === 403) {
      ee.emit('counter', 'dashboard.access.forbidden', 1);
    } else {
      ee.emit('counter', 'dashboard.error.other', 1);
    }
  } catch (error) {
    ee.emit('counter', 'dashboard.validation.parse_error', 1);
    console.error('Dashboard response validation error:', error.message);
  }

  const duration = performance.now() - startTime;
  ee.emit('histogram', 'dashboard.validation_time', duration);

  return next();
}

/**
 * Validate report response structure and performance
 */
function validateReportResponse(requestParams, response, context, ee, next) {
  const startTime = performance.now();

  try {
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);

      // Track report performance metrics
      const responseSize = Buffer.byteLength(response.body, 'utf8');
      ee.emit('histogram', 'report.response_size_bytes', responseSize);

      // Validate report structure
      if (data.summary && data.generatedAt) {
        ee.emit('counter', 'report.validation.success', 1);

        // Track specific report metrics
        if (data.summary.totalPOs !== undefined) {
          ee.emit('histogram', 'report.data.total_pos', data.summary.totalPOs);
        }
        if (data.summary.totalValue !== undefined) {
          ee.emit('histogram', 'report.data.total_value', data.summary.totalValue);
        }
      } else {
        ee.emit('counter', 'report.validation.invalid_structure', 1);
      }
    } else if (response.statusCode === 403) {
      ee.emit('counter', 'report.access.forbidden', 1);
    } else {
      ee.emit('counter', 'report.error.other', 1);
    }
  } catch (error) {
    ee.emit('counter', 'report.validation.parse_error', 1);
    console.error('Report response validation error:', error.message);
  }

  const duration = performance.now() - startTime;
  ee.emit('histogram', 'report.validation_time', duration);

  return next();
}

/**
 * Track custom performance metrics
 */
function trackPerformanceMetrics(requestParams, response, context, ee, next) {
  const endpoint = requestParams.url.replace(context.target, '').split('?')[0];
  const method = requestParams.method || 'GET';
  const key = `${method} ${endpoint}`;

  // Track request counts
  const currentCount = performanceMetrics.requestCounts.get(key) || 0;
  performanceMetrics.requestCounts.set(key, currentCount + 1);

  // Track response times
  if (response.timings && response.timings.response) {
    performanceMetrics.responseTimes.push({
      endpoint: key,
      duration: response.timings.response,
      timestamp: Date.now(),
      statusCode: response.statusCode,
    });

    ee.emit('histogram', `endpoint.${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}.response_time`, response.timings.response);
  }

  // Track errors
  if (response.statusCode >= 400) {
    const errorKey = `${key}_${response.statusCode}`;
    const currentErrorCount = performanceMetrics.errorCounts.get(errorKey) || 0;
    performanceMetrics.errorCounts.set(errorKey, currentErrorCount + 1);

    ee.emit('counter', `error.${response.statusCode}`, 1);
  }

  // Track memory usage periodically
  if (Math.random() < 0.1) { // 10% sampling
    const memUsage = process.memoryUsage();
    ee.emit('histogram', 'system.memory.rss', memUsage.rss);
    ee.emit('histogram', 'system.memory.heap_used', memUsage.heapUsed);
  }

  return next();
}

/**
 * Log performance summary at the end of test
 */
function logPerformanceSummary(context, ee, next) {
  console.log('\n=== PERFORMANCE SUMMARY ===');

  // Most requested endpoints
  const sortedRequests = Array.from(performanceMetrics.requestCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log('\nMost Requested Endpoints:');
  sortedRequests.slice(0, 10).forEach(([endpoint, count]) => {
    console.log(`  ${endpoint}: ${count} requests`);
  });

  // Average response times by endpoint
  const responseTimesByEndpoint = new Map();
  performanceMetrics.responseTimes.forEach(({ endpoint, duration }) => {
    if (!responseTimesByEndpoint.has(endpoint)) {
      responseTimesByEndpoint.set(endpoint, []);
    }
    responseTimesByEndpoint.get(endpoint).push(duration);
  });

  console.log('\nAverage Response Times:');
  Array.from(responseTimesByEndpoint.entries()).forEach(([endpoint, times]) => {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
    console.log(`  ${endpoint}: avg ${Math.round(avg)}ms, p95 ${Math.round(p95)}ms`);
  });

  // Error summary
  if (performanceMetrics.errorCounts.size > 0) {
    console.log('\nError Summary:');
    Array.from(performanceMetrics.errorCounts.entries()).forEach(([error, count]) => {
      console.log(`  ${error}: ${count} occurrences`);
    });
  }

  console.log('\n=== END SUMMARY ===\n');

  return next();
}

/**
 * Generate authentication token for different user types
 */
function generateAuthToken(context, events, done) {
  // Simulate different user roles for realistic load testing
  const userRoles = [
    { email: 'operations.user@asr.com', role: 'OPERATIONS_MANAGER', weight: 40 },
    { email: 'division.leader@asr.com', role: 'DIVISION_LEADER', weight: 30 },
    { email: 'accounting.user@asr.com', role: 'ACCOUNTING', weight: 20 },
    { email: 'majority.owner@asr.com', role: 'MAJORITY_OWNER', weight: 10 },
  ];

  // Weighted random selection
  const totalWeight = userRoles.reduce((sum, user) => sum + user.weight, 0);
  let random = Math.random() * totalWeight;

  for (const user of userRoles) {
    random -= user.weight;
    if (random <= 0) {
      context.vars.testUserEmail = user.email;
      context.vars.testUserRole = user.role;
      break;
    }
  }

  return done();
}

module.exports = {
  generatePOData,
  generateReportParams,
  validateDashboardResponse,
  validateReportResponse,
  trackPerformanceMetrics,
  logPerformanceSummary,
  generateAuthToken,
};