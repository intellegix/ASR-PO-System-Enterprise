#!/usr/bin/env node

/**
 * ASR Purchase Order System - Export Functionality Testing
 * Phase 4C Performance Validation - PDF and Excel Export Testing
 *
 * Tests all 6 business reports for PDF and Excel export functionality
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  outputDir: './export-test-results',
  dateRange: {
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
};

// All 6 business reports to test
const REPORTS = [
  {
    name: 'PO Summary',
    endpoint: '/api/reports/po-summary',
    code: 'po-summary'
  },
  {
    name: 'Project Details',
    endpoint: '/api/reports/project-details',
    code: 'project-details'
  },
  {
    name: 'Vendor Analysis',
    endpoint: '/api/reports/vendor-analysis',
    code: 'vendor-analysis'
  },
  {
    name: 'GL Analysis',
    endpoint: '/api/reports/gl-analysis',
    code: 'gl-analysis'
  },
  {
    name: 'Budget vs Actual',
    endpoint: '/api/reports/budget-vs-actual',
    code: 'budget-vs-actual'
  },
  {
    name: 'Approval Bottleneck',
    endpoint: '/api/reports/approval-bottleneck',
    code: 'approval-bottleneck'
  }
];

// Export formats to test
const EXPORT_FORMATS = ['csv', 'pdf', 'excel'];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createOutputDirectory() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    log(`📁 Created output directory: ${CONFIG.outputDir}`, 'blue');
  }
}

function makeRequest(url, format = 'json') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: url,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ASR-Export-Tester/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          contentLength: data.length
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testReportExport(report, format) {
  const testName = `${report.name} (${format.toUpperCase()})`;

  try {
    log(`🧪 Testing ${testName}...`, 'blue');

    // Construct URL with format parameter
    const url = `${report.endpoint}?format=${format}&startDate=${CONFIG.dateRange.startDate}&endDate=${CONFIG.dateRange.endDate}`;

    const startTime = Date.now();
    const response = await makeRequest(url, format);
    const duration = Date.now() - startTime;

    // Check response status
    if (response.statusCode !== 200) {
      log(`❌ ${testName}: HTTP ${response.statusCode}`, 'red');
      return {
        report: report.name,
        format: format,
        success: false,
        error: `HTTP ${response.statusCode}`,
        duration: duration
      };
    }

    // Check content type based on format
    const expectedContentTypes = {
      csv: 'text/csv',
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const expectedContentType = expectedContentTypes[format] || 'application/json';
    const actualContentType = response.headers['content-type'];

    if (format !== 'json' && !actualContentType?.includes(expectedContentType)) {
      log(`⚠️  ${testName}: Unexpected content type: ${actualContentType}`, 'yellow');
    }

    // Check content length
    if (response.contentLength < 100) {
      log(`⚠️  ${testName}: Suspiciously small file size: ${response.contentLength} bytes`, 'yellow');
    }

    // Save file for manual inspection
    if (format !== 'json') {
      const fileExtension = format === 'excel' ? 'xlsx' : format;
      const filename = `${report.code}-test.${fileExtension}`;
      const filepath = path.join(CONFIG.outputDir, filename);

      fs.writeFileSync(filepath, response.data, 'binary');
      log(`💾 Saved test file: ${filename} (${response.contentLength} bytes)`, 'green');
    }

    // Performance check
    const performanceThresholds = {
      csv: 5000,   // 5 seconds for CSV
      pdf: 15000,  // 15 seconds for PDF
      excel: 10000 // 10 seconds for Excel
    };

    const threshold = performanceThresholds[format] || 10000;
    const performanceStatus = duration < threshold ? '✅' : '⚠️';

    log(`${performanceStatus} ${testName}: ${duration}ms (threshold: ${threshold}ms)`,
        duration < threshold ? 'green' : 'yellow');

    return {
      report: report.name,
      format: format,
      success: true,
      duration: duration,
      fileSize: response.contentLength,
      contentType: actualContentType
    };

  } catch (error) {
    log(`❌ ${testName}: ${error.message}`, 'red');
    return {
      report: report.name,
      format: format,
      success: false,
      error: error.message,
      duration: null
    };
  }
}

async function testServerHealth() {
  try {
    log('🔍 Checking server health...', 'blue');
    const response = await makeRequest('/api/health');

    if (response.statusCode === 200) {
      log('✅ Server is healthy and accessible', 'green');
      return true;
    } else {
      log(`❌ Server health check failed: HTTP ${response.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Cannot reach server: ${error.message}`, 'red');
    log('   Make sure the development server is running:', 'yellow');
    log('   cd web && npm run dev', 'yellow');
    return false;
  }
}

async function runExportTests() {
  log('🚀 ASR Purchase Order System - Export Functionality Testing', 'bold');
  log('================================================================', 'blue');
  log('Phase 4C Performance Validation - PDF and Excel Export Testing\n', 'blue');

  // Create output directory
  createOutputDirectory();

  // Check server health first
  const serverHealthy = await testServerHealth();
  if (!serverHealthy) {
    log('\n❌ Server not accessible. Cannot proceed with export testing.', 'red');
    process.exit(1);
  }

  const results = [];
  let totalTests = 0;
  let successfulTests = 0;

  log('\n📊 Testing Export Functionality for All Business Reports:', 'bold');
  log('=======================================================\n', 'blue');

  // Test each report with each format
  for (const report of REPORTS) {
    log(`📈 Testing ${report.name} Report:`, 'bold');

    for (const format of EXPORT_FORMATS) {
      totalTests++;
      const result = await testReportExport(report, format);
      results.push(result);

      if (result.success) {
        successfulTests++;
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    log(''); // Empty line between reports
  }

  // Generate summary report
  log('\n📋 EXPORT TESTING SUMMARY:', 'bold');
  log('==========================', 'blue');
  log(`Total Tests: ${totalTests}`);
  log(`Successful: ${successfulTests}`, successfulTests === totalTests ? 'green' : 'yellow');
  log(`Failed: ${totalTests - successfulTests}`, totalTests - successfulTests === 0 ? 'green' : 'red');
  log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%\n`);

  // Performance summary
  const performanceIssues = results.filter(r => {
    const thresholds = { csv: 5000, pdf: 15000, excel: 10000 };
    return r.success && r.duration > (thresholds[r.format] || 10000);
  });

  if (performanceIssues.length > 0) {
    log('⚠️  Performance Issues:', 'yellow');
    performanceIssues.forEach(issue => {
      log(`   ${issue.report} (${issue.format}): ${issue.duration}ms`, 'yellow');
    });
    log('');
  }

  // Format-specific results
  for (const format of EXPORT_FORMATS) {
    const formatResults = results.filter(r => r.format === format);
    const formatSuccess = formatResults.filter(r => r.success).length;
    log(`${format.toUpperCase()} Export: ${formatSuccess}/${formatResults.length} reports`,
        formatSuccess === formatResults.length ? 'green' : 'red');
  }

  // Save detailed results
  const detailedResults = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      successRate: ((successfulTests / totalTests) * 100).toFixed(1)
    },
    results: results,
    performanceIssues: performanceIssues
  };

  const resultsFile = path.join(CONFIG.outputDir, 'export-test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(detailedResults, null, 2));

  log(`\n📄 Detailed results saved to: ${resultsFile}`, 'blue');
  log(`📁 Test files saved to: ${CONFIG.outputDir}`, 'blue');

  if (successfulTests === totalTests) {
    log('\n🎉 All export tests passed successfully!', 'green');
  } else {
    log('\n⚠️  Some export tests failed. Check the results above.', 'yellow');
  }
}

// Run the tests
runExportTests().catch(error => {
  log(`\n💥 Test execution failed: ${error.message}`, 'red');
  process.exit(1);
});