# ASR Purchase Order System - API Reference

**Version:** 1.0.0
**Last Updated:** 2026-01-12
**Base URL:** `https://asr-po.yourdomain.com/api`

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Core Endpoints](#core-endpoints)
4. [Purchase Order API](#purchase-order-api)
5. [Dashboard API](#dashboard-api)
6. [Reports API](#reports-api)
7. [User Management API](#user-management-api)
8. [Vendor Management API](#vendor-management-api)
9. [QuickBooks Integration API](#quickbooks-integration-api)
10. [Health and Monitoring API](#health-and-monitoring-api)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)
13. [SDKs and Code Examples](#sdks-and-code-examples)

---

## API Overview

### Architecture
The ASR Purchase Order System provides a comprehensive REST API built with Next.js API routes, offering programmatic access to all system functionality.

**Key Features:**
- RESTful design principles
- JSON request/response format
- Session-based authentication
- Role-based access control
- Comprehensive error handling
- Rate limiting protection
- Real-time data access

### Base URL
```
Production: https://asr-po.yourdomain.com/api
Staging: https://staging.asr-po.yourdomain.com/api
```

### API Conventions
- **HTTP Methods:** GET, POST, PUT, DELETE
- **Content Type:** `application/json`
- **Date Format:** ISO 8601 (`2024-01-12T14:30:00Z`)
- **Currency:** USD with 2 decimal places
- **ID Format:** UUID v4

### Response Format
All API responses follow a consistent structure:

**Success Response:**
```json
{
  "success": true,
  "data": {
    // Response payload
  },
  "meta": {
    "timestamp": "2024-01-12T14:30:00Z",
    "version": "1.0.0"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "meta": {
    "timestamp": "2024-01-12T14:30:00Z",
    "version": "1.0.0"
  }
}
```

---

## Authentication

### Session-Based Authentication
The ASR Purchase Order System uses session-based authentication with NextAuth.js.

#### Login
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@asr.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@asr.com",
      "name": "John Smith",
      "role": "DIVISION_LEADER",
      "division": "CH"
    },
    "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Session Management
Include the session token in request headers:

```http
Authorization: Bearer <sessionToken>
```

Or use cookie-based authentication (recommended for web applications):
```http
Cookie: next-auth.session-token=<sessionToken>
```

#### Logout
```http
POST /api/auth/signout
```

### Role-Based Access Control

| Role | Access Level | Permissions |
|------|--------------|-------------|
| **MAJORITY_OWNER** | Full | All endpoints, all data |
| **OPERATIONS_MANAGER** | Cross-division | All PO operations, reporting |
| **DIVISION_LEADER** | Division-scoped | Division POs, team reporting |
| **ACCOUNTING** | Financial | Financial data, QB integration |

### API Key Authentication (Future)
For system-to-system integration, API key authentication will be available:

```http
X-API-Key: your-api-key-here
```

---

## Core Endpoints

### Health Checks

#### Basic Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "metrics": {
      "users": 45,
      "vendors": 120,
      "activeProjects": 15
    },
    "timestamp": "2024-01-12T14:30:00Z",
    "version": "1.0.0"
  }
}
```

#### Database Health
```http
GET /api/health/database
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "connection": true,
    "queryTime": "25ms",
    "connectionPool": {
      "total": 20,
      "active": 3,
      "idle": 17
    }
  }
}
```

#### Cache Health
```http
GET /api/health/cache
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "redis": true,
    "fallback": true,
    "hitRate": 85.5,
    "latency": "2ms"
  }
}
```

#### Integration Health
```http
GET /api/health/integrations
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quickbooks": "connected",
    "email": "configured",
    "status": "healthy",
    "lastSync": "2024-01-12T14:25:00Z"
  }
}
```

---

## Purchase Order API

### List Purchase Orders
```http
GET /api/po/list
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (max: 100, default: 20)
- `status` (string): Filter by status
- `division` (string): Filter by division code
- `vendor` (string): Filter by vendor ID
- `dateFrom` (string): Start date (ISO format)
- `dateTo` (string): End date (ISO format)
- `search` (string): Search term for PO number, vendor name

**Example Request:**
```http
GET /api/po/list?status=PENDING&division=CH&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "purchaseOrders": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "poNumber": "65-CH-1234-ACME-001",
        "status": "PENDING",
        "totalAmount": 1250.00,
        "vendor": {
          "id": "vendor-id-123",
          "name": "ACME Supplies",
          "code": "ACME"
        },
        "project": {
          "id": "project-id-456",
          "code": "PROJ-2024-001",
          "name": "Sunrise Apartments"
        },
        "createdAt": "2024-01-12T10:30:00Z",
        "createdBy": {
          "id": "user-id-789",
          "name": "John Smith",
          "email": "john.smith@asr.com"
        }
      }
    ],
    "pagination": {
      "total": 125,
      "page": 1,
      "limit": 50,
      "pages": 3
    }
  }
}
```

### Get Purchase Order Details
```http
GET /api/po/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "poNumber": "65-CH-1234-ACME-001",
    "status": "PENDING",
    "totalAmount": 1250.00,
    "taxAmount": 109.38,
    "subtotal": 1140.62,
    "vendor": {
      "id": "vendor-id-123",
      "name": "ACME Supplies",
      "code": "ACME",
      "contactName": "Jane Doe",
      "contactEmail": "jane@acme.com",
      "contactPhone": "+1-555-0123"
    },
    "project": {
      "id": "project-id-456",
      "code": "PROJ-2024-001",
      "name": "Sunrise Apartments",
      "division": "CH"
    },
    "workOrder": {
      "id": "wo-id-789",
      "number": "WO-2024-1205",
      "title": "Kitchen Renovation",
      "budgetRemaining": 15750.00
    },
    "lineItems": [
      {
        "id": "line-item-1",
        "description": "Power drill with battery",
        "quantity": 1,
        "unitPrice": 120.00,
        "totalPrice": 120.00,
        "glCode": "65"
      },
      {
        "id": "line-item-2",
        "description": "Drill bits set (20pc)",
        "quantity": 2,
        "unitPrice": 45.00,
        "totalPrice": 90.00,
        "glCode": "65"
      }
    ],
    "approvals": [
      {
        "id": "approval-1",
        "action": "SUBMITTED",
        "actor": "John Smith",
        "timestamp": "2024-01-12T10:30:00Z",
        "comments": "Initial submission"
      }
    ],
    "createdAt": "2024-01-12T10:30:00Z",
    "updatedAt": "2024-01-12T10:35:00Z"
  }
}
```

### Create Purchase Order
```http
POST /api/po/create
Content-Type: application/json

{
  "projectId": "project-id-456",
  "workOrderId": "wo-id-789",
  "vendorId": "vendor-id-123",
  "glCode": "65",
  "deliveryDate": "2024-01-20",
  "specialInstructions": "Deliver to main office",
  "lineItems": [
    {
      "description": "Power drill with battery",
      "quantity": 1,
      "unitPrice": 120.00
    },
    {
      "description": "Drill bits set (20pc)",
      "quantity": 2,
      "unitPrice": 45.00
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "poNumber": "65-CH-1234-ACME-001",
    "status": "PENDING",
    "totalAmount": 1250.00,
    "message": "Purchase order created successfully and submitted for approval"
  }
}
```

### Update Purchase Order (Draft Only)
```http
PUT /api/po/{id}
Content-Type: application/json

{
  "deliveryDate": "2024-01-25",
  "specialInstructions": "Updated delivery instructions",
  "lineItems": [
    {
      "id": "line-item-1",
      "description": "Updated description",
      "quantity": 2,
      "unitPrice": 120.00
    }
  ]
}
```

### Approve Purchase Order
```http
POST /api/po/{id}/approve
Content-Type: application/json

{
  "comments": "Approved - within budget and project scope"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "APPROVED",
    "approvedBy": "Operations Manager",
    "approvedAt": "2024-01-12T14:30:00Z",
    "nextStep": "Accounting review and QuickBooks sync"
  }
}
```

### Reject Purchase Order
```http
POST /api/po/{id}/reject
Content-Type: application/json

{
  "reason": "Budget exceeded for this work order",
  "comments": "Please revise amounts or request budget increase"
}
```

### Delete Purchase Order (Draft Only)
```http
DELETE /api/po/{id}
```

---

## Dashboard API

### KPI Metrics
```http
GET /api/dashboards/kpi-metrics
```

**Query Parameters:**
- `division` (string): Filter by division code
- `dateRange` (string): Date range (30d, 90d, ytd)

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPOs": 156,
      "totalSpending": 485720.50,
      "averagePOValue": 3113.97,
      "pendingApprovals": 8
    },
    "trends": {
      "monthOverMonth": {
        "poCount": 12.5,
        "spending": 8.3,
        "averageValue": -3.1
      },
      "yearOverYear": {
        "poCount": 23.7,
        "spending": 15.2,
        "averageValue": -6.9
      }
    },
    "byStatus": {
      "PENDING": 8,
      "APPROVED": 12,
      "ISSUED": 125,
      "COMPLETED": 98,
      "REJECTED": 3
    },
    "byDivision": {
      "CH": 45,
      "PW": 38,
      "WS": 42,
      "LS": 31
    }
  }
}
```

### Division-Specific Dashboard
```http
GET /api/dashboards/division
```

**Query Parameters:**
- `division` (string): Division code (CH, PW, WS, LS)
- `dateRange` (string): Date range (30d, 90d, ytd)

**Response:**
```json
{
  "success": true,
  "data": {
    "division": {
      "code": "CH",
      "name": "Corporate Housing",
      "leader": "John Smith"
    },
    "metrics": {
      "totalPOs": 45,
      "totalSpending": 125340.75,
      "budgetUtilization": 67.2,
      "averageApprovalTime": 4.2
    },
    "topProjects": [
      {
        "code": "PROJ-2024-001",
        "name": "Sunrise Apartments",
        "poCount": 12,
        "totalSpending": 45600.00
      }
    ],
    "topVendors": [
      {
        "name": "ACME Supplies",
        "poCount": 8,
        "totalSpending": 23400.50
      }
    ],
    "recentActivity": [
      {
        "type": "PO_CREATED",
        "poNumber": "65-CH-1234-ACME-001",
        "amount": 1250.00,
        "timestamp": "2024-01-12T10:30:00Z"
      }
    ]
  }
}
```

### Cross-Division Analytics
```http
GET /api/dashboards/cross-division
```

**Response:**
```json
{
  "success": true,
  "data": {
    "companyMetrics": {
      "totalPOs": 156,
      "totalSpending": 485720.50,
      "activeDivisions": 4,
      "averageApprovalTime": 5.8
    },
    "divisionComparison": [
      {
        "division": "PW",
        "spending": 145250.00,
        "poCount": 38,
        "avgPoValue": 3822.37,
        "budgetUtilization": 78.5
      },
      {
        "division": "CH",
        "spending": 125340.75,
        "poCount": 45,
        "avgPoValue": 2785.35,
        "budgetUtilization": 67.2
      }
    ],
    "performanceMetrics": {
      "approvalEfficiency": 94.2,
      "budgetCompliance": 98.7,
      "vendorSatisfaction": 4.6
    }
  }
}
```

### Pending Approvals
```http
GET /api/dashboards/pending-approvals
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "poNumber": "65-CH-1234-ACME-001",
        "amount": 1250.00,
        "vendor": "ACME Supplies",
        "submittedBy": "John Smith",
        "submittedAt": "2024-01-12T10:30:00Z",
        "daysWaiting": 2,
        "urgency": "normal"
      }
    ],
    "summary": {
      "totalPending": 8,
      "totalValue": 45620.75,
      "averageWaitTime": 3.2,
      "overdueCount": 1
    }
  }
}
```

---

## Reports API

### Available Reports
```http
GET /api/reports
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "gl-analysis",
        "name": "GL Analysis Report",
        "description": "Financial categorization analysis",
        "category": "Financial"
      },
      {
        "id": "vendor-analysis",
        "name": "Vendor Analysis Report",
        "description": "Vendor performance and spending",
        "category": "Procurement"
      },
      {
        "id": "budget-vs-actual",
        "name": "Budget vs Actual Report",
        "description": "Project budget tracking",
        "category": "Financial"
      },
      {
        "id": "approval-bottleneck",
        "name": "Approval Bottleneck Analysis",
        "description": "Workflow efficiency analysis",
        "category": "Operations"
      },
      {
        "id": "po-summary",
        "name": "PO Summary Report",
        "description": "High-level PO statistics",
        "category": "Executive"
      },
      {
        "id": "project-details",
        "name": "Project Details Report",
        "description": "Project-specific spending",
        "category": "Project Management"
      }
    ]
  }
}
```

### GL Analysis Report
```http
GET /api/reports/gl-analysis
```

**Query Parameters:**
- `format` (string): json, pdf, excel, csv
- `dateFrom` (string): Start date
- `dateTo` (string): End date
- `division` (string): Filter by division
- `glCode` (string): Filter by GL code

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSpending": 485720.50,
      "opexSpending": 345600.25,
      "capexSpending": 140120.25,
      "taxableAmount": 425230.80,
      "reportPeriod": "2024-01-01 to 2024-01-12"
    },
    "byGLCode": [
      {
        "glCode": "55",
        "glAccountName": "Construction Materials",
        "category": "OpEx",
        "spending": 145250.75,
        "percentage": 29.9,
        "poCount": 45,
        "avgPoValue": 3228.91
      },
      {
        "glCode": "65",
        "glAccountName": "Equipment",
        "category": "CapEx",
        "spending": 98450.50,
        "percentage": 20.3,
        "poCount": 23,
        "avgPoValue": 4280.46
      }
    ],
    "trends": {
      "monthly": [
        {
          "month": "2024-01",
          "opex": 125340.75,
          "capex": 45620.25
        }
      ]
    }
  }
}
```

### Vendor Analysis Report
```http
GET /api/reports/vendor-analysis
```

**Query Parameters:**
- `format` (string): json, pdf, excel, csv
- `dateFrom` (string): Start date
- `dateTo` (string): End date
- `vendorType` (string): Filter by vendor type
- `minSpending` (number): Minimum spending threshold

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalVendors": 45,
      "activeVendors": 38,
      "totalSpending": 485720.50,
      "averageOrderValue": 3113.97
    },
    "topVendors": [
      {
        "id": "vendor-123",
        "name": "ACME Construction",
        "type": "General Contractor",
        "totalSpending": 85430.25,
        "poCount": 18,
        "avgPoValue": 4746.12,
        "paymentTerms": "Net 30",
        "performanceRating": 4.7
      }
    ],
    "byType": [
      {
        "type": "General Contractor",
        "vendorCount": 12,
        "totalSpending": 245680.75,
        "avgSpending": 20473.40
      }
    ],
    "paymentTermsAnalysis": [
      {
        "terms": "Net 30",
        "vendorCount": 28,
        "totalSpending": 342150.25,
        "percentage": 70.4
      }
    ]
  }
}
```

### Budget vs Actual Report
```http
GET /api/reports/budget-vs-actual
```

**Query Parameters:**
- `format` (string): json, pdf, excel, csv
- `division` (string): Filter by division
- `project` (string): Filter by project
- `year` (integer): Budget year

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalBudget": 1250000.00,
      "totalSpent": 485720.50,
      "totalCommitted": 125340.75,
      "utilization": 48.9,
      "variance": -638939.75
    },
    "byDivision": [
      {
        "division": "CH",
        "divisionName": "Corporate Housing",
        "budget": 350000.00,
        "spent": 125340.75,
        "committed": 35620.50,
        "utilization": 46.0,
        "variance": -189038.75,
        "status": "Under Budget"
      }
    ],
    "byProject": [
      {
        "projectCode": "PROJ-2024-001",
        "projectName": "Sunrise Apartments",
        "budget": 150000.00,
        "spent": 65340.25,
        "committed": 12450.50,
        "utilization": 51.9,
        "variance": -72209.25
      }
    ]
  }
}
```

### Generate Report (Async)
```http
POST /api/reports/generate
Content-Type: application/json

{
  "reportType": "vendor-analysis",
  "format": "pdf",
  "parameters": {
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31",
    "division": "CH"
  },
  "delivery": {
    "method": "email",
    "recipients": ["manager@asr.com"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "report-job-789",
    "status": "processing",
    "estimatedTime": "2-3 minutes",
    "statusUrl": "/api/reports/status/report-job-789"
  }
}
```

### Check Report Generation Status
```http
GET /api/reports/status/{jobId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "report-job-789",
    "status": "completed",
    "progress": 100,
    "downloadUrl": "/api/reports/download/report-job-789",
    "expiresAt": "2024-01-19T14:30:00Z"
  }
}
```

---

## User Management API

### List Users
```http
GET /api/users
```

**Query Parameters:**
- `page` (integer): Page number
- `limit` (integer): Items per page
- `role` (string): Filter by role
- `division` (string): Filter by division
- `active` (boolean): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "john.smith@asr.com",
        "name": "John Smith",
        "role": "DIVISION_LEADER",
        "division": "CH",
        "isActive": true,
        "lastLogin": "2024-01-12T09:15:00Z",
        "createdAt": "2024-01-01T08:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "pages": 3
    }
  }
}
```

### Get User Details
```http
GET /api/users/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.smith@asr.com",
    "name": "John Smith",
    "role": "DIVISION_LEADER",
    "division": {
      "id": "div-ch-123",
      "code": "CH",
      "name": "Corporate Housing"
    },
    "approvalLimit": 25000.00,
    "isActive": true,
    "lastLogin": "2024-01-12T09:15:00Z",
    "createdAt": "2024-01-01T08:00:00Z",
    "activitySummary": {
      "posCreated": 23,
      "posApproved": 67,
      "lastActivityAt": "2024-01-12T11:30:00Z"
    }
  }
}
```

### Create User (Admin Only)
```http
POST /api/users
Content-Type: application/json

{
  "email": "new.user@asr.com",
  "name": "New User",
  "role": "DIVISION_LEADER",
  "divisionId": "div-ch-123",
  "approvalLimit": 25000.00
}
```

### Update User (Admin Only)
```http
PUT /api/users/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "role": "OPERATIONS_MANAGER",
  "approvalLimit": 50000.00,
  "isActive": true
}
```

### User Activity Log
```http
GET /api/users/{id}/activity
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "activity-123",
        "action": "PO_APPROVED",
        "description": "Approved PO 65-CH-1234-ACME-001",
        "poId": "550e8400-e29b-41d4-a716-446655440000",
        "amount": 1250.00,
        "timestamp": "2024-01-12T14:30:00Z",
        "ipAddress": "192.168.1.100"
      }
    ]
  }
}
```

---

## Vendor Management API

### List Vendors
```http
GET /api/vendors
```

**Query Parameters:**
- `page` (integer): Page number
- `limit` (integer): Items per page
- `type` (string): Filter by vendor type
- `active` (boolean): Filter by active status
- `search` (string): Search vendor name/code

**Response:**
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "vendor-123",
        "vendorCode": "ACME001",
        "vendorName": "ACME Construction",
        "vendorType": "General Contractor",
        "contactName": "Jane Doe",
        "contactEmail": "jane@acme.com",
        "contactPhone": "+1-555-0123",
        "paymentTerms": "Net 30",
        "isActive": true,
        "totalSpending": 85430.25,
        "poCount": 18
      }
    ],
    "pagination": {
      "total": 120,
      "page": 1,
      "limit": 20,
      "pages": 6
    }
  }
}
```

### Get Vendor Details
```http
GET /api/vendors/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "vendor-123",
    "vendorCode": "ACME001",
    "vendorName": "ACME Construction",
    "vendorType": "General Contractor",
    "contactName": "Jane Doe",
    "contactEmail": "jane@acme.com",
    "contactPhone": "+1-555-0123",
    "address": {
      "line1": "123 Business Street",
      "line2": "Suite 100",
      "city": "San Diego",
      "state": "CA",
      "zipCode": "92101"
    },
    "paymentTerms": "Net 30",
    "taxId": "12-3456789",
    "isActive": true,
    "createdAt": "2023-05-15T10:00:00Z",
    "performance": {
      "totalSpending": 85430.25,
      "poCount": 18,
      "avgPoValue": 4746.12,
      "completionRate": 94.4,
      "onTimeDelivery": 88.9,
      "rating": 4.7
    },
    "recentPOs": [
      {
        "poNumber": "65-CH-1234-ACME-001",
        "amount": 1250.00,
        "status": "COMPLETED",
        "createdAt": "2024-01-10T10:30:00Z"
      }
    ]
  }
}
```

### Create Vendor
```http
POST /api/vendors
Content-Type: application/json

{
  "vendorName": "New Vendor LLC",
  "vendorType": "Supplier",
  "contactName": "Contact Person",
  "contactEmail": "contact@newvendor.com",
  "contactPhone": "+1-555-0987",
  "address": {
    "line1": "456 Supplier Ave",
    "city": "San Diego",
    "state": "CA",
    "zipCode": "92102"
  },
  "paymentTerms": "Net 30",
  "taxId": "98-7654321"
}
```

### Update Vendor
```http
PUT /api/vendors/{id}
Content-Type: application/json

{
  "contactName": "Updated Contact",
  "contactEmail": "updated@vendor.com",
  "paymentTerms": "Net 15",
  "isActive": true
}
```

### Vendor Performance Report
```http
GET /api/vendors/{id}/performance
```

**Query Parameters:**
- `dateFrom` (string): Start date
- `dateTo` (string): End date

**Response:**
```json
{
  "success": true,
  "data": {
    "vendorId": "vendor-123",
    "vendorName": "ACME Construction",
    "period": "2024-01-01 to 2024-01-31",
    "metrics": {
      "totalPOs": 8,
      "totalSpending": 45630.75,
      "avgPoValue": 5703.84,
      "completedPOs": 6,
      "pendingPOs": 2,
      "completionRate": 75.0,
      "onTimeDelivery": 83.3,
      "avgApprovalTime": 3.2
    },
    "poHistory": [
      {
        "poNumber": "65-CH-1234-ACME-001",
        "amount": 1250.00,
        "status": "COMPLETED",
        "createdAt": "2024-01-10T10:30:00Z",
        "completedAt": "2024-01-15T16:45:00Z"
      }
    ]
  }
}
```

---

## QuickBooks Integration API

### Authorization URL
```http
GET /api/quickbooks/auth-url
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://appcenter.intuit.com/connect/oauth2?client_id=...",
    "state": "random-state-token"
  }
}
```

### OAuth Callback (Internal)
```http
POST /api/quickbooks/callback
Content-Type: application/json

{
  "code": "authorization-code",
  "state": "random-state-token"
}
```

### Connection Status
```http
GET /api/quickbooks/connection-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "companyId": "123456789",
    "companyName": "ASR Inc",
    "tokenExpiration": "2024-07-12T14:30:00Z",
    "lastSync": "2024-01-12T13:45:00Z",
    "syncStatus": "healthy"
  }
}
```

### Test Connection
```http
GET /api/quickbooks/test-connection
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "responseTime": "245ms",
    "companyInfo": {
      "name": "ASR Inc",
      "fiscalYearStart": "January"
    },
    "lastTest": "2024-01-12T14:30:00Z"
  }
}
```

### Trigger Manual Sync
```http
POST /api/quickbooks/sync-now
Content-Type: application/json

{
  "syncType": "all",
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "syncJobId": "sync-job-456",
    "status": "started",
    "estimatedTime": "2-5 minutes",
    "statusUrl": "/api/quickbooks/sync-status/sync-job-456"
  }
}
```

### Sync Status
```http
GET /api/quickbooks/sync-status/{jobId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "sync-job-456",
    "status": "completed",
    "startedAt": "2024-01-12T14:30:00Z",
    "completedAt": "2024-01-12T14:33:15Z",
    "duration": "3m 15s",
    "recordsSynced": {
      "vendors": 5,
      "purchaseOrders": 12,
      "accounts": 0
    },
    "errors": []
  }
}
```

### Sync History
```http
GET /api/quickbooks/sync-history
```

**Query Parameters:**
- `limit` (integer): Number of sync records (max: 100)
- `status` (string): Filter by sync status

**Response:**
```json
{
  "success": true,
  "data": {
    "syncs": [
      {
        "id": "sync-123",
        "startedAt": "2024-01-12T14:30:00Z",
        "completedAt": "2024-01-12T14:33:15Z",
        "status": "completed",
        "recordsSynced": 12,
        "duration": "3m 15s"
      }
    ]
  }
}
```

### Refresh Token
```http
POST /api/quickbooks/refresh-token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenRefreshed": true,
    "newExpiration": "2024-07-12T14:30:00Z",
    "refreshedAt": "2024-01-12T14:30:00Z"
  }
}
```

---

## Health and Monitoring API

### System Performance Metrics
```http
GET /api/monitoring/performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "responseTime": {
        "average": 245,
        "p95": 450,
        "p99": 780
      },
      "throughput": {
        "requestsPerMinute": 45,
        "requestsPerHour": 2700
      },
      "errorRate": {
        "percentage": 0.8,
        "count": 12
      },
      "uptime": {
        "percentage": 99.95,
        "lastDowntime": "2024-01-10T03:15:00Z"
      }
    },
    "targets": {
      "responseTime": 500,
      "errorRate": 1.0,
      "uptime": 99.9
    },
    "status": "healthy"
  }
}
```

### Cache Metrics
```http
GET /api/monitoring/cache-metrics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "redis": {
      "connected": true,
      "memory": "125MB",
      "hitRate": 85.5,
      "missRate": 14.5,
      "latency": "2ms"
    },
    "fallback": {
      "active": true,
      "hitRate": 92.3,
      "memoryUsage": "45MB"
    },
    "overall": {
      "hitRate": 87.2,
      "totalRequests": 12450,
      "totalHits": 10856
    }
  }
}
```

### Error Rate Analysis
```http
GET /api/monitoring/errors
```

**Query Parameters:**
- `timeframe` (string): 1h, 24h, 7d, 30d
- `severity` (string): low, medium, high, critical

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalErrors": 45,
      "errorRate": 0.8,
      "timeframe": "24h"
    },
    "byType": [
      {
        "type": "ValidationError",
        "count": 23,
        "percentage": 51.1,
        "severity": "medium"
      },
      {
        "type": "DatabaseTimeout",
        "count": 12,
        "percentage": 26.7,
        "severity": "high"
      }
    ],
    "byEndpoint": [
      {
        "endpoint": "/api/po/create",
        "errorCount": 15,
        "errorRate": 2.3,
        "mostCommonError": "ValidationError"
      }
    ]
  }
}
```

### Database Performance
```http
GET /api/monitoring/database-performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connections": {
      "total": 20,
      "active": 3,
      "idle": 17,
      "utilization": 15.0
    },
    "performance": {
      "avgQueryTime": "25ms",
      "slowQueries": 2,
      "cacheHitRatio": 94.5
    },
    "health": {
      "status": "healthy",
      "lastCheck": "2024-01-12T14:30:00Z"
    }
  }
}
```

---

## Error Handling

### Error Response Format
All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific field with error",
      "value": "invalid value",
      "constraint": "validation constraint violated"
    },
    "timestamp": "2024-01-12T14:30:00Z",
    "requestId": "req-123456"
  }
}
```

### HTTP Status Codes
| Code | Meaning | Usage |
|------|---------|--------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (duplicate) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Temporary outage |

### Common Error Codes
| Code | Description | Resolution |
|------|-------------|------------|
| `VALIDATION_ERROR` | Request data validation failed | Check required fields and formats |
| `UNAUTHORIZED` | Authentication required | Provide valid session token |
| `FORBIDDEN` | Insufficient permissions | Contact admin for role access |
| `NOT_FOUND` | Resource not found | Verify ID exists and is accessible |
| `DUPLICATE_RESOURCE` | Resource already exists | Use unique identifiers |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry with backoff |
| `QB_CONNECTION_ERROR` | QuickBooks integration issue | Check QB connection status |
| `DATABASE_ERROR` | Database operation failed | Retry or contact support |

### Error Handling Best Practices
1. **Always check the `success` field** in responses
2. **Use `error.code`** for programmatic error handling
3. **Display `error.message`** to users for clarity
4. **Implement retry logic** for 5xx errors with exponential backoff
5. **Log `requestId`** for debugging and support

**Example Error Handling (JavaScript):**
```javascript
try {
  const response = await fetch('/api/po/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(poData)
  });

  const result = await response.json();

  if (!result.success) {
    switch (result.error.code) {
      case 'VALIDATION_ERROR':
        // Handle validation errors
        showValidationError(result.error.details);
        break;
      case 'UNAUTHORIZED':
        // Redirect to login
        redirectToLogin();
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // Implement retry with backoff
        setTimeout(() => retryRequest(), 5000);
        break;
      default:
        // Generic error handling
        showError(result.error.message);
    }
    return;
  }

  // Handle success
  handleSuccess(result.data);

} catch (error) {
  // Network or parsing error
  console.error('API request failed:', error);
  showError('Network error - please try again');
}
```

---

## Rate Limiting

### Rate Limit Policy
The ASR Purchase Order System implements rate limiting to ensure fair usage and system stability.

| User Type | Requests per Hour | Burst Limit |
|-----------|------------------|-------------|
| **Web Application** | 3600 | 100 per minute |
| **API Integration** | 1800 | 30 per minute |
| **Admin Operations** | 7200 | 200 per minute |

### Rate Limit Headers
Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 3600
X-RateLimit-Remaining: 3455
X-RateLimit-Reset: 1705072800
X-RateLimit-Window: 3600
```

### Rate Limit Exceeded Response
When rate limits are exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "limit": 3600,
      "window": 3600,
      "retryAfter": 300
    }
  }
}
```

### Best Practices for Rate Limiting
1. **Monitor rate limit headers** in your application
2. **Implement exponential backoff** when approaching limits
3. **Cache responses** when appropriate to reduce API calls
4. **Use webhooks** instead of polling when available
5. **Contact support** if you need higher limits for integration

**Example Rate Limit Handling:**
```javascript
async function makeAPIRequest(url, options = {}) {
  const response = await fetch(url, options);

  // Check rate limit headers
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
  const reset = parseInt(response.headers.get('X-RateLimit-Reset'));

  if (remaining < 100) {
    console.warn(`API rate limit low: ${remaining} requests remaining`);
  }

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
    console.log(`Rate limited. Retrying after ${retryAfter} seconds`);

    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return makeAPIRequest(url, options);
  }

  return response;
}
```

---

## SDKs and Code Examples

### JavaScript/Node.js SDK Example
```javascript
class ASRPurchaseOrderAPI {
  constructor(baseURL, sessionToken) {
    this.baseURL = baseURL;
    this.sessionToken = sessionToken;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.sessionToken}`,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    const result = await response.json();

    if (!result.success) {
      throw new APIError(result.error);
    }

    return result.data;
  }

  // Purchase Orders
  async listPurchaseOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/po/list?${query}`);
  }

  async getPurchaseOrder(id) {
    return this.request(`/po/${id}`);
  }

  async createPurchaseOrder(poData) {
    return this.request('/po/create', {
      method: 'POST',
      body: JSON.stringify(poData)
    });
  }

  async approvePurchaseOrder(id, comments) {
    return this.request(`/po/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments })
    });
  }

  // Reports
  async generateReport(reportType, format = 'json', params = {}) {
    const query = new URLSearchParams({ format, ...params }).toString();
    return this.request(`/reports/${reportType}?${query}`);
  }

  // Dashboard
  async getKPIMetrics(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/dashboards/kpi-metrics?${query}`);
  }

  // Health Checks
  async healthCheck() {
    return this.request('/health');
  }
}

class APIError extends Error {
  constructor(errorData) {
    super(errorData.message);
    this.code = errorData.code;
    this.details = errorData.details;
  }
}

// Usage Example
const api = new ASRPurchaseOrderAPI(
  'https://asr-po.yourdomain.com/api',
  'your-session-token'
);

try {
  // Create a purchase order
  const newPO = await api.createPurchaseOrder({
    projectId: 'project-123',
    workOrderId: 'wo-456',
    vendorId: 'vendor-789',
    glCode: '65',
    deliveryDate: '2024-01-20',
    lineItems: [
      {
        description: 'Power drill',
        quantity: 1,
        unitPrice: 120.00
      }
    ]
  });

  console.log('PO created:', newPO.poNumber);

  // Get KPI metrics
  const kpis = await api.getKPIMetrics({
    division: 'CH',
    dateRange: '30d'
  });

  console.log('Division spending:', kpis.summary.totalSpending);

} catch (error) {
  if (error instanceof APIError) {
    console.error(`API Error (${error.code}):`, error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  } else {
    console.error('Network error:', error);
  }
}
```

### Python SDK Example
```python
import requests
import json
from typing import Optional, Dict, Any

class ASRPurchaseOrderAPI:
    def __init__(self, base_url: str, session_token: str):
        self.base_url = base_url.rstrip('/')
        self.session_token = session_token
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {session_token}'
        })

    def request(self, endpoint: str, method: str = 'GET', data: Optional[Dict] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"

        response = self.session.request(
            method=method,
            url=url,
            json=data if data else None
        )

        result = response.json()

        if not result.get('success', False):
            raise APIError(result.get('error', {}))

        return result.get('data', {})

    # Purchase Orders
    def list_purchase_orders(self, **params) -> Dict[str, Any]:
        query_string = '&'.join(f"{k}={v}" for k, v in params.items())
        endpoint = f"/po/list?{query_string}" if query_string else "/po/list"
        return self.request(endpoint)

    def get_purchase_order(self, po_id: str) -> Dict[str, Any]:
        return self.request(f"/po/{po_id}")

    def create_purchase_order(self, po_data: Dict[str, Any]) -> Dict[str, Any]:
        return self.request('/po/create', method='POST', data=po_data)

    def approve_purchase_order(self, po_id: str, comments: str = '') -> Dict[str, Any]:
        return self.request(f"/po/{po_id}/approve", method='POST', data={'comments': comments})

    # Reports
    def generate_report(self, report_type: str, format: str = 'json', **params) -> Dict[str, Any]:
        params['format'] = format
        query_string = '&'.join(f"{k}={v}" for k, v in params.items())
        return self.request(f"/reports/{report_type}?{query_string}")

    # Dashboard
    def get_kpi_metrics(self, **params) -> Dict[str, Any]:
        query_string = '&'.join(f"{k}={v}" for k, v in params.items())
        endpoint = f"/dashboards/kpi-metrics?{query_string}" if query_string else "/dashboards/kpi-metrics"
        return self.request(endpoint)

    # Health Checks
    def health_check(self) -> Dict[str, Any]:
        return self.request('/health')

class APIError(Exception):
    def __init__(self, error_data: Dict[str, Any]):
        self.code = error_data.get('code', 'UNKNOWN_ERROR')
        self.message = error_data.get('message', 'Unknown error occurred')
        self.details = error_data.get('details', {})
        super().__init__(self.message)

# Usage Example
api = ASRPurchaseOrderAPI(
    'https://asr-po.yourdomain.com/api',
    'your-session-token'
)

try:
    # Create a purchase order
    new_po = api.create_purchase_order({
        'projectId': 'project-123',
        'workOrderId': 'wo-456',
        'vendorId': 'vendor-789',
        'glCode': '65',
        'deliveryDate': '2024-01-20',
        'lineItems': [
            {
                'description': 'Power drill',
                'quantity': 1,
                'unitPrice': 120.00
            }
        ]
    })

    print(f"PO created: {new_po['poNumber']}")

    # Get KPI metrics
    kpis = api.get_kpi_metrics(division='CH', dateRange='30d')
    print(f"Division spending: ${kpis['summary']['totalSpending']}")

except APIError as e:
    print(f"API Error ({e.code}): {e.message}")
    if e.details:
        print(f"Details: {e.details}")
except requests.RequestException as e:
    print(f"Network error: {e}")
```

### cURL Examples
```bash
# Authentication
curl -X POST https://asr-po.yourdomain.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@asr.com","password":"password123"}'

# List Purchase Orders
curl -X GET "https://asr-po.yourdomain.com/api/po/list?status=PENDING&limit=10" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Create Purchase Order
curl -X POST https://asr-po.yourdomain.com/api/po/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "projectId": "project-123",
    "workOrderId": "wo-456",
    "vendorId": "vendor-789",
    "glCode": "65",
    "deliveryDate": "2024-01-20",
    "lineItems": [
      {
        "description": "Power drill",
        "quantity": 1,
        "unitPrice": 120.00
      }
    ]
  }'

# Get KPI Metrics
curl -X GET "https://asr-po.yourdomain.com/api/dashboards/kpi-metrics?division=CH" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Generate Report (PDF)
curl -X GET "https://asr-po.yourdomain.com/api/reports/vendor-analysis?format=pdf&dateFrom=2024-01-01&dateTo=2024-01-31" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  --output vendor-analysis.pdf

# Health Check
curl -X GET https://asr-po.yourdomain.com/api/health

# QuickBooks Connection Test
curl -X GET https://asr-po.yourdomain.com/api/quickbooks/test-connection \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

---

**For Support and Questions:**

📧 **API Support:** api-support@yourdomain.com
📖 **Documentation:** https://asr-po.yourdomain.com/api/docs
🐛 **Bug Reports:** https://github.com/asr/po-system/issues
💬 **Developer Chat:** #api-developers on Slack

---

**End of API Reference**

*This API reference covers all available endpoints in the ASR Purchase Order System. For integration assistance or feature requests, contact the development team.*