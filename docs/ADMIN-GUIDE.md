# ASR Purchase Order System - Administrative Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-12
**Target Audience:** System Administrators, IT Staff, Management

---

## Table of Contents

1. [Administrative Overview](#administrative-overview)
2. [User Management](#user-management)
3. [Division Management](#division-management)
4. [Vendor Management](#vendor-management)
5. [GL Account Configuration](#gl-account-configuration)
6. [Budget and Approval Configuration](#budget-and-approval-configuration)
7. [QuickBooks Integration Setup](#quickbooks-integration-setup)
8. [System Monitoring](#system-monitoring)
9. [Security and Compliance](#security-and-compliance)
10. [Data Management](#data-management)
11. [Performance Management](#performance-management)
12. [Administrative Procedures](#administrative-procedures)

---

## Administrative Overview

### System Administration Scope

The ASR Purchase Order System requires ongoing administrative management across several key areas:

**Primary Administrative Functions:**
- User account management and role assignments
- Division configuration and leadership assignments
- Vendor database maintenance and approval workflows
- GL account mapping and financial configuration
- Approval workflow and budget limit management
- QuickBooks integration setup and maintenance
- System monitoring and performance optimization
- Security policy enforcement and compliance

### Administrative Roles and Responsibilities

| Administrative Role | Primary Responsibilities | System Access |
|-------------------|-------------------------|---------------|
| **System Administrator** | Technical configuration, user management, system monitoring | Full system access |
| **Financial Administrator** | GL accounts, QuickBooks integration, financial policies | Financial configuration |
| **Operations Administrator** | Workflows, approval processes, vendor management | Operations configuration |
| **Security Administrator** | Access controls, audit compliance, security policies | Security and audit access |

### Administrative Access Requirements

**System Administrator Access:**
- Direct database access (PostgreSQL)
- Application configuration files
- Environment variable management
- Docker container management
- Log file access and monitoring

**Application-Level Administration:**
- Admin user role in application
- QuickBooks integration credentials
- SMTP configuration access
- Monitoring system credentials
- Backup system access

---

## User Management

### User Account Lifecycle

#### User Account Creation

**Step 1: Prepare User Information**
Required information for new users:
- Full name and email address (ASR domain)
- Division assignment
- Role designation
- Manager/supervisor information
- Start date and access requirements

**Step 2: Create User Account**
```sql
-- Database method (direct SQL)
INSERT INTO users (
    id, email, name, role, division_id,
    is_active, created_at, updated_at
) VALUES (
    uuid_generate_v4(),
    'new.user@asr.com',
    'New User Name',
    'DIVISION_LEADER',
    (SELECT id FROM divisions WHERE division_code = 'CH'),
    true,
    NOW(),
    NOW()
);
```

**Step 3: Configure Role-Specific Settings**
For Division Leaders, also create division_leaders entry:
```sql
INSERT INTO division_leaders (
    id, user_id, name, email, phone,
    division_code, division_id, approval_limit,
    is_active, created_at, updated_at
) VALUES (
    uuid_generate_v4(),
    (SELECT id FROM users WHERE email = 'new.user@asr.com'),
    'New User Name',
    'new.user@asr.com',
    '+1-555-0123',
    'CH',
    (SELECT id FROM divisions WHERE division_code = 'CH'),
    25000.00,
    true,
    NOW(),
    NOW()
);
```

#### User Role Management

**Role Hierarchy and Permissions:**

```
MAJORITY_OWNER (Executive Level)
├── Full system access
├── Cross-division visibility
├── User management capabilities
├── System configuration access
└── All report access

OPERATIONS_MANAGER (Management Level)
├── Cross-division PO oversight
├── High-value PO approvals ($25K+)
├── Vendor management
├── Workflow optimization
└── Performance reporting

DIVISION_LEADER (Department Level)
├── Division-specific PO creation
├── Team PO approvals (up to $25K)
├── Division reporting
├── Budget management
└── Team oversight

ACCOUNTING (Financial Level)
├── Financial oversight
├── GL account management
├── QuickBooks integration
├── Financial reporting
└── Compliance monitoring
```

**Role Assignment Procedures:**
1. **Verify Authorization:** Confirm role assignment with HR and management
2. **Check Prerequisites:** Ensure user has appropriate division assignment
3. **Update Database:** Modify user record with new role
4. **Configure Role-Specific Access:** Set up additional tables if needed
5. **Notify Stakeholders:** Inform relevant managers of role changes
6. **Audit Documentation:** Record role change in audit log

#### User Deactivation Process

**Step 1: Prepare for Deactivation**
- Verify deactivation authorization from management
- Identify any pending POs requiring reassignment
- Check for active approvals in workflow
- Backup user's activity history

**Step 2: Reassign Active Items**
```sql
-- Reassign pending POs to another division leader
UPDATE po_headers
SET division_leader_id = (SELECT id FROM division_leaders
                         WHERE division_code = 'CH' AND is_active = true
                         LIMIT 1)
WHERE division_leader_id = (SELECT dl.id FROM division_leaders dl
                          JOIN users u ON dl.user_id = u.id
                          WHERE u.email = 'departing.user@asr.com');

-- Update any pending approvals
UPDATE po_approvals
SET actor_user_id = (SELECT id FROM users
                    WHERE role = 'OPERATIONS_MANAGER'
                    AND is_active = true LIMIT 1)
WHERE actor_user_id = (SELECT id FROM users
                      WHERE email = 'departing.user@asr.com')
AND status_after IS NULL;
```

**Step 3: Deactivate Account**
```sql
-- Deactivate user account
UPDATE users
SET is_active = false,
    deactivated_at = NOW(),
    deactivated_by = 'admin@asr.com'
WHERE email = 'departing.user@asr.com';

-- Deactivate division leader role if applicable
UPDATE division_leaders
SET is_active = false,
    updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'departing.user@asr.com');
```

### User Access Administration

#### Password Management

**Password Policy Configuration:**
- Minimum length: 12 characters
- Required complexity: Upper/lower case, numbers, symbols
- Expiration: 90 days
- History: Cannot reuse last 5 passwords
- Account lockout: 5 failed attempts

**Password Reset Procedures:**
1. **User Self-Service:** "Forgot Password" link on login page
2. **Administrative Reset:** Direct database password hash update
3. **Emergency Reset:** Temporary password with forced change

#### Session Management

**Session Configuration:**
```javascript
// Session settings in application configuration
const sessionConfig = {
  maxAge: 8 * 60 * 60 * 1000,        // 8 hours
  rolling: true,                      // Extend on activity
  secure: true,                       // HTTPS only
  httpOnly: true,                     // No JavaScript access
  sameSite: 'strict'                  // CSRF protection
};
```

**Session Monitoring:**
```sql
-- Check active sessions
SELECT
    u.email,
    u.role,
    s.created_at as login_time,
    s.last_activity,
    s.ip_address
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity DESC;
```

#### Multi-Factor Authentication (Future Enhancement)

**Planned MFA Implementation:**
- TOTP-based authentication (Google Authenticator, Authy)
- SMS backup for emergency access
- Admin override capability for lost devices
- Role-based MFA requirements

### User Activity Monitoring

#### Access Logging
```sql
-- User activity audit query
SELECT
    u.email,
    pa.action,
    pa.timestamp,
    pa.ip_address,
    pa.user_agent,
    po.po_number
FROM po_approvals pa
JOIN users u ON pa.actor_user_id = u.id
LEFT JOIN po_headers po ON pa.po_id = po.id
WHERE pa.timestamp > NOW() - INTERVAL '30 days'
ORDER BY pa.timestamp DESC;
```

#### Suspicious Activity Detection
```sql
-- Detect unusual activity patterns
WITH user_activity AS (
    SELECT
        actor_user_id,
        COUNT(*) as action_count,
        COUNT(DISTINCT ip_address) as unique_ips,
        MIN(timestamp) as first_action,
        MAX(timestamp) as last_action
    FROM po_approvals
    WHERE timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY actor_user_id
)
SELECT
    u.email,
    ua.action_count,
    ua.unique_ips,
    ua.first_action,
    ua.last_action
FROM user_activity ua
JOIN users u ON ua.actor_user_id = u.id
WHERE ua.action_count > 50 OR ua.unique_ips > 3;
```

---

## Division Management

### Division Configuration

#### ASR Division Structure
The ASR Purchase Order System supports the following divisions:

| Division Code | Division Name | Cost Center | QB Class | Status |
|--------------|---------------|-------------|----------|--------|
| **CH** | Corporate Housing | 100 | CH-Housing | Active |
| **PW** | Property Works | 200 | PW-Property | Active |
| **WS** | West Solutions | 300 | WS-West | Active |
| **LS** | Lifestyle Solutions | 400 | LS-Lifestyle | Active |

#### Creating New Divisions

**Step 1: Plan Division Setup**
Required information:
- Division code (2-character identifier)
- Full division name
- Cost center prefix for accounting
- QuickBooks class name
- Initial division leader assignment

**Step 2: Create Division Record**
```sql
INSERT INTO divisions (
    id, division_name, division_code,
    qb_class_name, cost_center_prefix,
    is_active, created_at, updated_at
) VALUES (
    uuid_generate_v4(),
    'New Division Name',
    'ND',
    'ND-NewDiv',
    '500',
    true,
    NOW(),
    NOW()
);
```

**Step 3: Configure Work Order Sequences**
```sql
INSERT INTO work_order_sequences (
    id, division_id, current_sequence,
    year, created_at, updated_at
) VALUES (
    uuid_generate_v4(),
    (SELECT id FROM divisions WHERE division_code = 'ND'),
    1000,
    EXTRACT(YEAR FROM NOW()),
    NOW(),
    NOW()
);
```

#### Division Leader Assignment

**Requirements for Division Leaders:**
- Must be assigned to the specific division
- Requires approval limit setting (typically $25,000)
- Must have valid contact information
- Should have appropriate PO creation training

**Assignment Process:**
```sql
-- First, ensure user exists and is assigned to division
UPDATE users
SET division_id = (SELECT id FROM divisions WHERE division_code = 'CH')
WHERE email = 'leader@asr.com';

-- Create division leader record
INSERT INTO division_leaders (
    id, user_id, name, email, phone,
    division_code, division_id, qb_class_name,
    approval_limit, is_active, created_at, updated_at
) VALUES (
    uuid_generate_v4(),
    (SELECT id FROM users WHERE email = 'leader@asr.com'),
    'Division Leader Name',
    'leader@asr.com',
    '+1-555-0123',
    'CH',
    (SELECT id FROM divisions WHERE division_code = 'CH'),
    'CH-Housing',
    25000.00,
    true,
    NOW(),
    NOW()
);
```

### Division Performance Monitoring

#### Key Performance Indicators
```sql
-- Division performance dashboard query
SELECT
    d.division_name,
    d.division_code,
    COUNT(po.id) as total_pos,
    SUM(po.total_amount) as total_spending,
    AVG(po.total_amount) as avg_po_amount,
    COUNT(CASE WHEN po.status = 'PENDING' THEN 1 END) as pending_pos,
    COUNT(CASE WHEN po.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as pos_last_30_days
FROM divisions d
LEFT JOIN po_headers po ON d.id = po.division_id
WHERE d.is_active = true
GROUP BY d.id, d.division_name, d.division_code
ORDER BY total_spending DESC;
```

#### Budget Monitoring
```sql
-- Division budget utilization tracking
WITH division_budgets AS (
    SELECT
        division_id,
        SUM(total_amount) as spent_amount
    FROM po_headers
    WHERE status IN ('APPROVED', 'ISSUED')
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    GROUP BY division_id
)
SELECT
    d.division_name,
    COALESCE(db.spent_amount, 0) as spent_ytd,
    -- Note: Budget amounts would come from separate budget table
    -- This is placeholder for budget tracking
    1000000 as annual_budget,
    ROUND(COALESCE(db.spent_amount, 0) / 1000000 * 100, 2) as budget_utilization_pct
FROM divisions d
LEFT JOIN division_budgets db ON d.id = db.division_id
WHERE d.is_active = true;
```

### Division Workflow Management

#### Approval Hierarchy per Division
```sql
-- View current approval hierarchy
SELECT
    d.division_name,
    dl.name as division_leader,
    dl.approval_limit,
    dl.email,
    dl.phone,
    u.last_login
FROM divisions d
JOIN division_leaders dl ON d.id = dl.division_id
JOIN users u ON dl.user_id = u.id
WHERE d.is_active = true AND dl.is_active = true
ORDER BY d.division_name;
```

#### Division-Specific Configurations

**Approval Limits by Division:**
- Default division leader limit: $25,000
- Can be customized per division leader
- Operations manager approval required over limit
- Majority owner approval for strategic purchases

**Work Order Numbering:**
```sql
-- Check work order sequences by division
SELECT
    d.division_name,
    wos.year,
    wos.current_sequence,
    wos.updated_at as last_used
FROM divisions d
JOIN work_order_sequences wos ON d.id = wos.division_id
ORDER BY d.division_name, wos.year DESC;
```

---

## Vendor Management

### Vendor Database Administration

#### Vendor Information Requirements

**Essential Vendor Data:**
- Legal business name and DBA
- Federal Tax ID (EIN) for 1099 reporting
- Business address and mailing address
- Primary contact information
- Payment terms and methods
- Insurance and bonding information
- Certifications and licenses

**Vendor Categories:**
- **General Contractors:** Licensed building contractors
- **Subcontractors:** Specialized trade contractors
- **Suppliers:** Material and equipment suppliers
- **Service Providers:** Professional services
- **Emergency Vendors:** 24/7 emergency services

#### Adding New Vendors

**Step 1: Vendor Information Collection**
Use vendor onboarding form to collect:
```sql
-- Vendor master record structure
INSERT INTO vendors (
    id, vendor_code, vendor_name, vendor_type,
    contact_name, contact_email, contact_phone,
    address_line1, address_line2, city, state, zip_code,
    tax_id, payment_terms_default, is_active,
    created_at, updated_at
) VALUES (
    uuid_generate_v4(),
    'VENDOR001',
    'Example Vendor LLC',
    'Contractor',
    'John Smith',
    'john@examplevendor.com',
    '+1-555-0123',
    '123 Business Street',
    'Suite 100',
    'San Diego',
    'CA',
    '92101',
    '12-3456789',
    'Net 30',
    true,
    NOW(),
    NOW()
);
```

**Step 2: Vendor Approval Workflow**
1. **Initial Review:** Verify business license and insurance
2. **Financial Check:** Credit check for large vendors
3. **Reference Verification:** Contact previous clients
4. **Compliance Review:** Ensure proper certifications
5. **Final Approval:** Management sign-off

**Step 3: System Configuration**
```sql
-- Create vendor QuickBooks mapping
INSERT INTO vendor_qb_mappings (
    id, vendor_id, qb_vendor_id, qb_vendor_name,
    sync_enabled, created_at, updated_at
) VALUES (
    uuid_generate_v4(),
    (SELECT id FROM vendors WHERE vendor_code = 'VENDOR001'),
    'QB123456',
    'Example Vendor LLC',
    true,
    NOW(),
    NOW()
);
```

### Vendor Performance Management

#### Performance Metrics Tracking
```sql
-- Vendor performance analysis
SELECT
    v.vendor_name,
    COUNT(po.id) as total_pos,
    SUM(po.total_amount) as total_spending,
    AVG(po.total_amount) as avg_po_amount,
    COUNT(CASE WHEN po.status = 'COMPLETED' THEN 1 END) as completed_pos,
    ROUND(
        COUNT(CASE WHEN po.status = 'COMPLETED' THEN 1 END)::numeric /
        COUNT(po.id) * 100, 2
    ) as completion_rate,
    MIN(po.created_at) as first_po_date,
    MAX(po.created_at) as latest_po_date
FROM vendors v
LEFT JOIN po_headers po ON v.id = po.vendor_id
WHERE v.is_active = true
GROUP BY v.id, v.vendor_name
HAVING COUNT(po.id) > 0
ORDER BY total_spending DESC;
```

#### Vendor Compliance Monitoring
```sql
-- Track vendor compliance requirements
CREATE TABLE vendor_compliance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id),
    requirement_type VARCHAR(50), -- 'insurance', 'license', 'certification'
    requirement_name VARCHAR(100),
    expiration_date DATE,
    status VARCHAR(20), -- 'active', 'expired', 'pending'
    document_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query for expiring compliance items
SELECT
    v.vendor_name,
    vc.requirement_type,
    vc.requirement_name,
    vc.expiration_date,
    vc.expiration_date - CURRENT_DATE as days_until_expiry
FROM vendor_compliance vc
JOIN vendors v ON vc.vendor_id = v.id
WHERE vc.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
AND vc.status = 'active'
ORDER BY vc.expiration_date;
```

### Vendor Categories and Classifications

#### Vendor Type Management
```sql
-- Vendor category configuration
CREATE TABLE vendor_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_name VARCHAR(50) UNIQUE,
    description TEXT,
    requires_license BOOLEAN DEFAULT false,
    requires_insurance BOOLEAN DEFAULT false,
    default_payment_terms VARCHAR(20),
    is_active BOOLEAN DEFAULT true
);

-- Standard vendor types for ASR
INSERT INTO vendor_types (type_name, description, requires_license, requires_insurance, default_payment_terms)
VALUES
    ('General Contractor', 'Licensed general contractors', true, true, 'Net 30'),
    ('Subcontractor', 'Specialized trade contractors', true, true, 'Net 30'),
    ('Supplier', 'Material and equipment suppliers', false, false, 'Net 30'),
    ('Service Provider', 'Professional services', false, true, 'Net 15'),
    ('Emergency Vendor', '24/7 emergency services', true, true, 'Net 15');
```

#### Preferred Vendor Program
```sql
-- Preferred vendor designation
ALTER TABLE vendors ADD COLUMN preferred_vendor BOOLEAN DEFAULT false;
ALTER TABLE vendors ADD COLUMN preferred_since DATE;
ALTER TABLE vendors ADD COLUMN discount_percentage DECIMAL(5,2);

-- Query preferred vendors
SELECT
    vendor_name,
    vendor_type,
    preferred_since,
    discount_percentage,
    payment_terms_default
FROM vendors
WHERE preferred_vendor = true
AND is_active = true
ORDER BY preferred_since;
```

### Vendor Financial Management

#### Payment Terms Configuration
```sql
-- Payment terms management
CREATE TABLE payment_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term_code VARCHAR(20) UNIQUE,
    term_description TEXT,
    days_net INTEGER,
    discount_percentage DECIMAL(5,2),
    discount_days INTEGER,
    is_active BOOLEAN DEFAULT true
);

-- Standard payment terms
INSERT INTO payment_terms (term_code, term_description, days_net, discount_percentage, discount_days)
VALUES
    ('Net 15', 'Payment due in 15 days', 15, 0, 0),
    ('Net 30', 'Payment due in 30 days', 30, 0, 0),
    ('2/10 Net 30', '2% discount if paid within 10 days, net 30', 30, 2.0, 10),
    ('Net 60', 'Payment due in 60 days', 60, 0, 0),
    ('COD', 'Cash on delivery', 0, 0, 0);
```

#### Vendor Spending Analysis
```sql
-- Top vendors by spending analysis
WITH vendor_spending AS (
    SELECT
        v.vendor_name,
        v.vendor_type,
        COUNT(po.id) as po_count,
        SUM(po.total_amount) as total_spent,
        AVG(po.total_amount) as avg_po_value,
        MIN(po.created_at) as first_po,
        MAX(po.created_at) as last_po
    FROM vendors v
    JOIN po_headers po ON v.id = po.vendor_id
    WHERE po.created_at >= DATE_TRUNC('year', CURRENT_DATE)
    GROUP BY v.id, v.vendor_name, v.vendor_type
)
SELECT
    vendor_name,
    vendor_type,
    po_count,
    total_spent,
    ROUND(avg_po_value, 2) as avg_po_value,
    ROUND(total_spent / SUM(total_spent) OVER () * 100, 2) as spend_percentage,
    first_po,
    last_po
FROM vendor_spending
ORDER BY total_spent DESC
LIMIT 20;
```

---

## GL Account Configuration

### Chart of Accounts Setup

#### GL Account Structure
The ASR Purchase Order System maps to QuickBooks chart of accounts using a standardized coding system:

| GL Code | Account Range | Category | Description |
|---------|---------------|----------|-------------|
| **50-59** | 5000-5999 | Operating Expenses | General operating costs |
| **60-69** | 6000-6999 | Materials | Construction materials and supplies |
| **70-79** | 7000-7999 | Equipment | Tools and equipment purchases |
| **80-89** | 8000-8999 | Services | Professional and contractor services |
| **90-99** | 9000-9999 | Other | Miscellaneous and special categories |

#### GL Account Mapping Configuration
```sql
-- GL account mappings table structure
SELECT * FROM gl_account_mappings ORDER BY gl_code_short;

-- Common GL account mappings
INSERT INTO gl_account_mappings (
    gl_code_short, gl_account_number, gl_account_name,
    gl_account_category, is_taxable_default, qb_sync_enabled
) VALUES
    ('55', '5500', 'Construction Materials', 'OpEx', true, true),
    ('60', '6000', 'Tools and Equipment', 'CapEx', true, true),
    ('65', '6500', 'Heavy Equipment', 'CapEx', true, true),
    ('70', '7000', 'Contractor Services', 'OpEx', false, true),
    ('75', '7500', 'Professional Services', 'OpEx', false, true),
    ('80', '8000', 'Utilities', 'OpEx', true, true),
    ('85', '8500', 'Maintenance and Repairs', 'OpEx', true, true);
```

#### CapEx vs OpEx Classification
```sql
-- Update GL account categories
UPDATE gl_account_mappings
SET gl_account_category = 'CapEx'
WHERE gl_code_short IN ('60', '65', '66', '67'); -- Equipment accounts

UPDATE gl_account_mappings
SET gl_account_category = 'OpEx'
WHERE gl_code_short NOT IN ('60', '65', '66', '67'); -- Everything else

-- Query to verify categorization
SELECT
    gl_account_category,
    COUNT(*) as account_count,
    STRING_AGG(gl_code_short, ', ' ORDER BY gl_code_short) as accounts
FROM gl_account_mappings
WHERE is_active = true
GROUP BY gl_account_category;
```

### Tax Configuration

#### Tax Rate Management
```sql
-- Tax configuration table
CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_name VARCHAR(50),
    tax_rate DECIMAL(5,4), -- 0.0875 for 8.75%
    tax_description TEXT,
    effective_date DATE,
    jurisdiction VARCHAR(50), -- 'CA', 'San Diego County', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- San Diego tax rates
INSERT INTO tax_rates (tax_name, tax_rate, tax_description, effective_date, jurisdiction)
VALUES
    ('CA State Sales Tax', 0.0600, 'California state sales tax', '2024-01-01', 'CA'),
    ('SD County Tax', 0.0275, 'San Diego County tax', '2024-01-01', 'San Diego County'),
    ('Combined Rate', 0.0875, 'Combined CA + San Diego tax rate', '2024-01-01', 'San Diego, CA');
```

#### Tax-Exempt Categories
```sql
-- Configure tax exemptions
UPDATE gl_account_mappings
SET is_taxable_default = false
WHERE gl_account_name IN (
    'Professional Services',
    'Contractor Labor',
    'Consulting Fees',
    'Legal Services',
    'Accounting Services'
);

-- Services are typically not subject to sales tax
UPDATE gl_account_mappings
SET is_taxable_default = false
WHERE gl_code_short LIKE '7%'; -- All 70-79 service codes
```

### QuickBooks Integration Mapping

#### Account Synchronization Setup
```sql
-- QuickBooks account mapping
CREATE TABLE qb_account_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gl_code_short VARCHAR(2) REFERENCES gl_account_mappings(gl_code_short),
    qb_account_id VARCHAR(50), -- QuickBooks internal ID
    qb_account_name VARCHAR(100),
    qb_account_type VARCHAR(50), -- 'Expense', 'FixedAsset', etc.
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configure QuickBooks mappings
INSERT INTO qb_account_mappings (gl_code_short, qb_account_id, qb_account_name, qb_account_type)
VALUES
    ('55', 'QB5500', 'Construction Materials:Lumber', 'Expense'),
    ('60', 'QB6000', 'Equipment:Tools', 'FixedAsset'),
    ('65', 'QB6500', 'Equipment:Heavy Equipment', 'FixedAsset'),
    ('70', 'QB7000', 'Contractor Services:General', 'Expense'),
    ('75', 'QB7500', 'Professional Services', 'Expense');
```

#### Sync Validation Rules
```sql
-- GL account validation before QuickBooks sync
CREATE OR REPLACE FUNCTION validate_gl_sync()
RETURNS TABLE(
    po_number VARCHAR(15),
    issue_type VARCHAR(50),
    issue_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Check for missing GL mappings
    SELECT
        po.po_number,
        'Missing GL Mapping',
        'GL code ' || po.po_gl_code || ' not found in mappings'
    FROM po_headers po
    LEFT JOIN gl_account_mappings gl ON po.po_gl_code = gl.gl_code_short
    WHERE gl.id IS NULL
    AND po.status = 'APPROVED'

    UNION ALL

    -- Check for inactive GL accounts
    SELECT
        po.po_number,
        'Inactive GL Account',
        'GL code ' || po.po_gl_code || ' is marked inactive'
    FROM po_headers po
    JOIN gl_account_mappings gl ON po.po_gl_code = gl.gl_code_short
    WHERE gl.is_active = false
    AND po.status = 'APPROVED'

    UNION ALL

    -- Check for missing QuickBooks mapping
    SELECT
        po.po_number,
        'Missing QB Mapping',
        'No QuickBooks mapping for GL code ' || po.po_gl_code
    FROM po_headers po
    JOIN gl_account_mappings gl ON po.po_gl_code = gl.gl_code_short
    LEFT JOIN qb_account_mappings qb ON gl.gl_code_short = qb.gl_code_short
    WHERE qb.id IS NULL
    AND po.status = 'APPROVED';
END;
$$ LANGUAGE plpgsql;
```

### GL Account Reporting

#### Account Usage Analysis
```sql
-- GL account usage statistics
SELECT
    gl.gl_code_short,
    gl.gl_account_name,
    gl.gl_account_category,
    COUNT(po.id) as po_count,
    SUM(po.total_amount) as total_amount,
    AVG(po.total_amount) as avg_po_amount,
    MIN(po.created_at) as first_use,
    MAX(po.created_at) as last_use
FROM gl_account_mappings gl
LEFT JOIN po_headers po ON gl.gl_code_short = po.po_gl_code
WHERE gl.is_active = true
GROUP BY gl.gl_code_short, gl.gl_account_name, gl.gl_account_category
ORDER BY total_amount DESC NULLS LAST;
```

#### Monthly GL Summary
```sql
-- Monthly GL account spending summary
SELECT
    DATE_TRUNC('month', po.created_at) as month,
    gl.gl_code_short,
    gl.gl_account_name,
    COUNT(po.id) as po_count,
    SUM(po.total_amount) as monthly_total
FROM po_headers po
JOIN gl_account_mappings gl ON po.po_gl_code = gl.gl_code_short
WHERE po.created_at >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', po.created_at), gl.gl_code_short, gl.gl_account_name
ORDER BY month DESC, monthly_total DESC;
```

---

## Budget and Approval Configuration

### Approval Workflow Management

#### Approval Hierarchy Configuration
The ASR Purchase Order System implements a flexible approval hierarchy based on purchase amount and organizational structure:

```sql
-- Approval rules configuration
CREATE TABLE approval_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100),
    min_amount DECIMAL(12,2),
    max_amount DECIMAL(12,2),
    required_approvals TEXT[], -- Array of required roles
    approval_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Standard ASR approval rules
INSERT INTO approval_rules (rule_name, min_amount, max_amount, required_approvals, approval_order)
VALUES
    ('Small Purchases', 0.01, 999.99, ARRAY['DIVISION_LEADER'], 1),
    ('Medium Purchases', 1000.00, 24999.99, ARRAY['DIVISION_LEADER', 'OPERATIONS_MANAGER'], 2),
    ('Large Purchases', 25000.00, 99999.99, ARRAY['DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING'], 3),
    ('Major Purchases', 100000.00, NULL, ARRAY['DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING', 'MAJORITY_OWNER'], 4);
```

#### Division Leader Approval Limits
```sql
-- Configure approval limits per division leader
UPDATE division_leaders
SET approval_limit = 25000.00
WHERE division_code IN ('CH', 'PW', 'WS', 'LS');

-- Special approval limits for specific roles
UPDATE division_leaders
SET approval_limit = 50000.00
WHERE email IN ('senior.leader@asr.com', 'executive.manager@asr.com');

-- Query current approval limits
SELECT
    dl.name,
    dl.email,
    d.division_name,
    dl.approval_limit,
    COUNT(po.id) as pos_last_30_days,
    SUM(po.total_amount) as amount_approved_30_days
FROM division_leaders dl
JOIN divisions d ON dl.division_id = d.id
LEFT JOIN po_headers po ON dl.id = po.division_leader_id
    AND po.created_at > NOW() - INTERVAL '30 days'
    AND po.status IN ('APPROVED', 'ISSUED')
WHERE dl.is_active = true
GROUP BY dl.id, dl.name, dl.email, d.division_name, dl.approval_limit
ORDER BY dl.approval_limit DESC;
```

### Budget Management

#### Budget Planning and Tracking
```sql
-- Annual budget configuration
CREATE TABLE division_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id UUID REFERENCES divisions(id),
    budget_year INTEGER,
    budget_category VARCHAR(50), -- 'Materials', 'Equipment', 'Services'
    annual_budget DECIMAL(12,2),
    quarterly_budgets DECIMAL(12,2)[], -- Q1, Q2, Q3, Q4
    spent_to_date DECIMAL(12,2) DEFAULT 0,
    committed_amount DECIMAL(12,2) DEFAULT 0, -- Approved but not yet spent
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample budget data
INSERT INTO division_budgets (division_id, budget_year, budget_category, annual_budget, quarterly_budgets)
VALUES
    ((SELECT id FROM divisions WHERE division_code = 'CH'), 2024, 'Materials', 500000, ARRAY[125000, 125000, 125000, 125000]),
    ((SELECT id FROM divisions WHERE division_code = 'CH'), 2024, 'Equipment', 200000, ARRAY[50000, 50000, 50000, 50000]),
    ((SELECT id FROM divisions WHERE division_code = 'PW'), 2024, 'Materials', 750000, ARRAY[187500, 187500, 187500, 187500]),
    ((SELECT id FROM divisions WHERE division_code = 'WS'), 2024, 'Services', 300000, ARRAY[75000, 75000, 75000, 75000]);
```

#### Budget Monitoring and Alerts
```sql
-- Real-time budget utilization view
CREATE VIEW budget_utilization AS
SELECT
    d.division_name,
    db.budget_category,
    db.annual_budget,
    COALESCE(spent.spent_amount, 0) as spent_to_date,
    COALESCE(committed.committed_amount, 0) as committed_amount,
    db.annual_budget - COALESCE(spent.spent_amount, 0) - COALESCE(committed.committed_amount, 0) as available_budget,
    ROUND((COALESCE(spent.spent_amount, 0) / db.annual_budget * 100), 2) as spent_percentage,
    ROUND(((COALESCE(spent.spent_amount, 0) + COALESCE(committed.committed_amount, 0)) / db.annual_budget * 100), 2) as utilization_percentage
FROM division_budgets db
JOIN divisions d ON db.division_id = d.id
LEFT JOIN (
    SELECT
        po.division_id,
        gam.gl_account_category as category,
        SUM(po.total_amount) as spent_amount
    FROM po_headers po
    JOIN gl_account_mappings gam ON po.po_gl_code = gam.gl_code_short
    WHERE po.status IN ('COMPLETED', 'ISSUED')
    AND EXTRACT(YEAR FROM po.created_at) = 2024
    GROUP BY po.division_id, gam.gl_account_category
) spent ON db.division_id = spent.division_id AND db.budget_category = spent.category
LEFT JOIN (
    SELECT
        po.division_id,
        gam.gl_account_category as category,
        SUM(po.total_amount) as committed_amount
    FROM po_headers po
    JOIN gl_account_mappings gam ON po.po_gl_code = gam.gl_code_short
    WHERE po.status = 'APPROVED'
    AND EXTRACT(YEAR FROM po.created_at) = 2024
    GROUP BY po.division_id, gam.gl_account_category
) committed ON db.division_id = committed.division_id AND db.budget_category = committed.category
WHERE db.budget_year = 2024 AND db.is_active = true;
```

#### Budget Alert Configuration
```sql
-- Budget alert thresholds
CREATE TABLE budget_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id UUID REFERENCES divisions(id),
    budget_category VARCHAR(50),
    alert_type VARCHAR(20), -- 'warning', 'critical'
    threshold_percentage DECIMAL(5,2), -- 80.00 for 80%
    alert_enabled BOOLEAN DEFAULT true,
    email_recipients TEXT[],
    last_alert_sent TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configure budget alerts
INSERT INTO budget_alerts (division_id, budget_category, alert_type, threshold_percentage, email_recipients)
VALUES
    ((SELECT id FROM divisions WHERE division_code = 'CH'), 'Materials', 'warning', 80.00, ARRAY['ch.leader@asr.com', 'operations@asr.com']),
    ((SELECT id FROM divisions WHERE division_code = 'CH'), 'Materials', 'critical', 95.00, ARRAY['ch.leader@asr.com', 'operations@asr.com', 'management@asr.com']),
    ((SELECT id FROM divisions WHERE division_code = 'PW'), 'Equipment', 'warning', 75.00, ARRAY['pw.leader@asr.com', 'operations@asr.com']),
    ((SELECT id FROM divisions WHERE division_code = 'WS'), 'Services', 'critical', 90.00, ARRAY['ws.leader@asr.com', 'accounting@asr.com']);
```

### Workflow Optimization

#### Approval Time Analysis
```sql
-- Approval workflow performance analysis
WITH approval_times AS (
    SELECT
        po.po_number,
        po.total_amount,
        d.division_name,
        pa_submit.timestamp as submitted_time,
        pa_approve.timestamp as approved_time,
        EXTRACT(EPOCH FROM (pa_approve.timestamp - pa_submit.timestamp))/3600 as approval_hours
    FROM po_headers po
    JOIN divisions d ON po.division_id = d.id
    JOIN po_approvals pa_submit ON po.id = pa_submit.po_id AND pa_submit.action = 'SUBMITTED'
    JOIN po_approvals pa_approve ON po.id = pa_approve.po_id AND pa_approve.action = 'APPROVED'
    WHERE po.created_at > NOW() - INTERVAL '30 days'
)
SELECT
    division_name,
    COUNT(*) as total_pos,
    ROUND(AVG(approval_hours), 2) as avg_approval_hours,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY approval_hours), 2) as median_approval_hours,
    ROUND(MAX(approval_hours), 2) as max_approval_hours,
    COUNT(CASE WHEN approval_hours > 24 THEN 1 END) as pos_over_24hrs
FROM approval_times
GROUP BY division_name
ORDER BY avg_approval_hours DESC;
```

#### Bottleneck Identification
```sql
-- Identify approval bottlenecks
SELECT
    u.email as approver_email,
    u.role,
    COUNT(*) as pending_approvals,
    MIN(pa.timestamp) as oldest_pending,
    AVG(EXTRACT(EPOCH FROM (NOW() - pa.timestamp))/3600) as avg_pending_hours
FROM po_approvals pa
JOIN users u ON pa.actor_user_id = u.id
JOIN po_headers po ON pa.po_id = po.id
WHERE po.status = 'PENDING'
AND pa.status_after IS NULL
GROUP BY u.id, u.email, u.role
HAVING COUNT(*) > 0
ORDER BY avg_pending_hours DESC;
```

### Emergency Override Procedures

#### Emergency Purchase Authorization
```sql
-- Emergency purchase tracking
CREATE TABLE emergency_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES po_headers(id),
    emergency_type VARCHAR(50), -- 'safety', 'weather', 'equipment_failure'
    justification TEXT NOT NULL,
    authorized_by UUID REFERENCES users(id),
    authorization_method VARCHAR(50), -- 'phone', 'email', 'in_person'
    post_approval_required BOOLEAN DEFAULT true,
    post_approval_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track emergency purchase patterns
SELECT
    emergency_type,
    COUNT(*) as emergency_count,
    AVG(po.total_amount) as avg_amount,
    SUM(po.total_amount) as total_amount
FROM emergency_purchases ep
JOIN po_headers po ON ep.po_id = po.id
WHERE ep.created_at > NOW() - INTERVAL '90 days'
GROUP BY emergency_type
ORDER BY emergency_count DESC;
```

---

## QuickBooks Integration Setup

### OAuth 2.0 Configuration

#### QuickBooks App Setup
**Prerequisites:**
- QuickBooks Developer Account
- Registered application in QuickBooks Developer Console
- Valid SSL certificate for production domain
- Webhook endpoint configuration

**Application Configuration:**
```javascript
// QuickBooks OAuth configuration
const qbConfig = {
  clientId: process.env.QB_CLIENT_ID,
  clientSecret: process.env.QB_CLIENT_SECRET,
  environment: 'production', // or 'sandbox'
  redirectUri: 'https://asr-po.yourdomain.com/api/quickbooks/callback',
  scope: [
    'com.intuit.quickbooks.accounting'
  ]
};
```

#### OAuth Flow Management
```sql
-- QuickBooks OAuth tokens management
SELECT
    company_id,
    company_name,
    access_token_expires_at,
    refresh_token_expires_at,
    created_at,
    last_used_at,
    CASE
        WHEN access_token_expires_at < NOW() THEN 'Expired'
        WHEN access_token_expires_at < NOW() + INTERVAL '7 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as token_status
FROM qb_auth_tokens
ORDER BY created_at DESC;
```

#### Token Refresh Automation
```bash
#!/bin/bash
# qb-token-refresh.sh - Automatic token refresh

# Check token expiration
token_expires=$(psql $DATABASE_URL -t -c "
    SELECT EXTRACT(EPOCH FROM (access_token_expires_at - NOW()))/3600
    FROM qb_auth_tokens
    ORDER BY created_at DESC LIMIT 1;")

if (( $(echo "$token_expires < 24" | bc -l) )); then
    echo "QuickBooks token expires in less than 24 hours, refreshing..."

    # Call refresh endpoint
    curl -X POST https://asr-po.yourdomain.com/api/quickbooks/refresh-token

    # Verify refresh success
    if [ $? -eq 0 ]; then
        echo "Token refresh successful"
    else
        echo "Token refresh failed - manual intervention required"
        # Send alert to admin
        echo "QuickBooks token refresh failed" | mail -s "QB Token Alert" admin@asr.com
    fi
fi
```

### Data Synchronization

#### Sync Configuration
```sql
-- Sync configuration and status tracking
CREATE TABLE qb_sync_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type VARCHAR(50), -- 'vendors', 'accounts', 'purchase_orders'
    sync_enabled BOOLEAN DEFAULT true,
    sync_frequency VARCHAR(20), -- 'realtime', 'hourly', 'daily'
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20), -- 'success', 'failed', 'partial'
    records_synced INTEGER DEFAULT 0,
    sync_duration_seconds INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize sync configuration
INSERT INTO qb_sync_config (sync_type, sync_frequency)
VALUES
    ('vendors', 'daily'),
    ('accounts', 'daily'),
    ('purchase_orders', 'realtime');
```

#### Vendor Synchronization
```javascript
// Vendor sync process
async function syncVendorToQuickBooks(vendorId) {
    const vendor = await getVendorById(vendorId);

    const qbVendor = {
        CompanyName: vendor.vendor_name,
        ContactInfo: {
            PrimaryEmailAddr: {
                Address: vendor.contact_email
            },
            PrimaryPhone: {
                FreeFormNumber: vendor.contact_phone
            }
        },
        BillAddr: {
            Line1: vendor.address_line1,
            Line2: vendor.address_line2,
            City: vendor.city,
            CountrySubDivisionCode: vendor.state,
            PostalCode: vendor.zip_code
        },
        TermRef: {
            Name: vendor.payment_terms_default
        }
    };

    // Create or update vendor in QuickBooks
    const result = await qbApi.vendor.create(qbVendor);

    // Update local mapping
    await updateVendorQBMapping(vendorId, result.id);
}
```

#### Purchase Order Sync Process
```sql
-- PO sync status tracking
CREATE TABLE qb_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES po_headers(id),
    sync_action VARCHAR(20), -- 'create', 'update', 'void'
    qb_txn_id VARCHAR(50),
    sync_status VARCHAR(20), -- 'pending', 'success', 'failed'
    sync_attempts INTEGER DEFAULT 0,
    error_details TEXT,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query sync failures for retry
SELECT
    po.po_number,
    qsl.sync_action,
    qsl.sync_attempts,
    qsl.error_details,
    qsl.created_at
FROM qb_sync_log qsl
JOIN po_headers po ON qsl.po_id = po.id
WHERE qsl.sync_status = 'failed'
AND qsl.sync_attempts < 3
ORDER BY qsl.created_at;
```

### Error Handling and Recovery

#### Sync Error Categories
```sql
-- Categorize sync errors for analysis
WITH error_analysis AS (
    SELECT
        CASE
            WHEN error_details LIKE '%authentication%' THEN 'Authentication'
            WHEN error_details LIKE '%rate limit%' THEN 'Rate Limit'
            WHEN error_details LIKE '%duplicate%' THEN 'Duplicate Record'
            WHEN error_details LIKE '%validation%' THEN 'Validation Error'
            WHEN error_details LIKE '%timeout%' THEN 'Timeout'
            ELSE 'Other'
        END as error_category,
        COUNT(*) as error_count,
        MAX(created_at) as latest_error
    FROM qb_sync_log
    WHERE sync_status = 'failed'
    AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY 1
)
SELECT
    error_category,
    error_count,
    ROUND(error_count * 100.0 / SUM(error_count) OVER (), 2) as error_percentage,
    latest_error
FROM error_analysis
ORDER BY error_count DESC;
```

#### Automated Recovery Procedures
```bash
#!/bin/bash
# qb-sync-recovery.sh - Automated sync error recovery

echo "QuickBooks Sync Recovery - $(date)"

# Check for authentication errors
auth_errors=$(psql $DATABASE_URL -t -c "
    SELECT COUNT(*) FROM qb_sync_log
    WHERE sync_status = 'failed'
    AND error_details LIKE '%authentication%'
    AND created_at > NOW() - INTERVAL '1 hour';")

if [ "$auth_errors" -gt 0 ]; then
    echo "Authentication errors detected, refreshing tokens..."
    curl -X POST https://asr-po.yourdomain.com/api/quickbooks/refresh-token
fi

# Retry failed syncs (max 3 attempts)
retry_queue=$(psql $DATABASE_URL -t -c "
    SELECT po_id FROM qb_sync_log
    WHERE sync_status = 'failed'
    AND sync_attempts < 3
    AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at
    LIMIT 10;")

for po_id in $retry_queue; do
    echo "Retrying sync for PO ID: $po_id"
    curl -X POST "https://asr-po.yourdomain.com/api/quickbooks/retry-sync/$po_id"
    sleep 5  # Rate limiting
done

echo "Recovery process completed"
```

### Integration Monitoring

#### Real-time Sync Status Dashboard
```sql
-- QuickBooks integration health dashboard
SELECT
    'Token Status' as metric,
    CASE
        WHEN access_token_expires_at > NOW() + INTERVAL '7 days' THEN 'Healthy'
        WHEN access_token_expires_at > NOW() THEN 'Expiring Soon'
        ELSE 'Expired'
    END as status,
    access_token_expires_at as expires_at
FROM qb_auth_tokens ORDER BY created_at DESC LIMIT 1

UNION ALL

SELECT
    'Sync Performance',
    CASE
        WHEN AVG(sync_duration_seconds) < 30 THEN 'Good'
        WHEN AVG(sync_duration_seconds) < 60 THEN 'Fair'
        ELSE 'Slow'
    END,
    ROUND(AVG(sync_duration_seconds)) || ' seconds'
FROM qb_sync_config WHERE last_sync_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT
    'Error Rate',
    CASE
        WHEN error_rate < 5 THEN 'Good'
        WHEN error_rate < 10 THEN 'Fair'
        ELSE 'High'
    END,
    error_rate || '%'
FROM (
    SELECT ROUND(
        COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) * 100.0 /
        COUNT(*), 2
    ) as error_rate
    FROM qb_sync_log
    WHERE created_at > NOW() - INTERVAL '24 hours'
) error_stats;
```

#### Sync Performance Metrics
```sql
-- Daily sync performance report
SELECT
    DATE_TRUNC('day', created_at) as sync_date,
    sync_type,
    COUNT(*) as total_syncs,
    COUNT(CASE WHEN sync_status = 'success' THEN 1 END) as successful_syncs,
    COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed_syncs,
    ROUND(AVG(sync_duration_seconds), 2) as avg_duration_seconds,
    ROUND(
        COUNT(CASE WHEN sync_status = 'success' THEN 1 END) * 100.0 / COUNT(*), 2
    ) as success_rate
FROM qb_sync_config
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), sync_type
ORDER BY sync_date DESC, sync_type;
```

---

## System Monitoring

### Application Performance Monitoring

#### Key Performance Indicators (KPIs)
The ASR Purchase Order System monitors several critical performance metrics:

**Response Time Targets:**
- Dashboard load: < 2 seconds (95th percentile)
- API endpoints: < 500ms (95th percentile)
- Report generation: < 10 seconds
- Database queries: < 100ms (average)

**Availability Targets:**
- System uptime: 99.9% (8.76 hours downtime/year)
- Database availability: 99.95%
- QuickBooks integration: 99.5%

#### Performance Monitoring Queries
```sql
-- Real-time performance metrics
CREATE VIEW system_performance_metrics AS
WITH recent_activity AS (
    SELECT
        COUNT(*) as total_requests,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as requests_last_hour,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
    FROM po_headers
    WHERE created_at > NOW() - INTERVAL '24 hours'
),
error_rates AS (
    SELECT
        COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) * 100.0 / COUNT(*) as qb_error_rate
    FROM qb_sync_log
    WHERE created_at > NOW() - INTERVAL '1 hour'
),
cache_stats AS (
    SELECT
        -- Cache metrics would be retrieved from Redis or application metrics
        85.5 as cache_hit_rate,
        120 as avg_cache_response_ms
)
SELECT
    ra.total_requests,
    ra.requests_last_hour,
    ROUND(ra.avg_processing_time, 2) as avg_processing_seconds,
    ROUND(er.qb_error_rate, 2) as quickbooks_error_rate_pct,
    cs.cache_hit_rate,
    cs.avg_cache_response_ms
FROM recent_activity ra, error_rates er, cache_stats cs;
```

#### Performance Alert Configuration
```sql
-- Performance alert thresholds
CREATE TABLE performance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(50),
    alert_type VARCHAR(20), -- 'warning', 'critical'
    threshold_value DECIMAL(10,2),
    comparison_operator VARCHAR(5), -- '>', '<', '>=', '<=', '='
    alert_enabled BOOLEAN DEFAULT true,
    notification_channels TEXT[], -- ['slack', 'email', 'webhook']
    last_triggered TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configure performance alerts
INSERT INTO performance_alerts (metric_name, alert_type, threshold_value, comparison_operator, notification_channels)
VALUES
    ('api_response_time_ms', 'warning', 750, '>', ARRAY['slack']),
    ('api_response_time_ms', 'critical', 1500, '>', ARRAY['slack', 'email']),
    ('error_rate_percent', 'warning', 2.0, '>', ARRAY['slack']),
    ('error_rate_percent', 'critical', 5.0, '>', ARRAY['slack', 'email', 'webhook']),
    ('cache_hit_rate', 'warning', 75.0, '<', ARRAY['slack']),
    ('database_connection_count', 'critical', 18, '>', ARRAY['email', 'webhook']);
```

### Database Performance Monitoring

#### Database Health Checks
```sql
-- Comprehensive database health assessment
WITH connection_stats AS (
    SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
    FROM pg_stat_activity
),
cache_stats AS (
    SELECT
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit) as heap_hit,
        CASE WHEN sum(heap_blks_read) > 0 THEN
            round(sum(heap_blks_hit)*100.0/(sum(heap_blks_hit)+sum(heap_blks_read)), 2)
        ELSE 0 END as cache_hit_ratio
    FROM pg_statio_user_tables
),
slow_queries AS (
    SELECT count(*) as slow_query_count
    FROM pg_stat_statements
    WHERE mean_time > 1000 -- Queries taking more than 1 second
)
SELECT
    cs.total_connections,
    cs.active_connections,
    cs.idle_connections,
    cs.idle_in_transaction,
    ca.cache_hit_ratio,
    sq.slow_query_count
FROM connection_stats cs, cache_stats ca, slow_queries sq;
```

#### Index Performance Analysis
```sql
-- Index effectiveness report
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE WHEN idx_scan > 0
        THEN round(idx_tup_fetch::numeric / idx_scan, 2)
        ELSE 0
    END as avg_tuples_per_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC, idx_tup_read DESC;
```

#### Database Maintenance Automation
```bash
#!/bin/bash
# db-maintenance.sh - Automated database maintenance

echo "Database Maintenance - $(date)"

# Update table statistics
echo "Updating statistics..."
psql $DATABASE_URL -c "ANALYZE;"

# Vacuum critical tables
critical_tables=("po_headers" "po_approvals" "users" "vendors")
for table in "${critical_tables[@]}"; do
    echo "Vacuuming $table..."
    psql $DATABASE_URL -c "VACUUM ANALYZE $table;"
done

# Check for bloated tables
echo "Checking for table bloat..."
psql $DATABASE_URL -c "
    SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables
    WHERE schemaname = 'public'
    AND pg_total_relation_size(schemaname||'.'||tablename) > 100000000  -- >100MB
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

echo "Database maintenance completed"
```

### Application Monitoring

#### Health Check Endpoints
```javascript
// Application health check implementation
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
        checks: {}
    };

    try {
        // Database health check
        const dbResult = await prisma.$queryRaw`SELECT 1`;
        health.checks.database = {
            status: 'healthy',
            responseTime: '< 50ms'
        };

        // Cache health check
        const cacheCheck = await redis.ping();
        health.checks.cache = {
            status: cacheCheck === 'PONG' ? 'healthy' : 'degraded',
            fallbackAvailable: true
        };

        // QuickBooks integration check
        const qbHealth = await checkQuickBooksConnection();
        health.checks.quickbooks = {
            status: qbHealth.connected ? 'healthy' : 'degraded',
            lastSync: qbHealth.lastSync
        };

        res.json(health);
    } catch (error) {
        health.status = 'unhealthy';
        health.error = error.message;
        res.status(500).json(health);
    }
});
```

#### Error Tracking and Alerting
```sql
-- Application error tracking
CREATE TABLE application_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    user_id UUID REFERENCES users(id),
    request_path VARCHAR(255),
    request_method VARCHAR(10),
    ip_address INET,
    user_agent TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error rate monitoring query
SELECT
    DATE_TRUNC('hour', occurred_at) as hour,
    error_type,
    COUNT(*) as error_count,
    COUNT(DISTINCT user_id) as affected_users
FROM application_errors
WHERE occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', occurred_at), error_type
ORDER BY hour DESC, error_count DESC;
```

### Infrastructure Monitoring

#### Container Resource Monitoring
```bash
#!/bin/bash
# container-monitoring.sh - Monitor Docker container resources

echo "Container Resource Monitoring - $(date)"

# Get container stats
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"

# Check container health
echo "Container Health Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Disk usage
echo "Disk Usage:"
df -h | grep -E '^/dev/'

# Memory usage
echo "System Memory:"
free -h

# Check for resource alerts
cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" asr-po-system | sed 's/%//')
if (( $(echo "$cpu_usage > 80" | bc -l) )); then
    echo "WARNING: High CPU usage detected: $cpu_usage%"
fi

memory_usage=$(docker stats --no-stream --format "{{.MemPerc}}" asr-po-system | sed 's/%//')
if (( $(echo "$memory_usage > 80" | bc -l) )); then
    echo "WARNING: High memory usage detected: $memory_usage%"
fi
```

#### Log Aggregation and Analysis
```bash
#!/bin/bash
# log-analysis.sh - Analyze application logs

echo "Log Analysis Report - $(date)"

# Application error analysis
echo "Application Errors (Last 24 hours):"
docker logs asr-po-system --since 24h | grep -i error | \
    awk '{print $NF}' | sort | uniq -c | sort -rn | head -10

# Performance analysis
echo "Slow Requests (>2 seconds):"
docker logs asr-po-system --since 24h | grep "response_time" | \
    awk '$NF > 2000 {print}' | wc -l

# User activity analysis
echo "Active Users (Last Hour):"
docker logs asr-po-system --since 1h | grep "user_login" | \
    awk '{print $5}' | sort | uniq | wc -l
```

### Monitoring Automation

#### Automated Monitoring Scripts
```bash
#!/bin/bash
# monitoring-automation.sh - Comprehensive monitoring automation

# Function to send alerts
send_alert() {
    local severity=$1
    local message=$2
    local emoji="🟡"

    case $severity in
        "critical") emoji="🔴" ;;
        "warning") emoji="🟡" ;;
        "info") emoji="🟢" ;;
    esac

    # Send to Slack
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"$emoji ASR PO System: $message\"}"
    fi

    # Send email for critical issues
    if [ "$severity" = "critical" ]; then
        echo "$message" | mail -s "CRITICAL: ASR PO System Alert" admin@asr.com
    fi
}

# Monitor application health
app_health=$(curl -s -o /dev/null -w '%{http_code}' https://asr-po.yourdomain.com/api/health)
if [ "$app_health" != "200" ]; then
    send_alert "critical" "Application health check failed (HTTP $app_health)"
fi

# Monitor database connections
db_connections=$(psql $DATABASE_URL -t -c "SELECT count(*) FROM pg_stat_activity;")
if [ "$db_connections" -gt 18 ]; then
    send_alert "warning" "High database connection count: $db_connections"
fi

# Monitor disk space
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 85 ]; then
    send_alert "warning" "High disk usage: $disk_usage%"
fi

# Monitor QuickBooks integration
qb_status=$(curl -s https://asr-po.yourdomain.com/api/quickbooks/test-connection | jq -r '.status' 2>/dev/null || echo "error")
if [ "$qb_status" != "connected" ]; then
    send_alert "warning" "QuickBooks integration issue: $qb_status"
fi

echo "Monitoring check completed - $(date)"
```

---

This completes the comprehensive ADMIN-GUIDE.md. The document covers all essential administrative functions including user management, division configuration, vendor management, GL account setup, budget controls, QuickBooks integration, and system monitoring. This provides system administrators with the complete toolkit needed to manage the ASR Purchase Order System in production.