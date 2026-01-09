-- ASR PO System Database Schema
-- Created: January 7, 2026
-- Version: 1.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for status fields
CREATE TYPE user_role AS ENUM ('MAJORITY_OWNER', 'DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING');
CREATE TYPE po_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Issued', 'Received', 'Invoiced', 'Paid', 'Cancelled');
CREATE TYPE work_order_status AS ENUM ('Pending', 'InProgress', 'Completed', 'OnHold', 'Cancelled');
CREATE TYPE vendor_type AS ENUM ('Material', 'Labor', 'Equipment', 'Subcontractor', 'Other');
CREATE TYPE project_status AS ENUM ('Active', 'Completed', 'OnHold', 'Cancelled');
CREATE TYPE line_item_status AS ENUM ('Pending', 'PartialReceived', 'Received', 'Cancelled');
CREATE TYPE gl_category AS ENUM ('COGS', 'OpEx', 'Other', 'CreditCard');
CREATE TYPE approval_action AS ENUM ('Created', 'Submitted', 'Approved', 'Rejected', 'Issued', 'Received', 'Invoiced', 'Paid', 'Cancelled', 'WO_Created');

-- =====================================================
-- DIVISIONS TABLE
-- =====================================================
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_name VARCHAR(100) NOT NULL,
    division_code VARCHAR(2) UNIQUE NOT NULL,
    qb_class_name VARCHAR(100),
    cost_center_prefix VARCHAR(3),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE divisions IS 'Company divisions: CAPEX, Roofing, General Contracting, Subcontractor Management, Repairs';

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL,
    division_id UUID REFERENCES divisions(id),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE users IS 'System users with role-based access control';

-- =====================================================
-- DIVISION LEADERS TABLE
-- =====================================================
CREATE TABLE division_leaders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    division_code VARCHAR(2) UNIQUE NOT NULL,
    division_id UUID NOT NULL REFERENCES divisions(id),
    qb_class_name VARCHAR(100),
    approval_limit DECIMAL(12, 2) DEFAULT 25000.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE division_leaders IS 'Division leaders authorized to create and approve POs';
COMMENT ON COLUMN division_leaders.division_code IS 'O1=CAPEX, O2=Roofing, O3=GenContracting, O4=SubsMgmt, OM=Repairs';

-- =====================================================
-- VENDORS TABLE
-- =====================================================
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_name VARCHAR(200) NOT NULL,
    vendor_code VARCHAR(2) UNIQUE NOT NULL,
    vendor_type vendor_type DEFAULT 'Material',
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    address_line_1 VARCHAR(200),
    address_line_2 VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),
    phone_main VARCHAR(20),
    payment_terms_default VARCHAR(20) DEFAULT 'Net30',
    tax_id VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    is_1099_required BOOLEAN DEFAULT false,
    w9_on_file BOOLEAN DEFAULT false,
    preferred_divisions JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE vendors IS 'Supplier/subcontractor database';
COMMENT ON COLUMN vendors.vendor_code IS 'First 2 unique letters of vendor name for PO number generation';

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code VARCHAR(15) UNIQUE NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    customer_id UUID,
    property_address VARCHAR(300),
    district_code VARCHAR(2),
    district_name VARCHAR(100),
    primary_division_id UUID REFERENCES divisions(id),
    status project_status DEFAULT 'Active',
    start_date DATE,
    end_date DATE,
    budget_total DECIMAL(14, 2),
    budget_actual DECIMAL(14, 2) DEFAULT 0,
    po_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE projects IS 'Customer/property portfolio with project tracking';

-- =====================================================
-- GL ACCOUNT MAPPINGS TABLE
-- =====================================================
CREATE TABLE gl_account_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gl_code_short VARCHAR(2) UNIQUE NOT NULL,
    gl_account_number VARCHAR(4) NOT NULL,
    gl_account_name VARCHAR(100) NOT NULL,
    gl_account_category gl_category DEFAULT 'OpEx',
    is_taxable_default BOOLEAN DEFAULT true,
    qb_sync_enabled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE gl_account_mappings IS 'QuickBooks GL code mappings for line items';
COMMENT ON COLUMN gl_account_mappings.gl_code_short IS 'Abbreviated 2-digit code used in PO numbers';

-- =====================================================
-- WORK ORDERS TABLE
-- =====================================================
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_number VARCHAR(10) NOT NULL,
    division_id UUID NOT NULL REFERENCES divisions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    primary_trade VARCHAR(50),
    status work_order_status DEFAULT 'Pending',
    budget_estimate DECIMAL(12, 2),
    budget_actual DECIMAL(12, 2) DEFAULT 0,
    start_date_planned DATE,
    start_date_actual DATE,
    end_date_planned DATE,
    end_date_actual DATE,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(work_order_number, division_id)
);

COMMENT ON TABLE work_orders IS 'Work orders created alongside POs';
COMMENT ON COLUMN work_orders.work_order_number IS 'Format: WO-0001 through WO-9999, unique per division per year';

-- =====================================================
-- PO HEADERS TABLE (Main PO Record)
-- =====================================================
CREATE TABLE po_headers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(15) UNIQUE NOT NULL,
    po_number_sequence INTEGER,

    -- Core relationships
    division_leader_id UUID REFERENCES division_leaders(id),
    division_id UUID NOT NULL REFERENCES divisions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    work_order_id UUID REFERENCES work_orders(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),

    -- PO number components (for filtering/searching)
    po_leader_code VARCHAR(2),
    po_gl_code VARCHAR(2),
    po_work_order_num INTEGER,
    po_vendor_code VARCHAR(2),

    -- Financial
    cost_center_code VARCHAR(15),
    terms_code VARCHAR(20) DEFAULT 'Net30',
    tax_rate DECIMAL(5, 4) DEFAULT 0.0800,
    subtotal_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

    -- Status & Workflow
    status po_status DEFAULT 'Draft',
    required_by_date DATE,

    -- Audit fields
    requested_by_user_id UUID REFERENCES users(id),
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    issued_at TIMESTAMP WITH TIME ZONE,
    issued_to_vendor_email VARCHAR(255),

    -- Notes
    notes_internal TEXT,
    notes_vendor TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE po_headers IS 'Main Purchase Order records';
COMMENT ON COLUMN po_headers.po_number IS 'Smart PO number format: O1 10 0001 AB';

-- =====================================================
-- PO LINE ITEMS TABLE
-- =====================================================
CREATE TABLE po_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES po_headers(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,

    -- Item details
    item_description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'EA',
    unit_price DECIMAL(12, 2) NOT NULL,
    line_subtotal DECIMAL(12, 2) NOT NULL,

    -- GL Account
    gl_account_code VARCHAR(2),
    gl_account_number VARCHAR(4),
    gl_account_name VARCHAR(100),

    -- Tax & Status
    is_taxable BOOLEAN DEFAULT true,
    status line_item_status DEFAULT 'Pending',
    quantity_received DECIMAL(10, 2) DEFAULT 0,
    received_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(po_id, line_number)
);

COMMENT ON TABLE po_line_items IS 'Individual line items for each PO';

-- =====================================================
-- PO APPROVALS TABLE (Audit Trail)
-- =====================================================
CREATE TABLE po_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES po_headers(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    action approval_action NOT NULL,
    actor_user_id UUID REFERENCES users(id),
    actor_division_id UUID REFERENCES divisions(id),
    status_before VARCHAR(50),
    status_after VARCHAR(50),
    notes TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE po_approvals IS 'Complete audit trail for all PO and WO actions';

-- =====================================================
-- WORK ORDER SEQUENCE TABLE (for auto-numbering)
-- =====================================================
CREATE TABLE work_order_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id UUID NOT NULL REFERENCES divisions(id),
    year INTEGER NOT NULL,
    last_sequence INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(division_id, year)
);

COMMENT ON TABLE work_order_sequences IS 'Tracks next work order number per division per year';

-- =====================================================
-- INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_division ON users(division_id);

-- Division leaders indexes
CREATE INDEX idx_division_leaders_division ON division_leaders(division_id);
CREATE INDEX idx_division_leaders_code ON division_leaders(division_code);

-- Vendors indexes
CREATE INDEX idx_vendors_code ON vendors(vendor_code);
CREATE INDEX idx_vendors_name ON vendors(vendor_name);
CREATE INDEX idx_vendors_active ON vendors(is_active);

-- Projects indexes
CREATE INDEX idx_projects_code ON projects(project_code);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_division ON projects(primary_division_id);

-- Work orders indexes
CREATE INDEX idx_work_orders_number ON work_orders(work_order_number);
CREATE INDEX idx_work_orders_division ON work_orders(division_id);
CREATE INDEX idx_work_orders_project ON work_orders(project_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);

-- PO headers indexes
CREATE INDEX idx_po_headers_number ON po_headers(po_number);
CREATE INDEX idx_po_headers_division ON po_headers(division_id);
CREATE INDEX idx_po_headers_project ON po_headers(project_id);
CREATE INDEX idx_po_headers_vendor ON po_headers(vendor_id);
CREATE INDEX idx_po_headers_work_order ON po_headers(work_order_id);
CREATE INDEX idx_po_headers_status ON po_headers(status);
CREATE INDEX idx_po_headers_created ON po_headers(created_at);
CREATE INDEX idx_po_headers_leader_code ON po_headers(po_leader_code);

-- PO line items indexes
CREATE INDEX idx_po_line_items_po ON po_line_items(po_id);
CREATE INDEX idx_po_line_items_gl ON po_line_items(gl_account_number);

-- PO approvals indexes
CREATE INDEX idx_po_approvals_po ON po_approvals(po_id);
CREATE INDEX idx_po_approvals_actor ON po_approvals(actor_user_id);
CREATE INDEX idx_po_approvals_action ON po_approvals(action);
CREATE INDEX idx_po_approvals_timestamp ON po_approvals(timestamp);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate next work order number
CREATE OR REPLACE FUNCTION get_next_work_order_number(p_division_id UUID)
RETURNS VARCHAR(10) AS $$
DECLARE
    v_year INTEGER;
    v_next_seq INTEGER;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    INSERT INTO work_order_sequences (division_id, year, last_sequence)
    VALUES (p_division_id, v_year, 1)
    ON CONFLICT (division_id, year)
    DO UPDATE SET last_sequence = work_order_sequences.last_sequence + 1, updated_at = NOW()
    RETURNING last_sequence INTO v_next_seq;

    RETURN 'WO-' || LPAD(v_next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate smart PO number
CREATE OR REPLACE FUNCTION generate_smart_po_number(
    p_leader_code VARCHAR(2),
    p_gl_code VARCHAR(2),
    p_work_order_num INTEGER,
    p_vendor_code VARCHAR(2)
)
RETURNS VARCHAR(15) AS $$
BEGIN
    RETURN p_leader_code || ' ' || p_gl_code || ' ' || LPAD(p_work_order_num::TEXT, 4, '0') || ' ' || p_vendor_code;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate PO totals
CREATE OR REPLACE FUNCTION calculate_po_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_tax_amount DECIMAL(12, 2);
    v_tax_rate DECIMAL(5, 4);
BEGIN
    -- Get subtotal from line items
    SELECT COALESCE(SUM(line_subtotal), 0)
    INTO v_subtotal
    FROM po_line_items
    WHERE po_id = COALESCE(NEW.po_id, OLD.po_id);

    -- Get tax rate from PO header
    SELECT tax_rate INTO v_tax_rate
    FROM po_headers
    WHERE id = COALESCE(NEW.po_id, OLD.po_id);

    -- Calculate tax (only on taxable items)
    SELECT COALESCE(SUM(line_subtotal), 0) * v_tax_rate
    INTO v_tax_amount
    FROM po_line_items
    WHERE po_id = COALESCE(NEW.po_id, OLD.po_id) AND is_taxable = true;

    -- Update PO header
    UPDATE po_headers
    SET subtotal_amount = v_subtotal,
        tax_amount = v_tax_amount,
        total_amount = v_subtotal + v_tax_amount,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.po_id, OLD.po_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps triggers
CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON divisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_division_leaders_updated_at BEFORE UPDATE ON division_leaders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_headers_updated_at BEFORE UPDATE ON po_headers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_line_items_updated_at BEFORE UPDATE ON po_line_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gl_account_mappings_updated_at BEFORE UPDATE ON gl_account_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to recalculate PO totals when line items change
CREATE TRIGGER recalculate_po_totals_insert
    AFTER INSERT ON po_line_items
    FOR EACH ROW EXECUTE FUNCTION calculate_po_totals();

CREATE TRIGGER recalculate_po_totals_update
    AFTER UPDATE ON po_line_items
    FOR EACH ROW EXECUTE FUNCTION calculate_po_totals();

CREATE TRIGGER recalculate_po_totals_delete
    AFTER DELETE ON po_line_items
    FOR EACH ROW EXECUTE FUNCTION calculate_po_totals();

-- =====================================================
-- VIEWS
-- =====================================================

-- View: Active POs with full details
CREATE OR REPLACE VIEW vw_active_pos AS
SELECT
    ph.id,
    ph.po_number,
    ph.status,
    ph.total_amount,
    ph.required_by_date,
    ph.created_at,
    d.division_name,
    d.division_code,
    p.project_code,
    p.project_name,
    wo.work_order_number,
    wo.title as work_order_title,
    v.vendor_name,
    v.vendor_code,
    u.first_name || ' ' || u.last_name as requested_by
FROM po_headers ph
JOIN divisions d ON ph.division_id = d.id
JOIN projects p ON ph.project_id = p.id
LEFT JOIN work_orders wo ON ph.work_order_id = wo.id
JOIN vendors v ON ph.vendor_id = v.id
LEFT JOIN users u ON ph.requested_by_user_id = u.id
WHERE ph.deleted_at IS NULL
ORDER BY ph.created_at DESC;

-- View: Division spending summary
CREATE OR REPLACE VIEW vw_division_spending AS
SELECT
    d.id as division_id,
    d.division_name,
    d.division_code,
    COUNT(ph.id) as po_count,
    SUM(CASE WHEN ph.status = 'Draft' THEN 1 ELSE 0 END) as draft_count,
    SUM(CASE WHEN ph.status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
    SUM(CASE WHEN ph.status = 'Issued' THEN 1 ELSE 0 END) as issued_count,
    SUM(ph.total_amount) as total_spend,
    SUM(CASE WHEN ph.status IN ('Approved', 'Issued', 'Received') THEN ph.total_amount ELSE 0 END) as committed_spend
FROM divisions d
LEFT JOIN po_headers ph ON d.id = ph.division_id AND ph.deleted_at IS NULL
GROUP BY d.id, d.division_name, d.division_code
ORDER BY d.division_name;

-- View: Project PO summary
CREATE OR REPLACE VIEW vw_project_po_summary AS
SELECT
    p.id as project_id,
    p.project_code,
    p.project_name,
    p.status as project_status,
    p.budget_total,
    COUNT(ph.id) as po_count,
    SUM(ph.total_amount) as total_po_amount,
    p.budget_total - COALESCE(SUM(ph.total_amount), 0) as budget_remaining
FROM projects p
LEFT JOIN po_headers ph ON p.id = ph.project_id AND ph.deleted_at IS NULL
GROUP BY p.id, p.project_code, p.project_name, p.status, p.budget_total
ORDER BY p.project_code;

COMMENT ON VIEW vw_active_pos IS 'Active purchase orders with full relationship details';
COMMENT ON VIEW vw_division_spending IS 'Spending summary by division';
COMMENT ON VIEW vw_project_po_summary IS 'PO summary by project with budget tracking';
